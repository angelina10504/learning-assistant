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
const StudyPlan = require('../models/StudyPlan')

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

        // Process classes to include student count and actual average completion
        const refinedClasses = await Promise.all(classes.map(async (cls) => {
            const studentCount = cls.students?.length || 0
            let avgCompletion = 0

            if (studentCount > 0) {
                // Get all study plans for this class
                const plans = await StudyPlan.find({ classId: cls._id })
                if (plans.length > 0) {
                    const totalProgress = plans.reduce((sum, p) => {
                        const completed = p.topics.filter(t => t.status === 'completed').length
                        const progress = p.topics.length > 0 ? (completed / p.topics.length) : 0
                        return sum + progress
                    }, 0)
                    avgCompletion = Math.round((totalProgress / plans.length) * 100)
                }
            }

            return {
                ...cls.toObject(),
                id: cls._id,
                studentCount,
                avgCompletion
            }
        }))

        res.json(refinedClasses)
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

            const response = await axios.post(`${genaiUrl}/upload/`, formData, {
                headers: formData.getHeaders(),
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024,
            })

            // Update document with genai stats
            document.chunksCreated = response.data.chunks_created || 0
            await document.save()

            console.log(`✅ File vectorized in collection: ${collectionName} with ${document.chunksCreated} chunks.`)
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

