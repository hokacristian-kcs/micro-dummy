export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export const SERVICES = {
  USER: 'http://localhost:3001',
  WALLET: 'http://localhost:3002',
  PAYMENT: 'http://localhost:3003',
  NOTIFICATION: 'http://localhost:3004',
  CREDIT: 'http://localhost:3005',
} as const;

export async function callService<T>(url: string, options?: RequestInit): Promise<ServiceResponse<T>> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}
