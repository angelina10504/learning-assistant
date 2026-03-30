const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

async function test() {
  const fileToTest = path.join(__dirname, 'uploads', '1774863242135-73432786-Lectures-1, 2.pdf');
  
  if(!fs.existsSync(fileToTest)) { console.log("not found"); return; }
  
  const form = new FormData();
  form.append('file', fs.createReadStream(fileToTest));
  form.append('collection_name', 'test_collection');
  
  try {
    const res = await axios.post('http://localhost:8000/upload/', form, { headers: form.getHeaders() });
    console.log("SUCCESS:", res.data);
  } catch(e) {
    if (e.response) {
       console.log("ERROR DATA:", e.response.data);
       console.log("STATUS:", e.response.status);
    } else {
       console.log("ERROR MSG:", e.message);
    }
  }
}
test();
