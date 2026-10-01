import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// Add token from localStorage to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  getGoogleAuthUrl: () => api.get<{ configured: boolean; url?: string }>('/auth/google'),
  getMe: () => api.get<{ user: User }>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  devLogin: () => api.post<{ token: string; user: User }>('/auth/dev-login'),
};

// Email scheduling & management
export const emailApi = {
  schedule: (data: ScheduleEmailRequest) =>
    api.post<ScheduleEmailResponse>('/emails/schedule', data),

  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ count: number; emails: string[] }>('/emails/upload-csv', formData);
  },

  getScheduled: (page = 1, limit = 50) =>
    api.get<EmailListResponse>(`/emails/scheduled?page=${page}&limit=${limit}`),

  getSent: (page = 1, limit = 50) =>
    api.get<EmailListResponse>(`/emails/sent?page=${page}&limit=${limit}`),

  search: (q: string, status?: string) =>
    api.get<SearchResponse>(`/emails/search?q=${q}${status ? `&status=${status}` : ''}`),

  getById: (id: string) =>
    api.get<{ email: Email }>(`/emails/${id}`),

  getSenders: () =>
    api.get<{ senders: Sender[] }>('/emails/senders/list'),

  createSender: (displayName: string) =>
    api.post<{ sender: Sender }>('/emails/senders', { displayName }),
};

// Slack notifications
export const slackApi = {
  connect: () => api.get<{ url: string }>('/slack/connect'),
  getStatus: () => api.get<SlackStatus>('/slack/status'),
  disconnect: () => api.post('/slack/disconnect'),
};

// BullMQ metrics
export const queueApi = {
  getStats: () => api.get<QueueStats>('/queue/stats'),
};

// Data types

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export interface Sender {
  id: string;
  email: string;
  displayName: string | null;
  createdAt?: string;
}

export interface Email {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  batchId: string | null;
  failureReason: string | null;
  createdAt: string;
  sender?: {
    email: string;
    displayName: string | null;
  };
}

export interface ScheduleEmailRequest {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenEmails: number;
}

export interface ScheduleEmailResponse {
  message: string;
  batchId: string;
  count: number;
  emails: { id: string; recipient: string; scheduledAt: string; status: string }[];
}

export interface EmailListResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResponse {
  total: number;
  hits: Email[];
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  connectedAt: string | null;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export default api;
