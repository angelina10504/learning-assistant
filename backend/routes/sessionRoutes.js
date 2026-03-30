const express = require('express')
const router = express.Router()
const axios = require('axios')
const { protect } = require('../middleware/auth')
const { authorize } = require('../middleware/role')
const StudySession = require('../models/StudySession')
const StudyPlan = require('../models/StudyPlan')
const Class = require('../models/Class')
const Document = require('../models/Document')

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
                duration: s.endedAt ? (new Date(s.endedAt) - new Date(s.startedAt)) / 1000 : 0
            }
        })

        allSessions.forEach(session => {
            // Study hours limit logic
            if (session.startedAt) {
                const ended = session.endedAt || new Date()
                const duration = new Date(ended) - new Date(session.startedAt)
                if (duration > 0 && duration < 8 * 60 * 60 * 1000) { // arbitrary cap 8h
                    totalMs += duration
                }
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

// POST /api/sessions/generate-plan - Generate AI study plan
router.post('/generate-plan', protect, authorize('student'), async (req, res) => {
    try {
        const { classId, milestoneId } = req.body

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
            milestone_deadline: milestoneDeadline
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
                status: i === 0 ? 'current' : 'locked',
                order: t.order || i + 1,
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

        // Auto-advance next topic to 'current' when completing
        if (status === 'completed' && idx + 1 < plan.topics.length) {
            if (plan.topics[idx + 1].status === 'locked') {
                plan.topics[idx + 1].status = 'current'
            }
        }

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

        // If planId and topicIndex provided, mark topic as current in the plan
        if (planId && topicIndex !== undefined && topicIndex !== null) {
            const plan = await StudyPlan.findById(planId)
            if (plan && plan.studentId.toString() === req.user._id.toString()) {
                const idx = parseInt(topicIndex, 10)
                if (idx >= 0 && idx < plan.topics.length) {
                    plan.topics[idx].status = 'current'
                    await plan.save()
                }
            }
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

        // Add user message to session
        session.messages.push({
            role: 'human',
            content,
            timestamp: new Date()
        })

        // Proxy to GenAI service for agent response
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'

        try {
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

            // Extract weak topics and completed topics from structured data
            const weakTopics = structuredData
                .filter(d => d.action === 'log_weak_topic')
                .map(d => ({ topic: d.topic, confidenceScore: 0.3 }))
            const completedTopics = structuredData
                .filter(d => d.action === 'mark_completed')
                .map(d => d.topic)

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
            // If GenAI fails, still save the user message
            await session.save()
            res.status(500).json({ message: `Agent service error: ${error.message}` })
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
        const correctAnswers = req.body?.correctCount || 0

        session.performanceMetrics.questionsAnswered = humanMessages
        session.performanceMetrics.correctCount = correctAnswers
        session.performanceMetrics.avgConfidence = session.weakTopics.length > 0
            ? session.weakTopics.reduce((sum, t) => sum + (t.confidenceScore || 0), 0) / session.weakTopics.length
            : 0

        session.endedAt = new Date()

        // If session is linked to a plan, mark topic as completed and advance next
        if (session.planId && session.topicIndex !== null && session.topicIndex !== undefined) {
            try {
                const plan = await StudyPlan.findById(session.planId)
                if (plan && plan.studentId.toString() === req.user._id.toString()) {
                    const idx = session.topicIndex
                    if (idx >= 0 && idx < plan.topics.length) {
                        plan.topics[idx].status = 'completed'

                        // Advance next topic
                        if (idx + 1 < plan.topics.length && plan.topics[idx + 1].status === 'locked') {
                            plan.topics[idx + 1].status = 'current'
                        }

                        // Check if all completed
                        if (plan.topics.every(t => t.status === 'completed')) {
                            plan.completedAt = new Date()
                        }

                        await plan.save()
                    }
                }
            } catch (planErr) {
                console.error('Error updating plan on session end:', planErr.message)
            }
        }

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

module.exports = router
