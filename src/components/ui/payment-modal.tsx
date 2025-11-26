import React, { useState, useEffect } from 'react';
import { Save, Trash2, AlertTriangle, CheckCircle2, CreditCard, Edit } from 'lucide-react';
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
  isLoading?: boolean; // Added to support loading state from mutations
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
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    user: '', // Changed from user_id to user to match backend
    amount: '',
    date: '',
    time: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (payment && (mode === 'edit' || mode === 'delete')) {
      setFormData({
        user: payment.user.toString(),
        amount: payment.amount.toString(),
        date: payment.date,
        time: payment.time,
        notes: payment.notes || ''
      });
    } else {
      // Reset for create mode
      setFormData({
        user: '',
        amount: '',
        date: '',
        time: '',
        notes: ''
      });
    }
    setErrors({});
  }, [payment, mode, isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
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
      transaction_type: 'COLLECT' // Default to COLLECT for manual entries
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              mode === 'create' ? 'bg-green-500' : 
              mode === 'edit' ? 'bg-blue-500' : 'bg-red-500'
            } text-white`}>
              {mode === 'create' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : mode === 'edit' ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </div>
            {mode === 'create' ? 'Record New Payment' : 
             mode === 'edit' ? 'Edit Payment' : 'Delete Payment'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new payment record to the system' :
             mode === 'edit' ? 'Update payment information' :
             'Are you sure you want to delete this payment?'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {mode === 'delete' ? (
            /* Delete Confirmation */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      This action cannot be undone
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      The payment record will be permanently removed from the system.
                    </p>
                  </div>
                </div>
              </div>

              {payment && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Member:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {payment.user_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Date:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {payment.date}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Time:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {payment.time}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Create/Edit Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                {/* Member Selection */}
                <div className="grid gap-2">
                  <Label htmlFor="member" className="text-sm font-medium">
                    Select Member
                  </Label>
                  <Select 
                    value={formData.user} 
                    onValueChange={(value) => handleInputChange('user', value)}
                  >
                    <SelectTrigger className={`h-12 border-slate-300 focus:border-blue-500 ${
                      errors.user ? 'border-red-500' : ''
                    }`}>
                      <SelectValue placeholder="Choose a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()} className="py-3">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium">{user.name || user.username}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              ₹{Number(user.assigned_monthly_amount || 100000).toLocaleString('en-IN')}/target
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.user && (
                    <p className="text-red-600 dark:text-red-400 text-sm">{errors.user}</p>
                  )}
                </div>

                {/* Amount and Date Row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Payment Amount
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400">₹</span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className={`h-12 pl-10 border-slate-300 focus:border-blue-500 ${
                          errors.amount ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-red-600 dark:text-red-400 text-sm">{errors.amount}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      Payment Date
                    </Label>
                    <DatePicker
                      value={formData.date}
                      onChange={(date) => handleInputChange('date', date)}
                      placeholder="Select payment date"
                      error={!!errors.date}
                    />
                    {errors.date && (
                      <p className="text-red-600 dark:text-red-400 text-sm">{errors.date}</p>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="grid gap-2">
                  <Label htmlFor="time" className="text-sm font-medium">
                    Payment Time (Optional)
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="h-12 border-slate-300 focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional information about this payment..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="min-h-[100px] border-slate-300 focus:border-blue-500"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`${
              mode === 'create' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                : mode === 'edit'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
            } text-white`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {mode === 'delete' ? 'Deleting...' : 'Saving...'}
              </>
            ) : (
              <>
                {mode === 'create' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Record Payment
                  </>
                ) : mode === 'edit' ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Payment
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Payment
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;