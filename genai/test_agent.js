const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:8000/agent/', {
      message: "I answered A) and got it correct.",
      collection_name: "class_demo",
      chat_history: [
        {role: "agent", content: "What does HTTP stand for?\nA) HyperText Transfer Protocol\nB) High\nCORRECT_ANSWER: A"}
      ],
      student_context: {
        completed_topics: [],
        weak_topics: [],
        session_duration_minutes: 2
      }
    });
    console.log("Success:", res.data);
  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}
test();
