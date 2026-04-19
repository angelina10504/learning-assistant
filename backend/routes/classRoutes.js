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
const QuizResult = require('../models/QuizResult')
const { computeMasteryScore } = require('../utils/masteryScore')

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
            let studentProgressList = []

            if (studentCount > 0) {
                // Compute per-student progress, then average across ALL students
                studentProgressList = await Promise.all(
                    cls.students.map(async (student) => {
                        const studentId = student._id || student

                        // --- Signal 1: Study plan topic completion (most reliable) ---
                        let planProgress = 0
                        const plans = await StudyPlan.find({ classId: cls._id, studentId })
                        if (plans.length > 0) {
                            const progressSum = plans.reduce((sum, p) => {
                                const topicCount = p.topics.length
                                const completedCount = p.topics.filter(t => t.status === 'completed').length
                                const currentCount = p.topics.filter(t => t.status === 'current').length
                                return sum + (topicCount > 0 ? (completedCount + currentCount * 0.3) / topicCount : 0)
                            }, 0)
                            planProgress = Math.min((progressSum / plans.length) * 100, 100)
                        }

                        // --- Signal 2: Session engagement (ALL sessions, not just ended) ---
                        let sessionProgress = 0
                        const allSessions = await StudySession.find({
                            classId: cls._id,
                            studentId
                        }).sort({ startedAt: -1 }).limit(10)

                        if (allSessions.length > 0) {
                            // Use saved progressPercent if it's non-zero (from ended sessions with new code)
                            const savedProgresses = allSessions.filter(s => (s.progressPercent || 0) > 0)
                            if (savedProgresses.length > 0) {
                                sessionProgress = savedProgresses.reduce((sum, s) => sum + s.progressPercent, 0) / savedProgresses.length
                            } else {
                                // Fallback: estimate progress from message count
                                // More messages = more engagement. Cap at 80 to leave room for completion
                                const totalMessages = allSessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)
                                sessionProgress = Math.min(totalMessages * 3, 80)
                            }
                        }

                        // Combine signals
                        let finalProgress = 0
                        if (planProgress > 0 && sessionProgress > 0) {
                            finalProgress = (planProgress * 0.7) + (sessionProgress * 0.3)
                        } else if (planProgress > 0) {
                            finalProgress = planProgress
                        } else {
                            finalProgress = sessionProgress
                        }
                        
                        return {
                            studentId: student._id || student,
                            name: student.name || 'Student',
                            progress: Math.round(finalProgress)
                        }
                    })
                )

                // Average all students (including those at 0, so teacher sees true class average)
                const totalProgress = studentProgressList.reduce((sum, p) => sum + p.progress, 0)
                avgCompletion = Math.round(totalProgress / studentProgressList.length)
            }

            return {
                ...cls.toObject(),
                id: cls._id,
                studentCount,
                avgCompletion,
                studentProgresses: studentProgressList || []
            }
        }))

        res.json(refinedClasses)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


