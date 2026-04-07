const axios = require('axios');
const mongoose = require('mongoose');

async function testSubmit() {
  await mongoose.connect('mongodb://localhost:27017/learning-assistant');
  const TopicQuiz = require('./models/TopicQuiz');
  const StudySession = require('./models/StudySession');
  
  const session = await StudySession.findById('69d54df46835c214096f0b5a');
  const quiz = await TopicQuiz.findOne().sort({createdAt: -1});

  try {
    const res = await axios.post('http://localhost:5001/api/sessions/final-quiz/submit', {
      sessionId: session._id,
      classId: session.classId,
      topicName: quiz.topicName,
      answers: [
        { questionId: 1, selectedLetter: 'A' },
        { questionId: 2, selectedLetter: 'B' },
        { questionId: 3, selectedLetter: 'C' },
        { questionId: 4, selectedLetter: 'D' },
        { questionId: 5, selectedLetter: 'A' }
      ]
    }, {
      // Need a valid token to authorize. 
      // Instead of hitting the API over http, let's just test the logic directly:
    });
    console.log("Success:", res.data);
  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

async function testLogic() {
  await mongoose.connect('mongodb://localhost:27017/learning-assistant');
  const TopicQuiz = require('./models/TopicQuiz');
  const StudySession = require('./models/StudySession');
  const QuizResult = require('./models/QuizResult');
  const StudyPlan = require('./models/StudyPlan');
  
  const sessionId = '69d54df46835c214096f0b5a';
  const session = await StudySession.findById(sessionId);
  const quiz = await TopicQuiz.findOne().sort({createdAt: -1});

  const answers = [
    { questionId: 1, selectedLetter: 'A' },
    { questionId: 2, selectedLetter: 'B' },
    { questionId: 3, selectedLetter: 'C' },
    { questionId: 4, selectedLetter: 'D' },
    { questionId: 5, selectedLetter: 'A' }
  ];

  try {
    let correctCount = 0;
    const processedAnswers = answers.map(ans => {
        const question = quiz.questions.find(q => q.id === ans.questionId)
        const isCorrect = question.correctLetter === ans.selectedLetter
        if (isCorrect) correctCount++

        return {
            questionId: ans.questionId,
            selectedLetter: ans.selectedLetter,
            correctLetter: question.correctLetter,
            isCorrect,
            explanation: question.explanation
        }
    })

    const score = Math.round((correctCount / quiz.questions.length) * 100)
    const passed = score >= 70

    // Find existing attempts to get attemptNumber
    const previousAttempts = await QuizResult.countDocuments({ studentId: session.studentId, classId: session.classId, topicName: quiz.topicName })
    const attemptNumber = previousAttempts + 1

    const result = await QuizResult.create({
        studentId: session.studentId,
        classId: session.classId,
        topicName: quiz.topicName,
        sessionId: sessionId || null,
        answers: processedAnswers,
        score,
        passed,
        attemptNumber
    })

    const plan = await StudyPlan.findOne({ studentId: session.studentId, classId: session.classId })
    if (plan) {
        const topicIndex = plan.topics.findIndex(t => t.name === quiz.topicName)
        if (topicIndex !== -1) {
            plan.topics[topicIndex].finalQuizScore = score
            plan.topics[topicIndex].quizAttempts = attemptNumber

            if (passed) {
                plan.topics[topicIndex].status = 'completed'
                if (topicIndex + 1 < plan.topics.length && plan.topics[topicIndex + 1].status === 'pending') {
                    plan.topics[topicIndex + 1].status = 'in_progress'
                }
            } else {
                plan.topics[topicIndex].status = 'needs_review'
            }
            await plan.save()
        }
    }
    console.log("Success local save!");
  } catch(e) {
    console.error("Local Error:", e.stack);
  }
  process.exit();
}

testLogic();
