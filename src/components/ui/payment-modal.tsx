import React, { useState, useEffect } from 'react';
import { Save, Trash2, AlertTriangle, CheckCircle2, CreditCard, Edit, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DatePicker from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';

// Types based on your Django Backend
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: any) => void;
  onDelete?: (paymentId: string) => void;
  payment?: any;
  users: any[];
  currentUserName: string;
  mode: 'create' | 'edit' | 'delete';
  isLoading?: boolean;
  transactionType?: 'collect' | 'pay'; // Passed from parent
  approvedRequests?: any[]; // Passed from parent
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  payment,
  users,
  currentUserName,
  mode,
  isLoading = false,
  transactionType = 'collect', // Default to collect
  approvedRequests = []
}) => {
  const [formData, setFormData] = useState({
    user: '',
    amount: '',
    date: '',
    time: '',
    notes: '',
    request_id: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (payment && (mode === 'edit' || mode === 'delete')) {
      setFormData({
        user: payment.user.toString(),
        amount: payment.amount.toString(),
        date: payment.date,
        time: payment.time,
        notes: payment.notes || '',
        request_id: payment.request_id ? payment.request_id.toString() : ''
      });
    } else {
      // Reset for create mode
      setFormData({
        user: '',
        amount: '',
        date: '',
        time: '',
        notes: '',
        request_id: ''
      });
    }
    setErrors({});
  }, [payment, mode, isOpen]);

  // [FIXED LOGIC] Handle Request Selection & Auto-fill Remaining Amount
  const handleRequestSelect = (requestId: string) => {
    const request = approvedRequests.find(r => r.id.toString() === requestId);
    if (request) {
      // Calculate Remaining Balance
      const totalAmount = Number(request.amount);
      const paidSoFar = Number(request.paid_amount || 0);
      const remaining = Math.max(0, totalAmount - paidSoFar);

      setFormData(prev => ({
        ...prev,
        user: request.user.toString(),
        amount: remaining.toString(), // Fill with REMAINING, not TOTAL
        request_id: requestId,
        notes: `Disbursement for Request #${requestId} (${request.reason}). Total: ${totalAmount}, Paid: ${paidSoFar}, Paying: ${remaining}` 
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.user) {
      newErrors.user = 'Please select a member';
    }

    if (!formData.amount) {
      newErrors.amount = 'Please enter the payment amount';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.date) {
      newErrors.date = 'Please select the payment date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'delete') {
      if (onDelete && payment) {
        onDelete(payment.id);
      }
      return;
    }

    if (!validateForm()) {
      return;
    }

    const paymentData = {
      user: formData.user,
      amount: parseFloat(formData.amount),
      date: formData.date,
      time: formData.time || new Date().toTimeString().split(' ')[0],
      notes: formData.notes,
      transaction_type: transactionType === 'pay' ? 'DISBURSE' : 'COLLECT',
      request_id: formData.request_id // Send the linked request ID
    };
    onSave(paymentData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Scrollable Modal Fix */}
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              mode === 'create' ? (transactionType === 'pay' ? 'bg-red-500' : 'bg-green-500') :
              mode === 'edit' ? 'bg-blue-500' : 'bg-red-500'
            } text-white`}>
              {mode === 'create' ? (
                transactionType === 'pay' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />
              ) : mode === 'edit' ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </div>
            {mode === 'create' 
              ? (transactionType === 'pay' ? 'Record Disbursement' : 'Record Collection')
              : mode === 'edit' ? 'Edit Payment' : 'Delete Payment'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? (transactionType === 'pay' ? 'Record a fund payment to a member' : 'Record a fund collection from a member')
              : mode === 'edit' ? 'Update payment information' : 'Are you sure you want to delete this payment?'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {mode === 'delete' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">This action cannot be undone</p>
                    <p className="text-xs text-red-600 dark:text-red-400">The payment record will be permanently removed.</p>
                  </div>
                </div>
              </div>
              {payment && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-slate-500">Member:</span> <p className="font-medium">{payment.user_name}</p></div>
                      <div><span className="text-slate-500">Amount:</span> <p className="font-medium">₹{Number(payment.amount).toLocaleString()}</p></div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                
                {/* Dynamic Dropdown Logic */}
                <div className="grid gap-2">
                  <Label htmlFor="member" className="text-sm font-medium">
                    {transactionType === 'pay' ? 'Select Approved Request' : 'Select Member'}
                  </Label>
                  
                  {transactionType === 'pay' ? (
                    // --- [PAY MODE] Show Approved Requests with Smart Labels ---
                    <Select 
                      value={formData.request_id} 
                      onValueChange={handleRequestSelect} 
                    >
                      <SelectTrigger className={`h-12 border-slate-300 focus:border-blue-500 ${errors.user ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select an approved request..." />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedRequests.length === 0 ? (
                          <div className="p-4 text-sm text-center text-slate-500">
                            No approved requests pending payment.
                          </div>
                        ) : (
                          approvedRequests.map(req => {
                            const total = Number(req.amount);
                            const paid = Number(req.paid_amount || 0);
                            const remaining = Math.max(0, total - paid);
                            const isPartial = paid > 0;

                            return (
                              <SelectItem key={req.id} value={req.id.toString()} className="py-3">
                                <div className="flex flex-col w-full gap-1">
                                  <div className="flex justify-between items-center w-full gap-4">
                                    <span className="font-medium">{req.user_name}</span>
                                    {/* [FIXED] Show Remaining Amount in Badge */}
                                    <Badge variant="outline" className={`${remaining === 0 ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'} border-green-200`}>
                                       ₹{remaining.toLocaleString('en-IN')} Due
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-slate-500 flex justify-between">
                                    <span>{req.reason}</span>
                                    {/* Show breakdown of total vs paid */}
                                    <span className="text-[10px] text-slate-400">
                                      (Total: ₹{total.toLocaleString()} | Paid: ₹{paid.toLocaleString()})
                                    </span>
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    // --- [COLLECT MODE] Show All Members ---
                    <Select 
                      value={formData.user} 
                      onValueChange={(value) => handleInputChange('user', value)}
                    >
                      <SelectTrigger className={`h-12 border-slate-300 focus:border-blue-500 ${errors.user ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Choose a member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()} className="py-3">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-medium">{user.name || user.username}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                ₹{Number(user.assigned_monthly_amount || 0).toLocaleString('en-IN')}/target
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {errors.user && <p className="text-red-600 text-sm">{errors.user}</p>}
                </div>

                {/* Amount and Date */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="amount" className="text-sm font-medium">Payment Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">₹</span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className={`h-12 pl-10 border-slate-300 focus:border-blue-500 ${errors.amount ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.amount && <p className="text-red-600 text-sm">{errors.amount}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date" className="text-sm font-medium">Payment Date</Label>
                    <DatePicker
                      value={formData.date}
                      onChange={(date) => handleInputChange('date', date)}
                      placeholder="Select date"
                      error={!!errors.date}
                    />
                    {errors.date && <p className="text-red-600 text-sm">{errors.date}</p>}
                  </div>
                </div>

                {/* Time */}
                <div className="grid gap-2">
                  <Label htmlFor="time" className="text-sm font-medium">Time (Optional)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="h-12 border-slate-300"
                  />
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add details..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="min-h-[100px] border-slate-300"
                  />
                </div>
              </div>
              
              <button type="submit" className="hidden" />
            </form>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit} 
            disabled={isLoading}
            className={`${
              mode === 'delete' ? 'bg-red-600 hover:bg-red-700' :
              transactionType === 'pay' ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700' : 
              'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700'
            } text-white`}
          >
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Processing...</>
            ) : (
              <>
                {mode === 'delete' ? <><Trash2 className="h-4 w-4 mr-2" /> Delete</> : 
                 transactionType === 'pay' ? <><ArrowUpCircle className="h-4 w-4 mr-2" /> Record Disbursement</> :
                 <><ArrowDownCircle className="h-4 w-4 mr-2" /> Record Collection</>}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;