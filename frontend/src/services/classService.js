import api from './api';

const classService = {
  createClass: (name, description) => {
    return api.post('/classes', { name, description });
  },

  getTeachingClasses: () => {
    return api.get('/classes/teaching');
  },

  getEnrolledClasses: () => {
    return api.get('/classes/enrolled');
  },

  joinClass: (classCode) => {
    return api.post('/classes/join', { classCode });
  },

  getClassDetails: (classId) => {
    return api.get(`/classes/${classId}`);
  },

  getClassAnalytics: (classId) => {
    return api.get(`/classes/${classId}/analytics`);
  },

  uploadMaterial: (classId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/classes/${classId}/materials`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  exportCSV: (classId) => {
    return api.post(`/classes/${classId}/export-csv`, {}, {
      responseType: 'blob',
    });
  },

  deleteClass: (classId) => {
    return api.delete(`/classes/${classId}`);
  },

  vectorizeMaterials: (classId) => {
    return api.post(`/classes/${classId}/vectorize`);
  },

  getClassMaterials: (classId) => {
    return api.get(`/classes/${classId}/materials`);
  },

  addMilestone: (classId, topic, deadline, isCompulsory) => {
    return api.post(`/classes/${classId}/milestones`, { topic, deadline, isCompulsory });
  },

  getClassMilestones: (classId) => {
    return api.get(`/classes/${classId}/milestones`);
  },

  deleteMilestone: (classId, milestoneId) => {
    return api.delete(`/classes/${classId}/milestones/${milestoneId}`);
  },

  updateMilestone: (classId, milestoneId, topic, deadline, isCompulsory) => {
    return api.put(`/classes/${classId}/milestones/${milestoneId}`, { topic, deadline, isCompulsory });
  },
  getMasteryHeatmap: (classId) => {
    return api.get(`/classes/${classId}/mastery-heatmap`);
  },

  getMaterialPreview: (classId, materialId) => {
    return api.get(`/classes/${classId}/materials/${materialId}/preview`, {
      responseType: 'blob'
    });
  },
};

export default classService;
