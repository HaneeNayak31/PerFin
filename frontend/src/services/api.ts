import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * The session lives in an httpOnly cookie set by the API, so page scripts
 * never see the token. `withCredentials` tells the browser to send it.
 */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30_000,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const onAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/login');
    if (error.response?.status === 401 && typeof window !== 'undefined' && !onAuthPage) {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  message?: string;
  details?: unknown;
}

/** A readable message for any failed API call. */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Cannot reach the server. Is the backend running?';
    const { message, details } = error.response.data ?? {};
    if (Array.isArray(details) && details.length > 0) return details.join('. ');
    if (message) return message;
    return `Request failed (${error.response.status})`;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
