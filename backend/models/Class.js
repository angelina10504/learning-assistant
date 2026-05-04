const mongoose = require('mongoose')

const milestoneSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true,
        trim: true
    },
    deadline: {
        type: Date,
        required: true
    },
    isCompulsory: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const classSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    classCode: {
        type: String,
        unique: true,
        required: true,
        uppercase: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    materials: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],
    milestones: [milestoneSchema],
    // Canonical topic list fixed on first plan generation for this class.
    // All students' plans use the same topic names so the teacher heatmap stays aligned.
    canonicalTopics: [{
        name: { type: String, required: true },
        order: { type: Number },
        estimatedMinutes: { type: Number, default: 30 },
        difficulty: { type: String, default: 'intermediate' },
        subtopics: [String],
        pageRange: [Number]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Class', classSchema)
