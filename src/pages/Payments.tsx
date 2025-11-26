import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/ui/date-picker';
import PaymentModal from '@/components/ui/payment-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, History, User, DollarSign, Calendar, FileText, 
  CheckCircle2, AlertCircle, Edit, Trash2, MoreHorizontal, 
  TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPayments, fetchAvailableMembers, createPayment, updatePayment, deletePayment } from '@/services/payments';
import { fetchUsers } from '@/services/users';
import { fetchDashboardStats } from '@/services/dashboard';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';



const Payments = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // --- STATE ---
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'collect' | 'pay'>('collect');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete'>('create');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // --- DATA FETCHING ---
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: fetchPayments,
  });

  const { data: availableMembers = [] } = useQuery({
    queryKey: ['availableMembers'],
    queryFn: fetchAvailableMembers,
    enabled: currentUser?.role !== 'member',
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: !!currentUser,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    enabled: !!currentUser,
  });

  const userPhotos = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(allUsers)) {
        allUsers.forEach((u: any) => {
            if (u.profile_photo) map[u.id] = u.profile_photo;
        });
    }
    return map;
  }, [allUsers]);

  // Helper: Calculate Dynamic Target
  const getMemberTarget = (member: any) => {
    const assigned = Number(member.assigned_monthly_amount);
    // If assigned > 0, use specific target. Otherwise use system dynamic target.
    return assigned > 0 ? assigned : (dashboardStats?.system_target || 5000);
  };

  // Helper: Calculate Total Collected Amount for a Member
  const getMemberTotalCollected = (memberId: string) => {
    if (!payments || !Array.isArray(payments)) return 0;
    
    return payments
      .filter((p: any) => 
        p.user.toString() === memberId.toString() && 
        p.transaction_type === 'COLLECT'
      )
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
  };

  // Helper: Calculate Remaining Amount to Collect for a Member
  const getMemberRemainingToCollect = (member: any) => {
    const target = getMemberTarget(member);
    const collected = getMemberTotalCollected(member.id);
    return Math.max(0, target - collected);
  };

  // Helper: Format Time properly (e.g. 2:30 PM)
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "--";
    try {
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours, 10);
      const m = parseInt(minutes, 10);
      if (isNaN(h) || isNaN(m)) return timeStr;
      
      const suffix = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 || 12;
      return `${formattedHour}:${m.toString().padStart(2, '0')} ${suffix}`;
    } catch (e) {
      return timeStr;
    }
  };

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async () => {
      // 1. Refresh Data
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      
      // 2. Clear form inputs
      setSelectedMember('');
      setAmount('');
      setPaymentDate('');
      setNotes('');
      setErrors({});
      
      // 3. Show Success UI
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      toast({ 
        title: "Payment Recorded", 
        description: "The payment has been added to the history below.",
        className: "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Failed to record payment", 
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePayment(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsModalOpen(false);
      toast({ title: "Success", description: "Payment updated successfully" });
    },
    onError: (error: any) => {
       toast({ title: "Error", description: "Failed to update payment", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsModalOpen(false);
      toast({ title: "Deleted", description: "Payment deleted successfully" });
    },
    onError: (error: any) => {
        toast({ title: "Error", description: "Failed to delete payment", variant: "destructive" });
     }
  });

  // --- HANDLERS ---
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (!selectedMember && currentUser?.role !== 'member') newErrors.member = "Please select a member";
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Amount must be greater than 0";
    if (!paymentDate) newErrors.date = "Please select the payment date";
    if (!paymentType) newErrors.paymentType = "Please select payment type";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate({
      user: selectedMember || currentUser?.id,
      amount: parseFloat(amount),
      date: paymentDate,
      transaction_type: paymentType === 'collect' ? 'COLLECT' : 'DISBURSE',
      notes: notes,
      time: new Date().toTimeString().split(' ')[0],
    });
  };

  // CRUD Handlers
  const handleEditPayment = (payment: any) => {
    setModalMode('edit');
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleDeletePayment = (payment: any) => {
    setModalMode('delete');
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleModalSave = (data: any) => {
    if (modalMode === 'edit' && selectedPayment) {
      updateMutation.mutate({ id: selectedPayment.id, data });
    }
  };

  const handleModalDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
  };

  // Ensure responsible members can only collect payments
  useEffect(() => {
    if (currentUser?.role === 'responsible_member' && paymentType === 'pay') {
      setPaymentType('collect');
    }
  }, [currentUser?.role, paymentType]);

  // --- STATISTICS ---
  const stats = useMemo(() => {
    const total = payments.length;
    const collected = payments
      .filter((p: any) => p.transaction_type === 'COLLECT')
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
      
    const paid = payments
      .filter((p: any) => p.transaction_type === 'DISBURSE')
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    
    const now = new Date();
    const thisMonthPayments = payments.filter((p: any) => {
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const thisMonthCount = thisMonthPayments.length;
    const thisMonthTotal = thisMonthPayments.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const average = total > 0 ? (collected + paid) / total : 0;

    return { total, collected, paid, thisMonthCount, thisMonthTotal, average };
  }, [payments]);

  if (authLoading || paymentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Record and view payment history</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500 text-white flex-shrink-0"><History className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Total Payments</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-green-500 text-white flex-shrink-0"><ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Collected Amount</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100">₹{stats.collected.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-red-500 text-white flex-shrink-0"><ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Paid Amount</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-900 dark:text-red-100">₹{stats.paid.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500 text-white flex-shrink-0"><Calendar className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">This Month</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.thisMonthCount}</p>
                <p className="text-xs text-purple-500 dark:text-purple-400">₹{stats.thisMonthTotal.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-500 text-white flex-shrink-0"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400">Average Payment</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 dark:text-orange-100">₹{stats.average.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500 text-white flex-shrink-0"><Wallet className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Net Balance</p>
                <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${(stats.collected - stats.paid) >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  ₹{(stats.collected - stats.paid).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400">{(stats.collected - stats.paid) >= 0 ? 'Surplus' : 'Deficit'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Form - Visible to Admin & Responsible Member */}
      {(currentUser.role === 'admin' || currentUser.role === 'responsible_member') && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Plus className="h-5 w-5" />
              </div>
              Record New Payment
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              {currentUser.role === 'admin' 
                ? 'Record collections from members or disbursements to approved members' 
                : 'Record collections from your assigned members'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            
            {/* Success Message Banner */}
            {showSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-1.5 rounded-full bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {paymentType === 'collect' ? 'Collection' : 'Payment'} recorded successfully!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    The {paymentType === 'collect' ? 'collection' : 'payment'} has been added to the system records.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-6">
              {currentUser.role === 'admin' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Payment Type
                  </Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="collect" name="paymentType" value="collect" checked={paymentType === 'collect'} onChange={() => setPaymentType('collect')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                      <Label htmlFor="collect" className="flex items-center gap-2 cursor-pointer">
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Collect</span>
                        <span className="text-xs text-slate-500">(Receive)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="pay" name="paymentType" value="pay" checked={paymentType === 'pay'} onChange={() => setPaymentType('pay')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                      <Label htmlFor="pay" className="flex items-center gap-2 cursor-pointer">
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Pay</span>
                        <span className="text-xs text-slate-500">(Disburse)</span>
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {currentUser.role !== 'admin' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Payment Type
                  </Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <ArrowDownCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">Collect Payment</span>
                      <p className="text-xs text-green-600 dark:text-green-400">Receive payment from member</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="member" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User className="h-4 w-4" /> Select Member
                </Label>
                <Select value={selectedMember} onValueChange={(value) => {
                  setSelectedMember(value);
                  if (errors.member) setErrors(prev => ({ ...prev, member: '' }));
                }}>
                  <SelectTrigger className={`w-full h-12 px-4 border-2 transition-all duration-200 ${errors.member ? 'border-red-300' : 'border-slate-300'}`}>
                    <SelectValue placeholder="Choose a member to record payment for" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                    {availableMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id.toString()} className="py-3">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-medium">{m.name || m.username}</span>
                          {/* Remaining to collect / target */}
                          <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">
                            ₹{getMemberRemainingToCollect(m).toLocaleString('en-IN')}/₹{getMemberTarget(m).toLocaleString('en-IN')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.member && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />{errors.member}</div>}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Payment Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">₹</span>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                      }} 
                      className={`h-12 pl-10 pr-4 border-2 ${errors.amount ? 'border-red-300' : 'border-slate-300'}`} 
                    />
                  </div>
                  {errors.amount && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />{errors.amount}</div>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Payment Date
                  </Label>
                  <DatePicker 
                    value={paymentDate} 
                    onChange={(date) => {
                      setPaymentDate(date);
                      if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                    }} 
                    placeholder="Select payment date" 
                    error={!!errors.date}
                  />
                  {errors.date && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />{errors.date}</div>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Additional Notes (Optional)
                </Label>
                <Textarea 
                  id="notes" 
                  placeholder="Add any additional information..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="min-h-[100px] border-2 border-slate-300 focus:border-blue-500" 
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || showSuccess} 
                  className={`w-full h-14 text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-300 ${
                    showSuccess 
                      ? 'bg-green-600 hover:bg-green-700 scale-105' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {createMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      {/* Custom CSS Spinner exactly like your snippet */}
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {currentUser.role === 'admin' 
                        ? `Recording ${paymentType === 'collect' ? 'Collection' : 'Payment'}...`
                        : 'Recording Collection...'
                      }
                    </div>
                  ) : showSuccess ? (
                    <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                      <CheckCircle2 className="h-6 w-6" />
                      Payment Saved!
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {currentUser.role === 'admin' ? (
                        paymentType === 'collect' ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />
                      ) : <ArrowDownCircle className="h-5 w-5" />}
                      Record {paymentType === 'collect' ? 'Collection' : 'Payment'}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payment History Table */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-slate-500 text-white">
              <History className="h-5 w-5" />
            </div>
            Payment History
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">Complete transaction log with timestamps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Date</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100 hidden sm:table-cell">Time</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Member</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Type</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100 hidden md:table-cell">Recorded By</TableHead>
                  {currentUser.role === 'admin' && (
                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100 w-12">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentUser.role === 'admin' ? 7 : 6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800"><History className="h-6 w-6 text-slate-400" /></div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No payment records found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment: any) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-500">
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{payment.date}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        {formatTime(payment.time)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userPhotos[payment.user]} alt={payment.user_name} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          {payment.user_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 ${payment.transaction_type === 'COLLECT' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'}`}>
                          {payment.transaction_type === 'COLLECT' ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                          {payment.transaction_type === 'COLLECT' ? 'Collect' : 'Pay'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">₹{Number(payment.amount).toLocaleString('en-IN')}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {payment.recorded_by_name || payment.recorded_by_username || (payment.recorded_by_role === 'admin' ? 'Admin' : 'Unknown')}
                      </TableCell>
                      {currentUser.role === 'admin' && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEditPayment(payment)}><Edit className="h-4 w-4 mr-2" /> Edit Payment</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600 dark:text-red-400"><Trash2 className="h-4 w-4 mr-2" /> Delete Payment</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        payment={selectedPayment}
        users={availableMembers}
        currentUserName={currentUser.name}
        mode={modalMode}
        isLoading={updateMutation.isPending || deleteMutation.isPending}
      />
    </div>
  );
};

export default Payments;