// GET /api/classes/:id/analytics - Get aggregated analytics for the class or all classes
router.get('/:id/analytics', protect, authorize('teacher'), async (req, res) => {
    try {
        let classIds = []
        
        if (req.params.id === 'all') {
            const classes = await Class.find({ teacherId: req.user._id })
            classIds = classes.map(c => c._id)
        } else {
            const classData = await Class.findById(req.params.id)
            if (!classData) {
                return res.status(404).json({ message: 'Class not found' })
            }
            if (classData.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only class teacher can view analytics' })
            }
            classIds = [classData._id]
        }

        // Get all study sessions and plans for these classes
        const [sessions, plans] = await Promise.all([
            StudySession.find({ classId: { $in: classIds } }).populate('studentId', 'name email'),
            StudyPlan.find({ classId: { $in: classIds } })
        ])

        // Maps for tracking stats
        const weakTopicsMap = new Map()
        const studentStatsMap = new Map()
        const topicProgressMap = new Map()

        // 1. Process Study Plans for baseline topic progress
        plans.forEach(plan => {
            plan.topics.forEach(topic => {
                if (!topicProgressMap.has(topic.name)) {
                    topicProgressMap.set(topic.name, { confSum: 0, count: 0 })
                }
                const tp = topicProgressMap.get(topic.name)
                // Use priorKnowledge as initial confidence proxy
                const baseConf = topic.priorKnowledge === 'strong' ? 85 : (topic.priorKnowledge === 'partial' ? 55 : 25)
                tp.confSum += baseConf
                tp.count += 1
            })
        })

        // 2. Process Study Sessions for actual performance data
        sessions.forEach(s => {
            const studentId = s.studentId?._id?.toString()
            if (!studentId) return
            
            if (!studentStatsMap.has(studentId)) {
                studentStatsMap.set(studentId, {
                    id: studentId,
                    name: s.studentId.name,
                    email: s.studentId.email,
                    topicsCompleted: 0,
                    timeStudied: 0,
                    progressRaw: 0,
                    sessionCount: 0,
                    weakAreas: new Set(),
                    lastActive: s.startedAt,
                    confidenceSum: 0,
                    confidenceCount: 0
                })
            }
            
            const stats = studentStatsMap.get(studentId)
            stats.sessionCount += 1
            stats.topicsCompleted += s.completedTopics?.length || 0
            stats.timeStudied += Math.round(calculateActiveDuration(s) / 60000)
            
            if (s.performanceMetrics?.avgConfidence) {
                const conf = s.performanceMetrics.avgConfidence * 100
                stats.progressRaw += conf
                stats.confidenceSum += conf
                stats.confidenceCount += 1
                
                // Update topicProgressMap with actual session data if available
                if (s.topicName && topicProgressMap.has(s.topicName)) {
                    const tp = topicProgressMap.get(s.topicName)
                    tp.confSum += conf
                    tp.count += 1
                }
            }

            if (s.startedAt > (stats.lastActive || 0)) {
                stats.lastActive = s.startedAt
            }

            if (s.weakTopics && Array.isArray(s.weakTopics)) {
                s.weakTopics.forEach(wt => {
                    const tName = wt.topic
                    stats.weakAreas.add(tName)
                    
                    if (!weakTopicsMap.has(tName)) {
                        weakTopicsMap.set(tName, { strugglingCount: 0, confSum: 0, confCount: 0 })
                    }
                    const data = weakTopicsMap.get(tName)
                    data.strugglingCount += 1
                    if (wt.confidenceScore !== undefined) {
                        data.confSum += (wt.confidenceScore * 100)
                        data.confCount += 1
                    }
                })
            }
        })

        // Process maps to final arrays
        const weakTopics = Array.from(weakTopicsMap.entries()).map(([name, data]) => ({
            name,
            strugglingCount: data.strugglingCount,
            avgConfidence: data.confCount > 0 ? Math.round(data.confSum / data.confCount) : 0
        })).sort((a, b) => b.strugglingCount - a.strugglingCount)

        const topicProgressData = Array.from(topicProgressMap.entries()).map(([topic, data]) => ({
            topic,
            confidence: data.count > 0 ? Math.round(data.confSum / data.count) : 0
        })).sort((a, b) => a.topic.localeCompare(b.topic))

        const students = Array.from(studentStatsMap.values()).map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            topicsCompleted: s.topicsCompleted,
            timeStudied: s.timeStudied > 60 ? parseFloat((s.timeStudied / 60).toFixed(1)) : 0,
            progress: s.topicsCompleted > 0 ? Math.min(100, Math.round(s.progressRaw / s.topicsCompleted)) : (s.confidenceCount > 0 ? Math.round(s.confidenceSum / s.confidenceCount) : 0),
            sessionCount: s.sessionCount,
            weakAreas: Array.from(s.weakAreas),
            confidence: s.confidenceCount > 0 ? Math.round(s.confidenceSum / s.confidenceCount) : 0,
            lastActive: s.lastActive
        })).sort((a, b) => b.progress - a.progress)

        const analytics = {
            totalSessions: sessions.length,
            totalStudents: new Set([...sessions.map(s => s.studentId?._id?.toString()), ...plans.map(p => p.studentId.toString())].filter(Boolean)).size,
            averageConfidence: sessions.length > 0
                ? Math.round((sessions.reduce((sum, s) => sum + (s.performanceMetrics?.avgConfidence || 0), 0) / sessions.length) * 100)
                : 0,
            weakTopics,
            students, // Renamed from topPerformers to be more generic
            topicProgressData
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

// POST /api/classes/:id/vectorize - Re-vectorize all materials for a class
router.post('/:id/vectorize', protect, authorize('teacher'), async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can vectorize materials' })
        }

        const materials = await Document.find({ _id: { $in: classData.materials } })

        if (materials.length === 0) {
            return res.status(400).json({ message: 'No materials to vectorize' })
        }

        const collectionName = `class_${req.params.id}`
        const genaiUrl = process.env.GENAI_URL || 'http://localhost:8000'
        const results = []

        for (const doc of materials) {
            // Only vectorize PDFs that have a file on disk
            if (!doc.filePath || !fs.existsSync(doc.filePath)) {
                results.push({ file: doc.originalName, status: 'skipped', reason: 'File not found on disk' })
                continue
            }

            try {
                const FormData = require('form-data')
                const formData = new FormData()
                formData.append('file', fs.createReadStream(doc.filePath))
                formData.append('collection_name', collectionName)

                const genaiResponse = await axios.post(`${genaiUrl}/upload/`, formData, {
                    headers: formData.getHeaders(),
                    maxContentLength: 50 * 1024 * 1024,
                    maxBodyLength: 50 * 1024 * 1024,
                })

                // Update document with collection name
                doc.collectionName = collectionName
                doc.chunksCreated = genaiResponse.data.chunks_created || 0
                await doc.save()

                results.push({
                    file: doc.originalName,
                    status: 'success',
                    chunks: genaiResponse.data.chunks_created
                })
            } catch (err) {
                results.push({ file: doc.originalName, status: 'failed', error: err.message })
            }
        }

        res.json({
            message: 'Vectorization complete',
            collection: collectionName,
            results
        })
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

// GET /api/classes/:id/mastery-heatmap - Get mastery heatmap for a class
router.get('/:id/mastery-heatmap', protect, authorize('teacher'), async (req, res) => {
    try {
        const classId = req.params.id
        const classData = await Class.findById(classId).populate('students', 'name')

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' })
        }

        if (classData.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only class teacher can view mastery heatmap' })
        }

        // 1. Find all StudyPlans for this classId
        const studyPlans = await StudyPlan.find({ classId })
        const sessions = await StudySession.find({ classId })

        // 2. Collect all unique topic names across all plans
        const topicsSet = new Set()
        studyPlans.forEach(plan => {
            plan.topics.forEach(t => topicsSet.add(t.name))
        })
        const allTopics = Array.from(topicsSet).sort()

        // 3. For each student, calculate mastery per topic
        const studentMastery = await Promise.all(classData.students.map(async (student) => {
            const studentId = student._id.toString()
            const studentPlan = studyPlans.find(p => p.studentId.toString() === studentId)
            const studentSessions = sessions.filter(s => s.studentId.toString() === studentId)

            const mastery = {}

            allTopics.forEach(topicName => {
                let status = 'not_started'

                // Check StudySessions for weak flags (overrides plan status)
                const isWeak = studentSessions.some(s => 
                    s.weakTopics.some(wt => wt.topic === topicName)
                )

                if (isWeak) {
                    status = 'weak'
                } else if (studentPlan) {
                    const topicInPlan = studentPlan.topics.find(t => t.name === topicName)
                    if (topicInPlan) {
                        if (topicInPlan.status === 'completed') {
                            status = 'strong'
                        } else if (topicInPlan.status === 'current') {
                            status = 'fair'
                        }
                    }
                }

                mastery[topicName] = status
            })

            return {
                studentId,
                name: student.name,
                mastery
            }
        }))

        res.json({
            topics: allTopics,
            students: studentMastery
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router
