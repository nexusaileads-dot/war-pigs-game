import axios, { AxiosError } from 'axios';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_URL = RAW_API_URL.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('currentRun');
    }

    if (import.meta.env.DEV) {
      console.error('[apiClient] Request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        status,
        data: error.response?.data,
        message: error.message
      });
    }

    return Promise.reject(error);
  }
);

export { API_URL };
