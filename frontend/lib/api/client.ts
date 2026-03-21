import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(err)
  }
)

export default api
