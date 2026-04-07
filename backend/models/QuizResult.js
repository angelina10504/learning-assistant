const mongoose = require('mongoose')

const answerSchema = new mongoose.Schema({
    questionId: Number,
    selectedLetter: String,
    correctLetter: String,
    isCorrect: Boolean,
    explanation: String,
    wrongAnswerReason: String
}, { _id: false })

const quizResultSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    topicName: { type: String, required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudySession' },
    answers: [answerSchema],
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    attemptNumber: { type: Number, default: 1 },
    completedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('QuizResult', quizResultSchema)
