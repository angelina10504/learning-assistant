import api from './api';

const sessionService = {
  startSession: (classId, documentId) => {
    return api.post('/sessions', { classId, documentId });
  },

  sendMessage: (sessionId, message) => {
    return api.post(`/sessions/${sessionId}/messages`, { message });
  },

  endSession: (sessionId) => {
    return api.post(`/sessions/${sessionId}/end`);
  },

  getSessions: () => {
    return api.get('/sessions');
  },

  getSessionDetails: (sessionId) => {
    return api.get(`/sessions/${sessionId}`);
  },
};

export default sessionService;
