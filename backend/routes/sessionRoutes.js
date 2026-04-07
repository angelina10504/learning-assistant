const express = require('express')
const router = express.Router()
const axios = require('axios')
const { protect } = require('../middleware/auth')
const { authorize } = require('../middleware/role')
const StudySession = require('../models/StudySession')
const StudyPlan = require('../models/StudyPlan')
const Class = require('../models/Class')
const Document = require('../models/Document')
const TopicQuiz = require('../models/TopicQuiz')
const QuizResult = require('../models/QuizResult')

// Helper logic for calculating exact active interaction time based on AI interaction
function calculateActiveDuration(session) {
    if (session.messages && session.messages.length > 0) {
        let activeMs = 2 * 60 * 1000 // base 2 mins
        for (let i = 1; i < session.messages.length; i++) {
            const t1 = new Date(session.messages[i-1].timestamp)
            const t2 = new Date(session.messages[i].timestamp)
            const diff = t2 - t1
            if (diff > 0 && diff < 15 * 60 * 1000) { // 15 mins max gap
                activeMs += diff
            } else if (diff > 0) {
                activeMs += 2 * 60 * 1000 // new 2 min block if gap is big
            }
        }
        return activeMs
    }
    
    // Fallback if no messages but startedAt exists (e.g., immediate abort)
    if (session.startedAt) {
        const ended = session.endedAt || new Date()
        const diff = ended - new Date(session.startedAt)
        return (diff > 0 && diff < 5 * 60 * 1000) ? diff : 0
    }
    return 0
}

