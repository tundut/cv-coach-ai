import type { ApiResponse } from '@cv-coach/shared';
import { config } from '../config.js';
import { tokenStorage } from '../lib/token-storage.js';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    // Gắn Authorization header nếu có token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = tokenStorage.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string>),
      },
    });

    // Token hết hạn → clear và trả error
    if (response.status === 401) {
      tokenStorage.clear();
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return {
        success: false,
        error: {
          code: errorBody?.error?.code ?? `HTTP_${response.status}`,
          message: errorBody?.error?.message ?? response.statusText,
          details: errorBody?.error?.details,
        },
      };
    }

    return response.json();
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(config.apiBaseUrl);
