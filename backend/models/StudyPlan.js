const mongoose = require('mongoose')

const planTopicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    subtopics: [{
        type: String
    }],
    estimatedMinutes: {
        type: Number,
        default: 30
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
    },
    status: {
        type: String,
        enum: ['locked', 'pending', 'current', 'in_progress', 'needs_review', 'completed'],
        default: 'pending'
    },
    order: {
        type: Number,
        required: true
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    priorKnowledge: {
        type: String,
        enum: ['none', 'partial', 'strong'],
        default: 'none'
    },
    pageRange: [{
        type: Number
    }],
    finalQuizScore: {
        type: Number,
        default: null
    },
    quizAttempts: {
        type: Number,
        default: 0
    }
}, { _id: false })

const studyPlanSchema = new mongoose.Schema({
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
    milestoneId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    title: {
        type: String,
        required: true
    },
    topics: [planTopicSchema],
    totalEstimatedHours: {
        type: Number,
        default: 0
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
})

module.exports = mongoose.model('StudyPlan', studyPlanSchema)
