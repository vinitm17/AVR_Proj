import axios from 'axios';

const apiInstance = axios.create({
  baseURL: 'http://localhost:5000/backend/v1', // General backend routes
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s — covers Neon serverless cold start (~10-20s)
});

apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401 — token invalid or expired — clear and redirect to signin
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default apiInstance;
