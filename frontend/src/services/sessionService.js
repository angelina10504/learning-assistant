import api from './api';

const sessionService = {
  // POST /api/sessions/start — matches backend route
  startSession: (classId, documentId) => {
    return api.post('/sessions/start', { classId, documentId });
  },

  // POST /api/sessions/:id/message — matches backend route (singular, body: { content })
  sendMessage: (sessionId, message) => {
    return api.post(`/sessions/${sessionId}/message`, { content: message });
  },

  // POST /api/sessions/:id/end
  endSession: (sessionId) => {
    return api.post(`/sessions/${sessionId}/end`);
  },

  // GET /api/sessions
  getSessions: () => {
    return api.get('/sessions');
  },

  // GET /api/sessions/:id
  getSessionDetails: (sessionId) => {
    return api.get(`/sessions/${sessionId}`);
  },
};

export default sessionService;
