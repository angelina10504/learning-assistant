const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'teacher@example.com',
      password: 'password123'
    });
    const token = res.data.token;
    console.log("Logged in. Token length:", token.length);
    
    const teachingRes = await axios.get('http://localhost:5001/api/classes/teaching', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Got teaching classes:", teachingRes.data.length);
  } catch (err) {
    console.log("Error:", err.response ? err.response.data : err.message);
  }
}
test();