// GET /api/classes/enrolled - Get student's enrolled classes with per-class progress
router.get('/enrolled', protect, authorize('student'), async (req, res) => {
    try {
        const classes = await Class.find({ _id: { $in: req.user.enrolledClasses } })
            .populate('teacherId', 'name email')
            .populate('materials', 'originalName uploadedAt')

        // For each class, compute this student's progress from their study plans
        const classesWithProgress = await Promise.all(classes.map(async (cls) => {
            let progress = 0
            try {
                // Get all study plans this student has for this class
                const plans = await StudyPlan.find({
                    classId: cls._id,
                    studentId: req.user._id
                })

                if (plans.length > 0) {
                    const progressSum = plans.reduce((sum, p) => {
                        const topicCount = p.topics.length
                        const completedCount = p.topics.filter(t => t.status === 'completed').length
                        const currentCount = p.topics.filter(t => t.status === 'current').length
                        return sum + (topicCount > 0 ? (completedCount + currentCount * 0.3) / topicCount : 0)
                    }, 0)
                    progress = Math.round((progressSum / plans.length) * 100)
                }

                // Also blend with session progress (all sessions, not just ended)
                const sessions = await StudySession.find({
                    classId: cls._id,
                    studentId: req.user._id
                }).sort({ startedAt: -1 }).limit(10)

                if (sessions.length > 0) {
                    const savedProgresses = sessions.filter(s => (s.progressPercent || 0) > 0)
                    if (savedProgresses.length > 0) {
                        const sessionProgress = savedProgresses.reduce((sum, s) => sum + s.progressPercent, 0) / savedProgresses.length
                        progress = progress > 0
                            ? Math.round((progress * 0.7) + (sessionProgress * 0.3))
                            : Math.round(sessionProgress)
                    } else if (progress === 0) {
                        // Fallback: estimate from message count
                        const totalMessages = sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)
                        progress = Math.min(totalMessages * 3, 60)
                    }
                }
            } catch (err) {
                console.error(`[ENROLLED ERROR] Class ${cls.name}:`, err.message)
                // If any error, just return 0 progress
            }

            console.log(`[ENROLLED DEBUG] Class: ${cls.name} | progress: ${progress}`)
            return {
                ...cls.toObject(),
                id: cls._id,
                teacherName: cls.teacherId?.name || 'Instructor',
                progress
            }
        }))

        res.json(classesWithProgress)
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

// GET /api/classes/alerts-summary - Lightweight endpoint to get total alerts for teacher
router.get('/alerts-summary', protect, authorize('teacher'), async (req, res) => {
    try {
        const classes = await Class.find({ teacherId: req.user._id })
        const classIds = classes.map(c => c._id)
        
        const [sessions, plans] = await Promise.all([
            StudySession.find({ classId: { $in: classIds } }),
            StudyPlan.find({ classId: { $in: classIds } })
        ])

        let totalWeakTopics = 0
        let totalInterventions = 0

        const now = new Date()
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

        for (const cls of classes) {
            const classIdStr = cls._id.toString()
            const classSessions = sessions.filter(s => s.classId.toString() === classIdStr)
            const classPlans = plans.filter(p => p.classId.toString() === classIdStr)
            
            // Get unique student count from StudyPlans
            const enrolledStudentIds = new Set(classPlans.map(p => p.studentId.toString()))
            const totalStudents = enrolledStudentIds.size > 0 ? enrolledStudentIds.size : 1

            // Count class-wide weak topics
            const topicsSet = new Set()
            classPlans.forEach(p => p.topics?.forEach(t => topicsSet.add(t.name)))
            
            for (const topicName of topicsSet) {
                const strugglingStudents = new Set()
                
                // From sessions
                classSessions.forEach(s => {
                    if (s.weakTopics?.some(wt => wt.topic === topicName)) {
                        strugglingStudents.add(s.studentId.toString())
                    }
                })

                const affectedRatio = strugglingStudents.size / totalStudents
                if (affectedRatio > 0.40) {
                    totalWeakTopics++
                }
            }

            // Count interventions
            const nearMilestones = cls.milestones?.filter(m => 
                m.deadline <= threeDaysFromNow && m.deadline >= now
            ) || []

            cls.students.forEach(studentId => {
                const sId = studentId.toString()
                const studentSessions = classSessions.filter(s => s.studentId.toString() === sId)
                const hasRecentSession = studentSessions.some(s => new Date(s.startedAt) >= threeDaysAgo)

                if (!hasRecentSession) {
                    nearMilestones.forEach(() => {
                        totalInterventions++
                    })
                }
            })
        }
        
        res.json({ totalWeakTopics, totalInterventions })
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

// GET /api/classes/:id/materials/:materialId/preview - Stream file for inline preview
router.get('/:id/materials/:materialId/preview', protect, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)
        if (!classData) return res.status(404).json({ message: 'Class not found' })

        const isTeacher = classData.teacherId.toString() === req.user._id.toString()
        const isStudent = classData.students.some(s => s.toString() === req.user._id.toString())
        if (!isTeacher && !isStudent) return res.status(403).json({ message: 'Not authorized' })

        const material = await Document.findById(req.params.materialId)
        if (!material) return res.status(404).json({ message: 'Material not found' })

        if (!fs.existsSync(material.filePath)) {
            return res.status(404).json({ message: 'File not found on server' })
        }

        const mimeType = material.mimeType || 'application/octet-stream'
        const stat = fs.statSync(material.filePath)

        res.setHeader('Content-Type', mimeType)
        res.setHeader('Content-Length', stat.size)
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.originalName)}"`)
        res.setHeader('Cache-Control', 'private, max-age=3600')

        const stream = fs.createReadStream(material.filePath)
        stream.pipe(res)
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

        // 1. Process Study Plans for baseline topic progress + per-student plan progress
        const studentPlanProgressMap = new Map() // studentId -> { completed, current, total }
        plans.forEach(plan => {
            const sid = plan.studentId?.toString()

            plan.topics.forEach(topic => {
                // Aggregate topic confidence for the chart
                if (!topicProgressMap.has(topic.name)) {
                    topicProgressMap.set(topic.name, { confSum: 0, count: 0 })
                }
                const tp = topicProgressMap.get(topic.name)
                const baseConf = topic.status === 'completed' ? 100
                    : topic.status === 'current' ? 50
                    : topic.priorKnowledge === 'strong' ? 85
                    : topic.priorKnowledge === 'partial' ? 55 : 25
                tp.confSum += baseConf
                tp.count += 1
            })

            // Track per-student plan progress
            if (sid) {
                if (!studentPlanProgressMap.has(sid)) {
                    studentPlanProgressMap.set(sid, { completed: 0, current: 0, total: 0 })
                }
                const sp = studentPlanProgressMap.get(sid)
                plan.topics.forEach(t => {
                    sp.total += 1
                    if (t.status === 'completed') sp.completed += 1
                    else if (t.status === 'current') sp.current += 1
                })
            }
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
                    timeStudied: 0,
                    sessionCount: 0,
                    messageCount: 0,
                    weakAreas: new Set(),
                    lastActive: s.startedAt,
                    confidenceSum: 0,
                    confidenceCount: 0,
                    savedProgressSum: 0,
                    savedProgressCount: 0
                })
            }
            
            const stats = studentStatsMap.get(studentId)
            stats.sessionCount += 1
            stats.messageCount += s.messages?.length || 0
            stats.timeStudied += Math.round(calculateActiveDuration(s) / 60000)
            
            // Collect saved progressPercent (from sessions ended with new code)
            if ((s.progressPercent || 0) > 0) {
                stats.savedProgressSum += s.progressPercent
                stats.savedProgressCount += 1
            }

            if (s.performanceMetrics?.avgConfidence) {
                const conf = s.performanceMetrics.avgConfidence * 100
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

        // Merge session stats + plan progress into final student list
        // Seed from ALL enrolled students so no one is missing
        const classDocs = await Class.find({ _id: { $in: classIds } }).populate('students', 'name email')
        const enrolledStudents = classDocs.flatMap(c => c.students || [])
        const enrolledMap = new Map(enrolledStudents.map(u => [u._id.toString(), u]))

        const allStudentIds = new Set([
            ...enrolledMap.keys(),
            ...Array.from(studentStatsMap.keys()),
            ...Array.from(studentPlanProgressMap.keys())
        ])

        const students = Array.from(allStudentIds).map(sid => {
            const s = studentStatsMap.get(sid)
            const planData = studentPlanProgressMap.get(sid)
            const enrolledUser = enrolledMap.get(sid)

            // --- Compute progress ---
            let progress = 0

            // Signal 1: Study plan topic completion (most reliable)
            if (planData && planData.total > 0) {
                const planScore = ((planData.completed + planData.current * 0.3) / planData.total) * 100
                progress = Math.min(planScore, 100)
            }

            // Signal 2: Saved progressPercent from new session end flow
            if (s && s.savedProgressCount > 0) {
                const sessionScore = s.savedProgressSum / s.savedProgressCount
                progress = planData?.total > 0
                    ? (progress * 0.7) + (sessionScore * 0.3)
                    : sessionScore
            }

            // Signal 3: Fallback to message count engagement if progress still 0
            if (progress === 0 && s && s.messageCount > 0) {
                progress = Math.min(s.messageCount * 3, 60)
            }

            progress = Math.round(progress)

            // Build name/email from session data OR enrolled user lookup
            const name = s?.name || enrolledUser?.name || 'Student'
            const email = s?.email || enrolledUser?.email || ''

            if (s) {
                return {
                    id: s.id,
                    name,
                    email,
                    topicsCompleted: planData?.completed || 0,
                    timeStudied: s.timeStudied > 60 ? parseFloat((s.timeStudied / 60).toFixed(1)) : 0,
                    progress,
                    sessionCount: s.sessionCount,
                    weakAreas: Array.from(s.weakAreas),
                    confidence: s.confidenceCount > 0 ? Math.round(s.confidenceSum / s.confidenceCount) : 0,
                    lastActive: s.lastActive
                }
            }

            // Student has plan or just enrolled — no sessions yet
            return {
                id: sid,
                name,
                email,
                topicsCompleted: planData?.completed || 0,
                timeStudied: 0,
                progress,
                sessionCount: 0,
                weakAreas: [],
                confidence: 0,
                lastActive: null
            }
        }).sort((a, b) => b.progress - a.progress)

        const analytics = {
            totalSessions: sessions.length,
            totalStudents: allStudentIds.size,
            averageConfidence: sessions.length > 0
                ? Math.round((sessions.reduce((sum, s) => sum + (s.performanceMetrics?.avgConfidence || 0), 0) / sessions.length) * 100)
                : 0,
            weakTopics,
            students,
            topicProgressData
        }

        res.json(analytics)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// POST /api/classes/:id/export-csv - Export class analytics as CSV (Power BI flat format)
// Supports id === 'all' to export across all teacher's classes
router.post('/:id/export-csv', protect, authorize('teacher'), async (req, res) => {
    try {
        let classIds = []
        let className = 'all-classes'

        if (req.params.id === 'all') {
            const classes = await Class.find({ teacherId: req.user._id })
            classIds = classes.map(c => c._id)
        } else {
            const classData = await Class.findById(req.params.id)
            if (!classData) {
                return res.status(404).json({ message: 'Class not found' })
            }
            if (classData.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only class teacher can export analytics' })
            }
            classIds = [classData._id]
            className = classData.name.replace(/[^a-zA-Z0-9]/g, '_')
        }

        // Fetch all data in parallel
        const [classes, sessions, plans, quizResults] = await Promise.all([
            Class.find({ _id: { $in: classIds } }).populate('students', 'name email'),
            StudySession.find({ classId: { $in: classIds } }).populate('studentId', 'name email'),
            StudyPlan.find({ classId: { $in: classIds } }).populate('studentId', 'name email'),
            QuizResult.find({ classId: { $in: classIds } }).populate('studentId', 'name email')
        ])

        const csvRows = []

        // Build one row per student per topic per class
        for (const cls of classes) {
            const classIdStr = cls._id.toString()
            const classPlans = plans.filter(p => p.classId.toString() === classIdStr)
            const classSessions = sessions.filter(s => s.classId.toString() === classIdStr)
            const classQuizResults = quizResults.filter(r => r.classId.toString() === classIdStr)

            // Collect all unique topics from plans
            const topicsSet = new Set()
            classPlans.forEach(p => p.topics?.forEach(t => topicsSet.add(t.name)))
            const allTopics = Array.from(topicsSet).sort()

            // For each enrolled student
            const studentIds = new Set(cls.students.map(s => (s._id || s).toString()))
            // Also include students from plans who might not be in cls.students
            classPlans.forEach(p => studentIds.add(p.studentId?._id?.toString() || p.studentId?.toString()))

            for (const studentId of studentIds) {
                const studentPlan = classPlans.find(p => (p.studentId?._id?.toString() || p.studentId?.toString()) === studentId)
                const studentSessions = classSessions.filter(s => (s.studentId?._id?.toString() || s.studentId?.toString()) === studentId)
                const studentName = studentSessions[0]?.studentId?.name || studentPlan?.studentId?.name || cls.students.find(s => (s._id || s).toString() === studentId)?.name || 'Unknown'
                const studentEmail = studentSessions[0]?.studentId?.email || studentPlan?.studentId?.email || cls.students.find(s => (s._id || s).toString() === studentId)?.email || ''

                for (const topicName of allTopics) {
                    const planTopic = studentPlan ? studentPlan.topics?.find(t => t.name === topicName) : null
                    const topicSessions = studentSessions.filter(s => s.topicName === topicName)
                    const topicQuizResults = classQuizResults.filter(r =>
                        r.topicName === topicName &&
                        (r.studentId?._id?.toString() === studentId || r.studentId?.toString() === studentId)
                    )

                    // Compute mastery score using shared utility
                    const { totalScore, tier } = computeMasteryScore({
                        sessions: topicSessions,
                        quizResults: topicQuizResults,
                        planTopic
                    })

                    // Session aggregates
                    const totalMessages = topicSessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)
                    const totalQuestionsAsked = topicSessions.reduce((sum, s) => sum + (s.questionsAsked || 0), 0)
                    const totalCorrectAnswers = topicSessions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0)
                    const totalDurationMins = topicSessions.reduce((sum, s) => sum + Math.round(calculateActiveDuration(s) / 60000), 0)
                    const sessionCount = topicSessions.length

                    // Latest quiz result
                    const sortedQuiz = [...topicQuizResults].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    const latestQuiz = sortedQuiz.length > 0 ? sortedQuiz[0] : null
                    const bestQuizScore = topicQuizResults.length > 0 ? Math.max(...topicQuizResults.map(r => r.score)) : ''

                    // First and last session dates for this topic
                    const sessionDates = topicSessions.map(s => new Date(s.startedAt)).sort((a, b) => a - b)
                    const firstSessionDate = sessionDates.length > 0 ? sessionDates[0].toISOString().split('T')[0] : ''
                    const lastSessionDate = sessionDates.length > 0 ? sessionDates[sessionDates.length - 1].toISOString().split('T')[0] : ''

                    csvRows.push({
                        className: cls.name,
                        studentName,
                        studentEmail,
                        topicName,
                        topicOrder: planTopic?.order ?? '',
                        difficulty: planTopic?.difficulty || '',
                        priority: planTopic?.priority || '',
                        priorKnowledge: planTopic?.priorKnowledge || '',
                        topicStatus: planTopic?.status || 'not_started',
                        masteryScore: totalScore,
                        masteryTier: tier,
                        sessionCount,
                        totalMessages,
                        totalDurationMins,
                        inSessionQuestionsAsked: totalQuestionsAsked,
                        inSessionCorrectAnswers: totalCorrectAnswers,
                        inSessionAccuracy: totalQuestionsAsked > 0 ? Math.round((totalCorrectAnswers / totalQuestionsAsked) * 100) : '',
                        finalQuizScore: latestQuiz?.score ?? '',
                        finalQuizPassed: latestQuiz?.passed ?? '',
                        finalQuizAttempts: (planTopic?.quizAttempts ?? topicQuizResults.length) || '',
                        bestQuizScore,
                        firstSessionDate,
                        lastSessionDate,
                        estimatedMinutes: planTopic?.estimatedMinutes || ''
                    })
                }
            }
        }

        // Handle empty data — return headers only so Power BI can still map columns
        if (csvRows.length === 0) {
            const headers = 'className,studentName,studentEmail,topicName,topicOrder,difficulty,priority,priorKnowledge,topicStatus,masteryScore,masteryTier,sessionCount,totalMessages,totalDurationMins,inSessionQuestionsAsked,inSessionCorrectAnswers,inSessionAccuracy,finalQuizScore,finalQuizPassed,finalQuizAttempts,bestQuizScore,firstSessionDate,lastSessionDate,estimatedMinutes'
            res.header('Content-Type', 'text/csv')
            res.header('Content-Disposition', `attachment; filename="${className}-analytics-${new Date().toISOString().split('T')[0]}.csv"`)
            return res.send(headers)
        }

        const csv = generateCSV(csvRows)

        res.header('Content-Type', 'text/csv')
        res.header('Content-Disposition', `attachment; filename="${className}-analytics-${new Date().toISOString().split('T')[0]}.csv"`)
        res.send(csv)
    } catch (error) {
        console.error('CSV export error:', error)
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
        const quizResults = await QuizResult.find({ classId })

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

            const mastery = {}

            allTopics.forEach(topicName => {
                const topicSessions = sessions.filter(s => s.studentId.toString() === studentId && s.topicName === topicName)
                const topicResults = quizResults.filter(r => r.studentId.toString() === studentId && r.topicName === topicName)
                const planTopic = studentPlan ? studentPlan.topics.find(t => t.name === topicName) : null

                const { tier } = computeMasteryScore({
                    sessions: topicSessions,
                    quizResults: topicResults,
                    planTopic
                })
                mastery[topicName] = tier
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


// GET /api/classes/:id/alerts - Get proactive alerts for the teacher
router.get('/:id/alerts', protect, authorize('teacher'), async (req, res) => {
    try {
        const classId = req.params.id
        const classData = await Class.findById(classId).populate('students', 'name')
        if (!classData) return res.status(404).json({ message: 'Class not found' })

        const [sessions, plans, results] = await Promise.all([
            StudySession.find({ classId }),
            StudyPlan.find({ classId }),
            QuizResult.find({ classId })
        ])

        // Total enrolled students based on StudyPlans
        const enrolledStudentIds = new Set()
        plans.forEach(p => enrolledStudentIds.add(p.studentId.toString()))
        const totalStudents = enrolledStudentIds.size > 0 ? enrolledStudentIds.size : 1

        const topicsSet = new Set()
        plans.forEach(p => p.topics?.forEach(t => topicsSet.add(t.name)))
        const allTopics = Array.from(topicsSet)

        // 1. Class-Wide Alerts (Red)
        const classWide = []

        allTopics.forEach(topicName => {
            const strugglingStudents = new Set()
            
            // Check StudySession weakTopics
            sessions.forEach(s => {
                if (s.weakTopics?.some(wt => wt.topic === topicName)) {
                    strugglingStudents.add(s.studentId.toString())
                }
            })

            // Check Heatmap Tiers (Emerging)
            classData.students.forEach(student => {
                const sId = student._id.toString()
                const sPlan = plans.find(p => p.studentId.toString() === sId)
                const planTopic = sPlan ? sPlan.topics?.find(t => t.name === topicName) : null
                
                const sSessions = sessions.filter(s => s.studentId.toString() === sId && s.topicName === topicName)
                const sResults = results.filter(r => r.studentId.toString() === sId && r.topicName === topicName)
                
                const { tier } = computeMasteryScore({
                    sessions: sSessions,
                    quizResults: sResults,
                    planTopic
                })
                if (tier === 'emerging') strugglingStudents.add(sId)
            })

            const affectedRatio = strugglingStudents.size / totalStudents
            if (affectedRatio > 0.40) {
                classWide.push({
                    topicName,
                    affectedCount: strugglingStudents.size,
                    totalStudents,
                    percentage: Math.round(affectedRatio * 100)
                })
            }
        })

        // Sort classWide descending by percentage, take top 3
        classWide.sort((a, b) => b.percentage - a.percentage)
        const topClassWide = classWide.slice(0, 3)

        // 2. Intervention Alerts (Amber)
        const interventions = []
        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

        const nearMilestones = classData.milestones.filter(m => 
            m.deadline <= threeDaysFromNow && m.deadline >= now
        )

        classData.students.forEach(student => {
            const sId = student._id.toString()
            const studentSessions = sessions.filter(s => s.studentId.toString() === sId)
            
            // Check timestamp
            const hasRecentSession = studentSessions.some(s => new Date(s.startedAt) >= threeDaysAgo)

            if (!hasRecentSession) {
                nearMilestones.forEach(m => {
                    interventions.push({
                        studentId: sId,
                        studentName: student.name,
                        milestoneName: m.topic,
                        daysUntilDeadline: Math.ceil((m.deadline - now) / (1000 * 60 * 60 * 24)),
                        lastSessionDate: studentSessions.length > 0 
                            ? new Date(Math.max(...studentSessions.map(s => new Date(s.startedAt).getTime())))
                            : null
                    })
                })
            }
        })

        // Sort interventions urgency
        interventions.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)

        // 3. AI Recommendations (Cyan)
        const recommendations = []
        let lowestTopic = null
        let lowestScore = 101

        const hasAnyQuizResults = results.length > 0

        if (hasAnyQuizResults) {
            allTopics.forEach(topicName => {
                const topicResults = results.filter(r => r.topicName === topicName)
                // Filter to unique students for this topic
                const uniqueStudentsForTopic = new Set(topicResults.map(r => r.studentId.toString()))
                
                if (uniqueStudentsForTopic.size >= 2) {
                    const avgScore = topicResults.reduce((sum, r) => sum + r.score, 0) / topicResults.length
                    if (avgScore < lowestScore) {
                        lowestScore = avgScore
                        // calculate tier from avgScore just for recommendation purpose roughly
                        let tier = 'emerging'
                        if (avgScore >= 80) tier = 'mastered'
                        else if (avgScore >= 60) tier = 'proficient'
                        else if (avgScore >= 40) tier = 'developing'

                        lowestTopic = {
                            topicName,
                            avgScore: Math.round(avgScore),
                            tier,
                            studentCount: uniqueStudentsForTopic.size
                        }
                    }
                }
            })
        } else {
            // Fallback: count needs_review grouped by topicName
            let highestNeedsReviewCount = -1
            allTopics.forEach(topicName => {
                const needsReviewStudents = new Set()
                plans.forEach(p => {
                    const t = p.topics?.find(top => top.name === topicName)
                    if (t?.status === 'needs_review') {
                        needsReviewStudents.add(p.studentId.toString())
                    }
                })
                
                if (needsReviewStudents.size >= 2 && needsReviewStudents.size > highestNeedsReviewCount) {
                    highestNeedsReviewCount = needsReviewStudents.size
                    lowestTopic = {
                        topicName,
                        avgScore: Math.round(100 - (needsReviewStudents.size / totalStudents * 100)),
                        tier: 'emerging',
                        studentCount: needsReviewStudents.size
                    }
                }
            })
        }

        if (lowestTopic) {
            recommendations.push(lowestTopic)
        }

        const totalCount = topClassWide.length + interventions.length + recommendations.length

        res.json({
            classWide: topClassWide,
            interventions,
            recommendations,
            totalCount
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router
