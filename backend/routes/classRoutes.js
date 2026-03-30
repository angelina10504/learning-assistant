const express = require('express')
const router = express.Router()
const axios = require('axios')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads')
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
        }
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|txt|ppt|pptx/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype)
        
        if (extname && mimetype) {
            return cb(null, true)
        }
        cb(new Error('Only document files are allowed (PDF, DOC, DOCX, TXT, PPT, PPTX)'))
    }
})

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
router.post('/:id/materials', protect, authorize('teacher'), upload.single('file'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can upload materials' })
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' })
        }

        // Use classId as collection name so all materials in a class share a vector store
        const collectionName = `class_${req.params.id}`

        // Create document in our DB
        const document = await Document.create({
            userId: req.user._id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            collectionName
        })

        // Add to class materials
        classData.materials.push(document._id)
        await classData.save()

        // Send file to GenAI service for vectorization
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'
        try {
            const FormData = require('form-data')
            const formData = new FormData()
            formData.append('file', fs.createReadStream(req.file.path))
            formData.append('collection_name', collectionName)

            await axios.post(`${genaiUrl}/upload/`, formData, {
                headers: formData.getHeaders(),
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024,
            })

            console.log(`✅ File vectorized in collection: ${collectionName}`)
        } catch (genaiErr) {
            console.error('⚠️ GenAI vectorization failed (file saved but not indexed):', genaiErr.message)
            // Don't fail the upload — the document is saved, just not vectorized yet
        }

        res.status(201).json(document)
    } catch (error) {
        console.error('Upload error:', error)
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

// DELETE /api/classes/:id - Delete class (teacher only)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can delete this class' })
        }

        // Remove class from all enrolled students
        await User.updateMany(
            { enrolledClasses: classData._id },
            { $pull: { enrolledClasses: classData._id } }
        )

        // Remove class from teacher's classes
        await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { classes: classData._id } }
        )

        // Delete associated study sessions
        await StudySession.deleteMany({ classId: classData._id })

        // Delete the class
        await Class.findByIdAndDelete(req.params.id)

        res.json({ message: 'Class deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/classes/:id/milestones - Add milestone to class
router.post('/:id/milestones', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can add milestones' })
        }

        const { topic, deadline, isCompulsory } = req.body

        if (!topic || !deadline) {
            return res.status(400).json({ message: 'Topic and deadline are required' })
        }

        const milestone = {
            topic,
            deadline: new Date(deadline),
            isCompulsory: isCompulsory !== undefined ? isCompulsory : true
        }

        classData.milestones.push(milestone)
        classData.updatedAt = Date.now()
        await classData.save()

        res.status(201).json(classData.milestones[classData.milestones.length - 1])
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// GET /api/classes/:id/milestones - Get milestones for a class
router.get('/:id/milestones', protect, async (req, res) => {
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

        res.json(classData.milestones)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// DELETE /api/classes/:id/milestones/:milestoneId - Delete a milestone
router.delete('/:id/milestones/:milestoneId', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can delete milestones' })
        }

        classData.milestones = classData.milestones.filter(
            m => m._id.toString() !== req.params.milestoneId
        )
        classData.updatedAt = Date.now()
        await classData.save()

        res.json({ message: 'Milestone deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// PUT /api/classes/:id/milestones/:milestoneId - Update a milestone
router.put('/:id/milestones/:milestoneId', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can update milestones' })
        }

        const milestone = classData.milestones.id(req.params.milestoneId)

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' })
        }

        const { topic, deadline, isCompulsory } = req.body

        if (topic) milestone.topic = topic
        if (deadline) milestone.deadline = new Date(deadline)
        if (isCompulsory !== undefined) milestone.isCompulsory = isCompulsory

        classData.updatedAt = Date.now()
        await classData.save()

        res.json(milestone)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router
