import axios from 'axios'

// Configuração base do axios
const api = axios.create({
  baseURL: 'https://agendai-backend.onrender.com', // Usar URL relativa para funcionar tanto em dev quanto em produção
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar loading e tratamento de erros
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Funções da API

// Profile API
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  uploadAvatar: (formData) => api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// Services API
export const servicesAPI = {
  getAll: () => api.get('/services'),
  get: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
}

// Bookings API
export const bookingsAPI = {
  getAll: (params = {}) => api.get('/bookings', { params }),
  getCalendar: (month, year) => api.get(`/bookings/calendar/${month}/${year}`),
  getAvailableTimes: (date, serviceId) => api.get(`/bookings/available-times/${date}/${serviceId}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  cancel: (id) => api.delete(`/bookings/${id}`)
}

export default api

