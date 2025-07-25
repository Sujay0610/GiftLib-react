import axios, { AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  User,
  Gift,
  GiftDataRequest,
  BulkGiftData,
  GiftResponse,
  BulkGiftResponse,
  CampaignResponse,
  StatusUpdate,
  EmailConfig,
  EmailConfigResponse,
  CreateUserForm
} from '@/types';

// API Base URL
const API_BASE_URL = 'https://giftlib-backend.onrender.com';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// Request interceptor to add API key
api.interceptors.request.use(
  (config) => {
    const apiKey = localStorage.getItem('giftlib_api_key');
    if (apiKey && config.headers) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      toast.error('⏰ Request timed out. The server may be overloaded or unresponsive.');
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('🔌 Connection failed. Please check if the backend server is running.');
    } else if (error.response?.status === 401) {
      toast.error('🔐 Unauthorized. Please check your API key.');
    } else if (error.response?.status === 403) {
      toast.error('🚫 Forbidden. You don\'t have permission to access this resource.');
    } else if ((error.response?.status ?? 0) >= 500) {
      toast.error('🔥 Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Helper function to handle API responses
const handleResponse = <T>(response: AxiosResponse<T>): T => {
  return response.data;
};

// Helper function to handle API errors
const handleError = (error: any): never => {
  if (error.response?.data?.detail) {
    throw new Error(error.response.data.detail);
  } else if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  } else if (error.message) {
    throw new Error(error.message);
  } else {
    throw new Error('An unexpected error occurred');
  }
};

// Helper function to transform GiftResponse to Gift
const transformGiftResponse = (giftResponse: GiftResponse): Gift => {
  return {
    gift_id: giftResponse.gift_id,
    recipient_name: giftResponse.recipient_name,
    recipient_email: giftResponse.recipient_email,
    gift_type: giftResponse.gift_type,
    status: giftResponse.status,
    campaign_id: giftResponse.campaign_id,
    verified: giftResponse.verified,
    created_at: giftResponse.created_at,
    updated_at: giftResponse.updated_at,
    recipient: giftResponse.recipient || {
      full_name: giftResponse.recipient_name || '',
      email: giftResponse.recipient_email || ''
    },
    gift: giftResponse.gift || {
      type: giftResponse.gift_type || ''
    },
    meta: giftResponse.meta || {
      campaign_id: giftResponse.campaign_id || ''
    }
  };
};

// API functions
export const apiService = {
  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE_URL}/`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // User management
  async createUser(userData: CreateUserForm): Promise<User> {
    try {
      const formData = new FormData();
      formData.append('email', userData.email);
      formData.append('full_name', userData.full_name);
      if (userData.company_name) {
        formData.append('company_name', userData.company_name);
      }

      const response = await axios.post(`${API_BASE_URL}/api/users`, formData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async getUserProfile(): Promise<User> {
    try {
      const response = await api.get('/api/user/profile');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Gift operations
  async initiateGift(giftData: GiftDataRequest): Promise<{ giftId: string }> {
    try {
      const response = await api.post('/api/initiate-gift', giftData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async bulkInitiateGifts(bulkData: BulkGiftData): Promise<BulkGiftResponse> {
    try {
      const response = await api.post('/api/bulk-initiate-gifts', bulkData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async getAllGifts(limit: number = 1000): Promise<{ success: boolean; gifts: Gift[] }> {
    try {
      const response = await api.get('/api/gifts', { params: { limit } });
      const data = handleResponse(response);
      return {
        ...data,
        gifts: (data.gifts || []).map(transformGiftResponse)
      };
    } catch (error) {
      return handleError(error);
    }
  },

  async getCampaignGifts(campaignId: string): Promise<{ success: boolean; totalGifts: number; gifts: Gift[] }> {
    try {
      const response = await api.get(`/api/campaign-gifts/${campaignId}`);
      const data = handleResponse(response);
      return {
        ...data,
        gifts: (data.gifts || []).map(transformGiftResponse)
      };
    } catch (error) {
      return handleError(error);
    }
  },

  async updateGiftStatus(statusData: StatusUpdate): Promise<any> {
    try {
      const response = await api.put('/api/gift-status', statusData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async getGiftStatus(giftId: string): Promise<{ status: string }> {
    try {
      const response = await api.get(`/api/gift-status/${giftId}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async verifyGift(giftId: string, verified: boolean): Promise<any> {
    try {
      const response = await api.post('/api/verify-gift', {
        giftId,
        verified
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Excel operations
  async downloadExcelTemplate(): Promise<Blob> {
    try {
      const response = await api.get('/api/download-excel-template', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  async uploadExcelFile(file: File, campaignId: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaign_id', campaignId);

      const response = await api.post('/api/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Email configuration
  async getEmailConfig(): Promise<EmailConfigResponse> {
    try {
      const response = await api.get('/api/email-config');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async updateEmailConfig(config: EmailConfig): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('resend_api_key', config.resend_api_key);
      formData.append('from_email', config.from_email);
      if (config.sending_domain) {
        formData.append('sending_domain', config.sending_domain);
      }

      const response = await api.post('/api/email-config', formData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async testEmailConfig(testEmail: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('test_email', testEmail);

      const response = await api.post('/api/email-config/test', formData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Fulfillment configuration
  async getFulfillmentConfig(): Promise<any> {
    try {
      const response = await api.get('/api/fulfillment-config');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async updateFulfillmentConfig(config: { api_url: string; api_key: string }): Promise<any> {
    try {
      const response = await api.post('/api/fulfillment-config', config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  async testFulfillmentConfig(config: { api_url: string; api_key: string }): Promise<any> {
    try {
      const response = await api.post('/api/fulfillment-config/test', config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Utility functions
  setApiKey(apiKey: string) {
    localStorage.setItem('giftlib_api_key', apiKey);
  },

  getApiKey(): string | null {
    return localStorage.getItem('giftlib_api_key');
  },

  removeApiKey() {
    localStorage.removeItem('giftlib_api_key');
  }
};

export default apiService;