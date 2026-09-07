export interface GasRequest<T = any> {
  action: string;
  token?: string;
  payload?: T;
  clientTimestamp: string;
}

export interface GasResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: 'SESSION_EXPIRED' | 'CREDENTIALS_UPDATED' | 'UNAUTHORIZED' | 'LOCK_TIMEOUT' | 'SERVER_ERROR';
}

export class GasApiError extends Error {
  errorCode: string;
  constructor(message: string, errorCode: string = 'SERVER_ERROR') {
    super(message);
    this.name = 'GasApiError';
    this.errorCode = errorCode;
  }
}

const getApiUrl = (): string => {
  return import.meta.env.VITE_GAS_API_URL || '';
};

/**
 * Execute a Simple Request to the Google Apps Script Web App Gateway.
 * Uses Content-Type: text/plain;charset=utf-8 to eliminate CORS preflight (OPTIONS) requests.
 */
export async function callGasApi<TResponse = any, TPayload = any>(
  action: string,
  payload?: TPayload,
  token?: string
): Promise<TResponse> {
  const url = getApiUrl();
  if (!url) {
    throw new GasApiError('Google Apps Script API URL is not configured. Check VITE_GAS_API_URL.', 'CONFIG_ERROR');
  }

  const requestBody: GasRequest<TPayload> = {
    action,
    token,
    payload,
    clientTimestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow', // GAS automatically returns 302 redirects to googleusercontent.com
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new GasApiError(`HTTP error ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
    }

    const result: GasResponse<TResponse> = await response.json();

    if (!result.success) {
      throw new GasApiError(result.error || 'Server returned an unsuccessful response.', result.errorCode || 'SERVER_ERROR');
    }

    return result.data as TResponse;
  } catch (err: any) {
    if (err instanceof GasApiError) {
      throw err;
    }
    // Network failures (offline, DNS, timeout)
    throw new GasApiError(err.message || 'Network communication failure.', 'NETWORK_ERROR');
  }
}

/**
 * Ping the server to check connectivity
 */
export async function pingGasApi(): Promise<boolean> {
  const url = getApiUrl();
  if (!url) return false;

  try {
    const pingUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping`;
    const response = await fetch(pingUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    });
    if (!response.ok) return false;
    const json = await response.json();
    return json && json.success === true;
  } catch {
    return false;
  }
}
