const express = require('express')
const router = express.Router()
const axios = require('axios')
// Simple CSV generator (no external dependency)
const generateCSV = (data) => {
    if (!data || data.length === 0) return ''
    const headers = Object.keys(data[0])
    const rows = data.map(row =>
        headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
    )
    return [headers.join(','), ...rows].join('\n')
}
const { protect } = require('../middleware/auth')
const { authorize } = require('../middleware/role')
const Class = require('../models/Class')
const User = require('../models/User')
const Document = require('../models/Document')
const StudySession = require('../models/StudySession')

// Helper: Generate random 6-char alphanumeric class code
const generateClassCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// POST /api/classes - Create class (teacher only)
router.post('/', protect, authorize('teacher'), async (req, res) => {
    try {
        const { name, description } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Class name is required' })
        }

        let classCode
        let codeExists = true
        while (codeExists) {
            classCode = generateClassCode()
            codeExists = await Class.findOne({ classCode })
        }

        const newClass = await Class.create({
            teacherId: req.user._id,
            name,
            description,
            classCode,
            students: [],
            materials: []
        })

        // Add to teacher's classes
        req.user.classes.push(newClass._id)
        await req.user.save()

        res.status(201).json(newClass)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/classes/teaching - Get teacher's classes
router.get('/teaching', protect, authorize('teacher'), async (req, res) => {
    try {
        const classes = await Class.find({ teacherId: req.user._id })
            .populate('students', 'name email')
            .populate('materials', 'originalName uploadedAt')

        res.json(classes)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/classes/enrolled - Get student's enrolled classes
router.get('/enrolled', protect, authorize('student'), async (req, res) => {
    try {
        const classes = await Class.find({ _id: { $in: req.user.enrolledClasses } })
            .populate('teacherId', 'name email')
            .populate('materials', 'originalName uploadedAt')

        res.json(classes)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/classes/join - Join class with classCode
router.post('/join', protect, authorize('student'), async (req, res) => {
    try {
        const { classCode } = req.body

        if (!classCode) {
            return res.status(400).json({ message: 'Class code is required' })
        }

        const classToJoin = await Class.findOne({ classCode })

        if (!classToJoin) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classToJoin.students.includes(req.user._id)) {
            return res.status(400).json({ message: 'Already enrolled in this class' })
        }

        classToJoin.students.push(req.user._id)
        await classToJoin.save()

        req.user.enrolledClasses.push(classToJoin._id)
        await req.user.save()

        const populatedClass = await Class.findById(classToJoin._id)
            .populate('teacherId', 'name email')
            .populate('materials', 'originalName uploadedAt')

        res.json(populatedClass)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/classes/:id - Get class details
router.get('/:id', protect, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)
            .populate('teacherId', 'name email')
            .populate('students', 'name email')
            .populate('materials', 'originalName uploadedAt')

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        // Check authorization: must be teacher or enrolled student
        const isTeacher = classData.teacherId._id.toString() === req.user._id.toString()
        const isStudent = classData.students.some(s => s._id.toString() === req.user._id.toString())

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Not authorized to view this class' })
        }

        res.json(classData)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/classes/:id/materials - Get materials for a class
router.get('/:id/materials', protect, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        // Check authorization
        const isTeacher = classData.teacherId.toString() === req.user._id.toString()
        const isStudent = classData.students.includes(req.user._id)

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Not authorized' })
        }

        const materials = await Document.find({ _id: { $in: classData.materials } })

        res.json(materials)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/classes/:id/materials - Upload material to class
router.post('/:id/materials', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can upload materials' })
        }

        // Proxy to GenAI service - forward file upload
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'

        // Forward the request to GenAI /upload/ endpoint
        try {
            const response = await axios.post(`${genaiUrl}/upload/`, req.body, {
                headers: req.headers
            })

            // Extract document info from GenAI response
            const { documentId, filename, originalName, collectionName, chunksCreated } = response.data

            // Create document in our DB
            const document = await Document.create({
                userId: req.user._id,
                filename,
                originalName,
                collectionName,
                chunksCreated
            })

            // Add to class materials
            classData.materials.push(document._id)
            await classData.save()

            res.status(201).json(document)
        } catch (error) {
            res.status(500).json({ message: `GenAI service error: ${error.message}` })
        }
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/classes/:id/analytics - Get aggregated analytics for the class
router.get('/:id/analytics', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can view analytics' })
        }

        // Get all study sessions for this class
        const sessions = await StudySession.find({ classId: req.params.id })
            .populate('studentId', 'name email')

        // Aggregate analytics
        const analytics = {
            totalSessions: sessions.length,
            totalStudents: new Set(sessions.map(s => s.studentId._id.toString())).size,
            averageConfidence: sessions.length > 0
                ? sessions.reduce((sum, s) => sum + (s.performanceMetrics?.avgConfidence || 0), 0) / sessions.length
                : 0,
            totalQuestionsAnswered: sessions.reduce((sum, s) => sum + (s.performanceMetrics?.questionsAnswered || 0), 0),
            totalCorrect: sessions.reduce((sum, s) => sum + (s.performanceMetrics?.correctCount || 0), 0),
            studentSessions: sessions.map(s => ({
                studentId: s.studentId._id,
                studentName: s.studentId.name,
                sessionsCount: 1,
                avgConfidence: s.performanceMetrics?.avgConfidence || 0,
                questionsAnswered: s.performanceMetrics?.questionsAnswered || 0,
                correctCount: s.performanceMetrics?.correctCount || 0
            }))
        }

        res.json(analytics)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/classes/:id/export-csv - Export class analytics as CSV
router.post('/:id/export-csv', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can export analytics' })
        }

        // Get all study sessions
        const sessions = await StudySession.find({ classId: req.params.id })
            .populate('studentId', 'name email')

        // Format data for CSV
        const csvData = sessions.map(session => ({
            studentName: session.studentId?.name || 'Unknown',
            studentEmail: session.studentId?.email || 'Unknown',
            sessionDate: session.startedAt?.toISOString().split('T')[0] || '',
            questionsAnswered: session.performanceMetrics?.questionsAnswered || 0,
            correctCount: session.performanceMetrics?.correctCount || 0,
            avgConfidence: (session.performanceMetrics?.avgConfidence || 0).toFixed(2),
            weakTopics: session.weakTopics?.map(t => t.topic).join('; ') || '',
            completedTopics: session.completedTopics?.join('; ') || ''
        }))

        // Generate CSV
        const csv = generateCSV(csvData)

        res.header('Content-Type', 'text/csv')
        res.header('Content-Disposition', `attachment; filename="class-analytics-${req.params.id}.csv"`)
        res.send(csv)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router
