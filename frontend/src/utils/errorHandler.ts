// frontend/src/utils/errorHandler.ts
import { AxiosError } from 'axios';

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  timestamp?: string;
}

export const handleApiError = (error: AxiosError<ApiError>) => {
  if (error.response) {
    // Server responded with error
    const { data, status } = error.response;
    
    switch (status) {
      case 400:
        return data.message || 'Bad Request';
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'Forbidden. You don\'t have permission.';
      case 404:
        return 'Not found.';
      case 422:
        return data.errors?.join(', ') || data.message || 'Validation Error';
      case 500:
        return 'Internal Server Error. Please try again later.';
      case 503:
        return 'Service Unavailable. Please try again later.';
      default:
        return data.message || 'An error occurred';
    }
  } else if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};