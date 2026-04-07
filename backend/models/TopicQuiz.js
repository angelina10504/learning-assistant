const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
    id: Number,
    question: String,
    options: [{ letter: String, text: String }],
    correctLetter: String,
    explanation: String,
    wrongAnswerReasons: {
        type: Map,
        of: String
    }
}, { _id: false })

const topicQuizSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    topicName: { type: String, required: true },
    quizId: { type: String },
    questions: [questionSchema],
    attemptVariant: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    generatedFrom: [String]
})

module.exports = mongoose.model('TopicQuiz', topicQuizSchema)
