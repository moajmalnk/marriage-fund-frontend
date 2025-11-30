import api from '@/lib/api';

// Fetch all wallet transactions for the current user
export const fetchWalletTransactions = async () => {
  const response = await api.get('/wallet-transactions/');
  return response.data;
};

// Create a new wallet deposit
export const createWalletDeposit = async (data: {
  amount: number;
  payment_method: string;
  transaction_id: string;
  notes?: string;
}) => {
  const response = await api.post('/wallet-transactions/', {
    amount: data.amount,
    payment_method: data.payment_method,
    transaction_id: data.transaction_id,
    notes: data.notes || '',
    transaction_type: 'DEPOSIT'
  });
  return response.data;
};

// Create a wallet withdrawal (if needed in future)
export const createWalletWithdrawal = async (data: {
  amount: number;
  payment_method: string;
  transaction_id: string;
  notes?: string;
}) => {
  const response = await api.post('/wallet-transactions/', {
    amount: data.amount,
    payment_method: data.payment_method,
    transaction_id: data.transaction_id,
    notes: data.notes || '',
    transaction_type: 'WITHDRAWAL'
  });
  return response.data;
};

export const approveWalletTransaction = async (id: string) => {
  const response = await api.post(`/wallet-transactions/${id}/approve/`);
  return response.data;
};

// Reject a deposit
export const rejectWalletTransaction = async (id: string) => {
  const response = await api.post(`/wallet-transactions/${id}/reject/`);
  return response.data;
};