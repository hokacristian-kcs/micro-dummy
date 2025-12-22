// Shared types untuk komunikasi antar service
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  method: 'qris' | 'transfer';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
}

export interface Credit {
  id: string;
  userId: string;
  amount: number;
  status: 'active' | 'paid' | 'overdue';
}
