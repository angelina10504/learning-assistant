const axios = require('axios');
async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', { email: 'test2@test.com', password: 'password123' });
    const token = loginRes.data.token;
    
    // Enroll test2 in the class
    const classId = '69ca2fb1a56fab8e0f496262';
    await axios.post(`http://localhost:5001/api/classes/${classId}/enroll`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    
    // Start session
    const startRes = await axios.post('http://localhost:5001/api/sessions/start', { classId }, { headers: { Authorization: `Bearer ${token}` } });
    const sessionId = startRes.data._id;
    
    // Get session
    const getSessRes = await axios.get(`http://localhost:5001/api/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
    
    // Simulate frontend mapping
    const apiData = getSessRes.data;
    const mappedSessionData = {
      ...apiData,
      topicName: apiData.documentId?.originalName || apiData.classId?.name || 'Study Session',
      className: apiData.classId?.name || 'Unknown Class',
      sessionNumber: apiData.sessionNumber || 1,
      subtopics: apiData.completedTopics?.map(t => ({ name: t, status: 'completed' })) || [],
      stats: {
        questionsAsked: apiData.performanceMetrics?.questionsAnswered || 0,
        correctAnswers: apiData.performanceMetrics?.correctCount || 0,
        currentConfidence: Math.round(apiData.performanceMetrics?.avgConfidence || 0),
      }
    };
    console.log(JSON.stringify(mappedSessionData, null, 2));
  } catch(err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
