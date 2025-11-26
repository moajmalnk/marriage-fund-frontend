export type UserRole = 'admin' | 'responsible_member' | 'member';

export type MaritalStatus = 'Married' | 'Unmarried';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  marital_status: MaritalStatus;
  assigned_monthly_amount: number;
  responsible_member_id?: string;
  responsible_member_name?: string;
  email?: string;
  phone?: string;
  profile_photo?: string;
  date_joined?: string;
}

export interface Payment {
  id: string;
  user: string;
  user_name: string;
  amount: number;
  date: string;
  time: string;
  recorded_by: string;
  recorded_by_name: string;
  transaction_type: 'COLLECT' | 'DISBURSE';
  notes?: string;
  created_at: string;
}

export interface FundRequest {
  id: string;
  user: string;
  user_name: string;
  amount: number;
  reason: string;
  detailed_reason: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  requested_date: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  scheduled_payment_date?: string;
  payment_status?: 'PENDING' | 'PARTIAL' | 'PAID';
  paid_amount?: number;
}

export interface Notification {
  id: string;
  user: string;
  title: string;
  message: string;
  notification_type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'PAYMENT' | 'WEDDING' | 'ANNOUNCEMENT';
  is_read: boolean;
  created_at: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  related_object_id?: number;
  related_object_type?: string;
  has_acknowledged_terms?: boolean;
}