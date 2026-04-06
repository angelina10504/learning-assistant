import api from './api';

const sessionService = {
  // POST /api/sessions/start
  startSession: (classId, { documentId, planId, topicName, topicIndex } = {}) => {
    return api.post('/sessions/start', { classId, documentId, planId, topicName, topicIndex });
  },

  // POST /api/sessions/:id/message
  sendMessage: (sessionId, message) => {
    return api.post(`/sessions/${sessionId}/message`, { content: message });
  },

  // POST /api/sessions/:id/end
  endSession: (sessionId) => {
    return api.post(`/sessions/${sessionId}/end`);
  },

  // GET /api/sessions/dashboard
  getDashboardData: () => {
    return api.get('/sessions/dashboard');
  },

  // GET /api/sessions
  getSessions: () => {
    return api.get('/sessions');
  },

  // GET /api/sessions/:id
  getSessionDetails: (sessionId) => {
    return api.get(`/sessions/${sessionId}`);
  },

  // POST /api/sessions/pre-assessment-questions
  getPreAssessmentQuestions: (classId) => {
    return api.post('/sessions/pre-assessment-questions', { classId });
  },

  // POST /api/sessions/generate-plan
  generatePlan: (classId, milestoneId, assessmentResults = null) => {
    return api.post('/sessions/generate-plan', { classId, milestoneId, assessmentResults });
  },

  // GET /api/sessions/plans
  getPlans: (classId) => {
    const params = classId ? { classId } : {};
    return api.get('/sessions/plans', { params });
  },

  // GET /api/sessions/plans/:id
  getPlanDetails: (planId) => {
    return api.get(`/sessions/plans/${planId}`);
  },

  // PATCH /api/sessions/plans/:planId/topics/:topicIndex
  updateTopicStatus: (planId, topicIndex, status) => {
    return api.patch(`/sessions/plans/${planId}/topics/${topicIndex}`, { status });
  },

  // DELETE /api/sessions/plans/:id
  deletePlan: (planId) => {
    return api.delete(`/sessions/plans/${planId}`);
  },
};

export default sessionService;
