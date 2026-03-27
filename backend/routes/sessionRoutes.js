const express = require('express')
const router = express.Router()
const axios = require('axios')
const { protect } = require('../middleware/auth')
const { authorize } = require('../middleware/role')
const StudySession = require('../models/StudySession')
const Class = require('../models/Class')
const Document = require('../models/Document')

// POST /api/sessions/start - Start a new study session
router.post('/start', protect, authorize('student'), async (req, res) => {
    try {
        const { classId, documentId } = req.body

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

        // Create new study session
        const session = await StudySession.create({
            studentId: req.user._id,
            classId,
            documentId: documentId || null,
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
            // Get document collection name for vector store lookup
            let collectionName = 'default'
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
        session.performanceMetrics.avgConfidence = humanMessages > 0
            ? session.weakTopics.reduce((sum, t) => sum + (t.confidenceScore || 0), 0) / session.weakTopics.length
            : 0

        session.endedAt = new Date()
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
