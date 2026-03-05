const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    // Each user gets their own Chroma collection
    collectionName: {
        type: String,
        required: true
    },
    chunksCreated: {
        type: Number,
        default: 0
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Document', documentSchema)