// GET /api/sessions/dashboard - Get dashboard stats for student
router.get('/dashboard', protect, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user._id

        // 1. Get all sessions for the student to calculate metrics
        const allSessions = await StudySession.find({ studentId }).populate('classId', 'name')
        
        let totalMs = 0
        let totalConfidence = 0
        let confidenceCount = 0
        const activeDates = new Set()
        const weakAreasMap = new Map()

        // Format recent sessions precisely for the dashboard
        const recentSessions = allSessions.slice(-3).reverse().map((s, i) => {
            const lastMessage = s.messages && s.messages.length > 0 
                ? s.messages[s.messages.length - 1].content.substring(0, 60) + '...'
                : 'Started a study session'

            return {
                id: s._id,
                topicName: s.topicName || `Session ${s.messages.length > 0 ? 'Review' : '(Empty)'}`,
                classId: s.classId?._id,
                className: s.classId?.name || 'Class',
                sessionNumber: allSessions.length - i,
                lastContext: lastMessage,
                lastUpdated: s.endedAt || s.startedAt,
                duration: calculateActiveDuration(s) / 1000 // converting to seconds for UI
            }
        })

        allSessions.forEach(session => {
            // Study hours derived from actual AI interaction 
            totalMs += calculateActiveDuration(session)
            
            if (session.startedAt) {
                activeDates.add(new Date(session.startedAt).toISOString().split('T')[0])
            }
            
            // Confidence from performance metrics
            if (session.performanceMetrics?.avgConfidence > 0) {
                totalConfidence += session.performanceMetrics.avgConfidence
                confidenceCount++
            }

            // Extract weak topics
            if (session.weakTopics && session.weakTopics.length > 0) {
                session.weakTopics.forEach(wt => {
                    const key = wt.topic.toLowerCase()
                    if (!weakAreasMap.has(key)) {
                        weakAreasMap.set(key, { topic: wt.topic, detectedAt: wt.detectedAt })
                    } else if (new Date(wt.detectedAt) > new Date(weakAreasMap.get(key).detectedAt)) { // get latest
                        weakAreasMap.set(key, { topic: wt.topic, detectedAt: wt.detectedAt })
                    }
                })
            }
        })

        // Fake Streak calculation based on activeDates
        const streak = activeDates.size
        const studyHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(1))
        const avgConfidence = confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) : 0

        // 2. Get latest StudyPlan for roadmap
        const latestPlan = await StudyPlan.findOne({ studentId }).sort({ generatedAt: -1 })
        
        let completedTopicsCount = 0
        let totalTopicsCount = 0
        let roadmap = []

        if (latestPlan && latestPlan.topics) {
            totalTopicsCount = latestPlan.topics.length
            latestPlan.topics.forEach((t) => {
                if (t.status === 'completed') completedTopicsCount++
                roadmap.push({ name: t.name, status: t.status })
            })
        }

        // Return compiled data
        res.json({
            stats: {
                topicsCompleted: { completed: completedTopicsCount, total: totalTopicsCount },
                studyHours,
                currentStreak: streak,
                avgConfidence
            },
            recentSessions,
            roadmap,
            weakAreas: Array.from(weakAreasMap.values()).slice(0, 5) // max 5 weak areas
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/sessions/final-quiz - Get or generate final quiz
router.post('/final-quiz', protect, authorize('student'), async (req, res) => {
    console.log('[final-quiz] received:', req.body)
    try {
        const { classId, topicName, retryAttempt } = req.body

        if (!classId || !topicName) {
            return res.status(400).json({ message: 'Class ID and topic name are required' })
        }

        // Check if quiz already exists
        let quiz = await TopicQuiz.findOne({ classId, topicName }).sort({ attemptVariant: -1 })

        if (quiz && !retryAttempt) {
            return res.json(quiz)
        }

        const nextVariant = quiz ? (quiz.attemptVariant || 1) + 1 : 1;

        // Generate new quiz via GenAI service
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'
        const response = await axios.post(`${genaiUrl}/agent/final-quiz`, {
            classId,
            topicName,
            studentId: req.user._id.toString()
        })

        const quizData = response.data

        // Save to cache
        quiz = await TopicQuiz.create({
            classId,
            topicName,
            quizId: quizData.quizId,
            questions: quizData.questions,
            attemptVariant: nextVariant
        })

        res.json(quiz)
    } catch (error) {
        const genaiStatus = error?.response?.status
        const genaiData = error?.response?.data
        console.error('[final-quiz] error:', error.message)
        console.error('[final-quiz] fastapi status:', genaiStatus)
        console.error('[final-quiz] fastapi response:', JSON.stringify(genaiData))
        console.error('[final-quiz] stack:', error.stack)
        const detail = genaiData?.detail
        if (typeof detail === 'object' && detail !== null) {
            return res.status(genaiStatus || 500).json(detail)
        }
        res.status(genaiStatus || 500).json({ message: detail || genaiData?.message || `Failed to generate quiz: ${error.message}` })
    }
})

// POST /api/sessions/final-quiz/submit - Submit final quiz answers
router.post('/final-quiz/submit', protect, authorize('student'), async (req, res) => {
    try {
        const { sessionId, classId, topicName, answers } = req.body

        if (!classId || !topicName || !answers) {
            return res.status(400).json({ message: 'Missing required fields' })
        }

        const quiz = await TopicQuiz.findOne({ classId, topicName }).sort({ attemptVariant: -1 })
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' })
        }

        let correctCount = 0
        const processedAnswers = answers.map(ans => {
            const question = quiz.questions.find(q => q.id === ans.questionId)
            const isCorrect = question.correctLetter === ans.selectedLetter
            if (isCorrect) correctCount++

            return {
                questionId: ans.questionId,
                selectedLetter: ans.selectedLetter,
                correctLetter: question.correctLetter,
                isCorrect,
                explanation: question.explanation,
                wrongAnswerReason: !isCorrect 
                   ? (question.wrongAnswerReasons && typeof question.wrongAnswerReasons.get === 'function'
                         ? question.wrongAnswerReasons.get(ans.selectedLetter)
                         : question.wrongAnswerReasons?.[ans.selectedLetter] || "")
                   : null
            }
        })

        const score = Math.round((correctCount / quiz.questions.length) * 100)
        const passed = score >= 70

        // Find existing attempts to get attemptNumber
        const previousAttempts = await QuizResult.countDocuments({ studentId: req.user._id, classId, topicName })
        const attemptNumber = previousAttempts + 1

        const result = await QuizResult.create({
            studentId: req.user._id,
            classId,
            topicName,
            sessionId: sessionId || null,
            answers: processedAnswers,
            score,
            passed,
            attemptNumber
        })

        // Update StudyPlan topic status
        const plan = await StudyPlan.findOne({ studentId: req.user._id, classId })
        if (plan) {
            const topicIndex = plan.topics.findIndex(t => t.name === topicName)
            if (topicIndex !== -1) {
                plan.topics[topicIndex].finalQuizScore = score
                plan.topics[topicIndex].quizAttempts = attemptNumber

                if (passed) {
                    plan.topics[topicIndex].status = 'completed'
                    
                    // Check if entire plan is completed
                    const allCompleted = plan.topics.every(t => t.status === 'completed')
                    if (allCompleted) {
                        plan.completedAt = new Date()
                    }
                } else {
                    plan.topics[topicIndex].status = 'needs_review'
                }
                
                await plan.save()
            }
        }

        res.json({
            passed,
            score,
            results: processedAnswers,
            attemptNumber
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/sessions/pre-assessment-questions - Get diagnostic questions
router.post('/pre-assessment-questions', protect, authorize('student'), async (req, res) => {
    try {
        const { classId } = req.body
        const collectionName = `class_${classId}`
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'

        const response = await axios.post(`${genaiUrl}/agent/pre-assessment-questions`, {
            collection_name: collectionName
        })

        res.json(response.data)
    } catch (error) {
        console.error('Pre-assessment questions error:', error?.response?.data || error.message)
        const detail = error?.response?.data?.detail
        res.status(500).json({ message: detail || `Failed to fetch assessment questions: ${error.message}` })
    }
})

// POST /api/sessions/generate-plan - Generate AI study plan
router.post('/generate-plan', protect, authorize('student'), async (req, res) => {
    try {
        const { classId, milestoneId, assessmentResults } = req.body

        if (!classId) {
            return res.status(400).json({ message: 'Class ID is required' })
        }

        const classData = await Class.findById(classId)
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (!classData.students.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not enrolled in this class' })
        }

        // Get milestone details if provided
        let milestoneTopic = null
        let milestoneDeadline = null
        if (milestoneId) {
            const milestone = classData.milestones.id(milestoneId)
            if (milestone) {
                milestoneTopic = milestone.topic
                milestoneDeadline = milestone.deadline?.toISOString()
            }
        }

        const collectionName = `class_${classId}`
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'

        const genaiResponse = await axios.post(`${genaiUrl}/agent/generate-plan`, {
            collection_name: collectionName,
            milestone_topic: milestoneTopic,
            milestone_deadline: milestoneDeadline,
            assessment_results: assessmentResults
        })

        const planData = genaiResponse.data

        // Create StudyPlan in DB
        const plan = await StudyPlan.create({
            studentId: req.user._id,
            classId,
            milestoneId: milestoneId || null,
            title: planData.title,
            topics: planData.topics.map((t, i) => ({
                name: t.name,
                subtopics: t.subtopics || [],
                estimatedMinutes: t.estimatedMinutes || 30,
                difficulty: t.difficulty || 'intermediate',
                status: 'pending',
                order: t.order || i + 1,
                priority: t.priority || 'medium',
                priorKnowledge: t.priorKnowledge || 'none',
                pageRange: t.pageRange || []
            })),
            totalEstimatedHours: planData.totalEstimatedHours || 0
        })

        res.status(201).json(plan)
    } catch (error) {
        console.error('Generate plan error:', error?.response?.data || error.message)
        const detail = error?.response?.data?.detail
        res.status(500).json({ message: detail || `Failed to generate plan: ${error.message}` })
    }
})

// GET /api/sessions/plans - Get all plans for logged-in student
router.get('/plans', protect, authorize('student'), async (req, res) => {
    try {
        const { classId } = req.query
        const filter = { studentId: req.user._id }
        if (classId) filter.classId = classId

        const plans = await StudyPlan.find(filter)
            .populate('classId', 'name')
            .sort({ generatedAt: -1 })

        res.json(plans)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/sessions/plans/:id - Get specific plan
router.get('/plans/:id', protect, authorize('student'), async (req, res) => {
    try {
        const plan = await StudyPlan.findById(req.params.id)
            .populate('classId', 'name')

        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' })
        }

        if (plan.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' })
        }

        res.json(plan)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// DELETE /api/sessions/plans/:id - Delete a study plan
router.delete('/plans/:id', protect, authorize('student'), async (req, res) => {
    try {
        const plan = await StudyPlan.findById(req.params.id)
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' })
        }

        if (plan.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' })
        }

        await StudyPlan.findByIdAndDelete(req.params.id)
        res.json({ message: 'Plan deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// PATCH /api/sessions/plans/:planId/topics/:topicIndex - Update topic status
router.patch('/plans/:planId/topics/:topicIndex', protect, authorize('student'), async (req, res) => {
    try {
        const { planId, topicIndex } = req.params
        const { status } = req.body
        const idx = parseInt(topicIndex, 10)

        const plan = await StudyPlan.findById(planId)
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' })
        }

        if (plan.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' })
        }

        if (idx < 0 || idx >= plan.topics.length) {
            return res.status(400).json({ message: 'Invalid topic index' })
        }

        plan.topics[idx].status = status

        // Check if all topics completed
        const allCompleted = plan.topics.every(t => t.status === 'completed')
        if (allCompleted) {
            plan.completedAt = new Date()
        }

        await plan.save()
        res.json(plan)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/sessions/start - Start a new study session
router.post('/start', protect, authorize('student'), async (req, res) => {
    try {
        const { classId, documentId, planId, topicName, topicIndex } = req.body

        if (!classId) {
            return res.status(400).json({ message: 'Class ID is required' })
        }

        if (!topicName && !planId) {
            return res.status(400).json({
                error: 'topic_required',
                message: 'Sessions must be started for a specific topic.'
            })
        }

        // Verify class exists and student is enrolled
        const classData = await Class.findById(classId)
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (!classData.students.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not enrolled in this class' })
        }

        // Verify document if provided
        if (documentId) {
            const doc = await Document.findById(documentId)
            if (!doc) {
                return res.status(404).json({ message: 'Document not found' })
            }
        }

        // Check for an existing active session to resume
        const existingSession = await StudySession.findOne({
            studentId: req.user._id,
            classId,
            topicName: topicName || null,
            planId: planId || null,
            topicIndex: topicIndex !== undefined ? topicIndex : null,
            endedAt: { $exists: false }
        })

        if (existingSession) {
            // Update status if needed then return
            if (planId && topicIndex !== undefined && topicIndex !== null) {
                const plan = await StudyPlan.findById(planId)
                if (plan && plan.studentId.toString() === req.user._id.toString()) {
                    const idx = parseInt(topicIndex, 10)
                    if (idx >= 0 && idx < plan.topics.length && plan.topics[idx].status !== 'completed') {
                        if (plan.topics[idx].status === 'pending') {
                            plan.topics[idx].status = 'in_progress'
                            await plan.save()
                        }
                    }
                }
            }
            return res.json(existingSession)
        }

        // Create new study session
        const session = await StudySession.create({
            studentId: req.user._id,
            classId,
            documentId: documentId || null,
            planId: planId || null,
            topicName: topicName || null,
            topicIndex: topicIndex !== undefined ? topicIndex : null,
            messages: [],
            weakTopics: [],
            completedTopics: [],
            performanceMetrics: {
                avgConfidence: 0,
                questionsAnswered: 0,
                correctCount: 0
            }
        })

        if (planId && topicIndex !== undefined && topicIndex !== null) {
            const plan = await StudyPlan.findById(planId)
            if (plan && plan.studentId.toString() === req.user._id.toString()) {
                const idx = parseInt(topicIndex, 10)
                if (idx >= 0 && idx < plan.topics.length && plan.topics[idx].status !== 'completed') {
                    if (plan.topics[idx].status === 'pending') {
                        plan.topics[idx].status = 'in_progress'
                        await plan.save()
                    }
                }
            }
        }

        res.status(201).json(session)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/sessions/:id/message - Send message to agent
router.post('/:id/message', protect, authorize('student'), async (req, res) => {
    try {
        const session = await StudySession.findById(req.params.id)

        if (!session) {
            return res.status(404).json({ message: 'Session not found' })
        }

        // Verify ownership
        if (session.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to access this session' })
        }

        // Verify session is still active
        if (session.endedAt) {
            return res.status(400).json({ message: 'Session has ended' })
        }

        const { content } = req.body

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' })
        }

        // Track duration if provided (cumulative seconds)
        if (req.body.duration !== undefined) {
            session.duration = req.body.duration
        }

        // Add user message to history
        session.messages.push({
            role: 'human',
            content,
            timestamp: new Date()
        })

        // Proxy to GenAI service for agent response
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'

        try {
            // Ensure performanceMetrics is initialized for legacy sessions
            if (!session.performanceMetrics) {
                session.performanceMetrics = {
                    questionsAnswered: 0,
                    correctCount: 0,
                    avgConfidence: 0
                }
            }

            // Use class-level collection (all materials in a class share one vector store)
            let collectionName = `class_${session.classId}`
            if (session.documentId) {
                const doc = await Document.findById(session.documentId)
                if (doc && doc.collectionName) {
                    collectionName = doc.collectionName
                }
            }

            // Prepare chat history in the format GenAI agent expects
            const chatHistory = session.messages.slice(-8).map(m => ({
                role: m.role === 'human' ? 'student' : 'agent',
                content: m.content
            }))

            // Prepare student context
            const studentContext = {
                completed_topics: session.completedTopics || [],
                weak_topics: session.weakTopics?.map(t => t.topic) || [],
                session_duration_minutes: Math.round(
                    (Date.now() - new Date(session.startedAt).getTime()) / 60000
                )
            }

            const agentResponse = await axios.post(
                `${genaiUrl}/agent/`,
                {
                    message: content,
                    collection_name: collectionName,
                    chat_history: chatHistory,
                    student_context: studentContext
                }
            )

            const response = agentResponse.data.response
            const toolsUsed = (agentResponse.data.tools_used || []).map(t => t.name || t)
            const structuredData = agentResponse.data.structured_data || []

            // Extract metadata from structured data
            const weakTopics = structuredData
                .filter(d => d.action === 'log_weak_topic')
                .map(d => ({ topic: d.topic, confidenceScore: 0.3 }))
            const completedTopics = structuredData
                .filter(d => d.action === 'mark_completed')
                .map(d => d.topic)
            
            // Update performance metrics based on agent signaling
            structuredData.forEach(d => {
                if (d.action === 'question_asked') {
                    session.performanceMetrics.questionsAnswered += 1
                } else if (d.action === 'evaluation') {
                    if (d.correct) {
                        session.performanceMetrics.correctCount += 1
                    }
                    // If for some reason questionsAnswered is behind, sync it
                    if (session.performanceMetrics.correctCount > session.performanceMetrics.questionsAnswered) {
                        session.performanceMetrics.questionsAnswered = session.performanceMetrics.correctCount
                    }
                }
            })

            // Update average confidence based on metrics
            if (session.performanceMetrics.questionsAnswered > 0) {
                const accuracy = session.performanceMetrics.correctCount / session.performanceMetrics.questionsAnswered
                // Mix with weak topics count for a general confidence score
                const weakFactor = Math.max(0, 1 - (session.weakTopics.length * 0.1))
                session.performanceMetrics.avgConfidence = (accuracy * 0.7) + (weakFactor * 0.3)
            }

            // Add AI response to session
            session.messages.push({
                role: 'ai',
                content: response,
                toolsUsed: toolsUsed || [],
                timestamp: new Date()
            })

            // Update weak topics if detected
            if (weakTopics && Array.isArray(weakTopics)) {
                weakTopics.forEach(topic => {
                    const existing = session.weakTopics.find(t => t.topic === topic.topic)
                    if (!existing) {
                        session.weakTopics.push({
                            topic: topic.topic,
                            detectedAt: new Date(),
                            confidenceScore: topic.confidenceScore || 0.5
                        })
                    }
                })
            }

            // Update completed topics
            if (completedTopics && Array.isArray(completedTopics)) {
                completedTopics.forEach(topic => {
                    if (!session.completedTopics.includes(topic)) {
                        session.completedTopics.push(topic)
                    }
                })
            }

            await session.save()

            res.json({
                message: response,
                session: session
            })
        } catch (error) {
            console.error('❌ Session Message Error:', error.response?.data || error.message);
            // If it's a validation error, log the specifics
            if (error.name === 'ValidationError') {
                console.error('Validation Details:', error.errors);
            }
            
            // If GenAI fails, still save the user message if it's new
            try {
                await session.save()
            } catch (saveError) {
                console.error('Failed to save session even without agent response:', saveError.message);
            }
            
            res.status(500).json({ 
                message: `Agent service error: ${error.response?.data?.detail || error.message}`,
                error: error.message 
            })
        }
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/sessions/:id/end - End session
router.post('/:id/end', protect, authorize('student'), async (req, res) => {
    try {
        const session = await StudySession.findById(req.params.id)

        if (!session) {
            return res.status(404).json({ message: 'Session not found' })
        }

        // Verify ownership
        if (session.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' })
        }

        // Update performance metrics
        const humanMessages = session.messages.filter(m => m.role === 'human').length
        const totalCorrect = req.body?.correctAnswers || req.body?.correctCount || 0

        session.performanceMetrics.questionsAnswered = req.body?.questionsAsked || humanMessages
        session.performanceMetrics.correctCount = totalCorrect
        session.performanceMetrics.avgConfidence = req.body?.confidence !== undefined ? (req.body.confidence / 100) : (session.weakTopics.length > 0
            ? session.weakTopics.reduce((sum, t) => sum + (t.confidenceScore || 0), 0) / session.weakTopics.length
            : (session.performanceMetrics?.avgConfidence || 0))

        // Save new aggregated stats
        session.questionsAsked = req.body?.questionsAsked || session.performanceMetrics.questionsAnswered
        session.correctAnswers = totalCorrect
        session.confidence = req.body?.confidence || (session.performanceMetrics.avgConfidence * 100)
        session.progressPercent = req.body?.progressPercent || 0

        // Save final duration
        if (req.body.duration !== undefined) {
            session.duration = req.body.duration
        }

        session.endedAt = new Date()

        // Note: Topic completion is now handled ONLY by the final-quiz flow.
        // We no longer automatically mark a topic and advance to the next here.

        await session.save()

        res.json(session)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/sessions - Get user's sessions
router.get('/', protect, authorize('student'), async (req, res) => {
    try {
        const sessions = await StudySession.find({ studentId: req.user._id })
            .populate('classId', 'name')
            .populate('documentId', 'originalName')
            .sort({ startedAt: -1 })

        res.json(sessions)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/sessions/:id - Get session details
router.get('/:id', protect, async (req, res) => {
    try {
        const session = await StudySession.findById(req.params.id)
            .populate('studentId', 'name email')
            .populate('classId', 'name')
            .populate('documentId', 'originalName')
            .populate('planId')

        if (!session) {
            return res.status(404).json({ message: 'Session not found' })
        }

        // Verify authorization: student owns session or teacher of the class
        const isStudent = session.studentId._id.toString() === req.user._id.toString()
        const classData = await Class.findById(session.classId)
        const isTeacher = classData && classData.teacherId.toString() === req.user._id.toString()

        if (!isStudent && !isTeacher) {
            return res.status(403).json({ message: 'Not authorized' })
        }

        res.json(session)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/sessions/active-status - Get active session and plan ID per class
router.get('/active-status', protect, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user._id
        const classes = req.user.enrolledClasses || []
        
        // Active session = has no endedAt (still open)
        const activeSessions = await StudySession.find({
            studentId,
            classId: { $in: classes },
            endedAt: { $exists: false }
        })

        const plans = await StudyPlan.find({
            studentId,
            classId: { $in: classes }
        })

        const statusMap = {}
        for (const classId of classes) {
            const activeSession = activeSessions.find(s => s.classId.toString() === classId.toString())
            const plan = plans.find(p => p.classId.toString() === classId.toString())
            
            statusMap[classId.toString()] = {
                activeSessionId: activeSession ? activeSession._id : null,
                planId: plan ? plan._id : null
            }
        }

        res.json(statusMap)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router
