const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['human', 'ai', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    toolsUsed: [{
        type: String
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false })

const weakTopicSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true
    },
    detectedAt: {
        type: Date,
        default: Date.now
    },
    confidenceScore: {
        type: Number,
        min: 0,
        max: 1
    }
}, { _id: false })

const studySessionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    },
    messages: [messageSchema],
    weakTopics: [weakTopicSchema],
    completedTopics: [{
        type: String
    }],
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    performanceMetrics: {
        avgConfidence: {
            type: Number,
            min: 0,
            max: 1
        },
        questionsAnswered: {
            type: Number,
            default: 0
        },
        correctCount: {
            type: Number,
            default: 0
        }
    }
})

module.exports = mongoose.model('StudySession', studySessionSchema)
