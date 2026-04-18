const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'harsh.taneja@bmu.edu.in',
      password: 'harsh123'
    });
    const token = res.data.token;
    console.log('Got token!');

    console.log('Fetching teaching classes config...');
    const teachRes = await axios.get('http://localhost:5001/api/classes/teaching', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let classId = null;
    if (teachRes.data.length > 0) {
      classId = teachRes.data[0]._id;
      console.log('Got classId:', classId);
    }

    console.log('Fetching alerts summary...');
    const summaryRes = await axios.get('http://localhost:5001/api/classes/alerts-summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Summary:', summaryRes.data);

    if (classId) {
      console.log('Fetching alerts...');
      const alertsRes = await axios.get(`http://localhost:5001/api/classes/${classId}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Alerts:', alertsRes.data);
      
      console.log('Fetching heatmap...');
      await axios.get(`http://localhost:5001/api/classes/${classId}/mastery-heatmap`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Heatmap OK!');
    }
  } catch (err) {
    if (err.response) {
      console.log('Server Error:', err.response.data);
    } else {
      console.log('Network Error:', err.message);
    }
  }
}
test();
