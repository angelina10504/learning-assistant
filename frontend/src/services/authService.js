import api from './api';

const authService = {
  login: (email, password) => {
    return api.post('/auth/login', { email, password });
  },

  register: (name, email, password, role) => {
    return api.post('/auth/register', { name, email, password, role });
  },

  getMe: () => {
    return api.get('/auth/me');
  },
};

export default authService;
