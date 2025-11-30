import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  FileText, CheckCircle, XCircle, Clock, TrendingUp, Users, 
  DollarSign, MessageSquare, Timer, CreditCard, AlertCircle, Heart, FileCheck, 
  Wallet
} from 'lucide-react';
import DatePicker from '@/components/ui/date-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFundRequests, approveFundRequest, declineFundRequest, createFundRequest } from '@/services/fundRequests';
import { fetchUsers } from '@/services/users';
import { createWalletDeposit } from '@/services/wallet';
import { toast } from '@/hooks/use-toast';
import { fetchDashboardStats } from '@/services/dashboard';

// Get the API base URL to properly construct media URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Function to fix profile photo URLs
const fixProfilePhotoUrl = (photoUrl: string) => {
  if (photoUrl && photoUrl.startsWith('/media/')) {
    // Prepend the backend base URL to make it a full URL
    return `${BACKEND_BASE_URL}${photoUrl}`;
  }
  return photoUrl;
};

const FundRequests = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // --- STATE ---
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Terms of Use State
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [hasAcknowledgedTerms, setHasAcknowledgedTerms] = useState(false);
  
  // Selection & Actions
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [declineReason, setDeclineReason] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showFundRequestModal, setShowFundRequestModal] = useState(false);

  // Wallet Form Data
  const [walletFormData, setWalletFormData] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: ''
  });
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    detailedReason: ''
  });

    const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    enabled: !!currentUser,
  });

  // Calculate Max Loan Amount (System Target)
  // Default to 120,000 if not yet loaded to prevent UI flicker with 0
  const maxAmount = dashboardStats?.system_target || 120000;

  // --- INIT ---
  useEffect(() => {
    const acknowledged = localStorage.getItem('cbms-terms-acknowledged');
    setHasAcknowledgedTerms(acknowledged === 'true');
  }, []);

  // --- DATA FETCHING (REAL API) ---
  
  // 1. Fetch Fund Requests
  const { data: requests = [], isLoading: dataLoading } = useQuery({
    queryKey: ['fundRequests'],
    queryFn: fetchFundRequests,
    enabled: !!currentUser,
  });

  // 2. Fetch Users (for Profile Photos)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: !!currentUser,
  });

  // Map user IDs to profile photos
  const userPhotos = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(allUsers)) {
        allUsers.forEach((u: any) => {
            if (u.profile_photo) map[u.id] = fixProfilePhotoUrl(u.profile_photo);
        });
    }
    return map;
  }, [allUsers]);

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: createFundRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowCreateModal(false);
      setFormData({ amount: '', reason: '', detailedReason: '' });
      toast({ 
        title: "Success", 
        description: "Fund request submitted successfully",
        className: "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Failed to submit request", 
        variant: "destructive" 
      });
    }
  });

  const approveMutation = useMutation({
    mutationFn: approveFundRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }); 
      closeModals();
      toast({ title: "Approved", description: "Fund request approved and payment scheduled." });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve request", variant: "destructive" })
  });

  const declineMutation = useMutation({
    mutationFn: declineFundRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundRequests'] });
      closeModals();
      toast({ title: "Declined", description: "Fund request declined" });
    },
    onError: () => toast({ title: "Error", description: "Failed to decline request", variant: "destructive" })
  });

  // Wallet deposit mutation
  const walletDepositMutation = useMutation({
    mutationFn: createWalletDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      
      // Reset form and close modal
      setWalletFormData({
        amount: '',
        paymentMethod: 'bank_transfer',
        transactionId: '',
        notes: ''
      });
      setShowWalletModal(false);
      setIsSubmittingWallet(false);
      
      toast({ 
        title: "Success", 
        description: "Wallet deposit request submitted successfully!",
        className: "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800"
      });
    },
    onError: (error: any) => {
      setIsSubmittingWallet(false);
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Failed to submit wallet deposit", 
        variant: "destructive" 
      });
    }
  });

  // --- HANDLERS ---

  // Logic copied from Team.tsx: Check terms before opening Create Modal
  const handleFundRequestClick = useCallback(() => {
    if (!hasAcknowledgedTerms) {
      setShowTermsDialog(true);
    } else {
      setShowCreateModal(true);
    }
  }, [hasAcknowledgedTerms]);

  const handleTermsAcknowledgment = useCallback(() => {
    localStorage.setItem('cbms-terms-acknowledged', 'true');
    setHasAcknowledgedTerms(true);
    setShowTermsDialog(false);
    // Auto open request modal after accepting terms
    setShowCreateModal(true);
  }, []);

  // Wallet handlers
  const handleWalletInputChange = (field: string, value: string) => {
    setWalletFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWallet(true);

    try {
      // Validate required fields
      if (!walletFormData.amount || !walletFormData.transactionId) {
        throw new Error("Amount and Transaction ID are required");
      }

      await walletDepositMutation.mutateAsync({
        amount: parseFloat(walletFormData.amount),
        payment_method: walletFormData.paymentMethod,
        transaction_id: walletFormData.transactionId,
        notes: walletFormData.notes
      });
    } catch (error) {
      console.error('Error submitting wallet deposit:', error);
      setIsSubmittingWallet(false);
    }
  };

  const closeModals = () => {
    setShowApproveModal(false);
    setShowDeclineModal(false);
    setSelectedRequest(null);
    setPaymentDate(undefined);
    setDeclineReason('');
  };

  const handleCreateSubmit = () => {
    if (!formData.amount || !formData.reason || !formData.detailedReason) return;
    createMutation.mutate({
      amount: parseFloat(formData.amount),
      reason: formData.reason,
      detailed_reason: formData.detailedReason
    });
  };

  const handleApproveRequest = (request: any) => {
    setSelectedRequest(request);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 45);
    setPaymentDate(defaultDate);
    setShowApproveModal(true);
  };

  const handleDeclineRequest = (request: any) => {
    setSelectedRequest(request);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const processApproval = () => {
    if (!selectedRequest || !paymentDate) return;
    approveMutation.mutate({
      id: selectedRequest.id,
      paymentDate: paymentDate.toISOString().split('T')[0]
    });
  };

  const processDecline = () => {
    if (!selectedRequest || !declineReason.trim()) return;
    declineMutation.mutate({
      id: selectedRequest.id,
      reason: declineReason
    });
  };

  // --- HELPERS ---
  const getRemainingDays = (dateString: string) => {
    const today = new Date();
    const payment = new Date(dateString);
    const diffTime = payment.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const normalizeStatus = (status: string) => status?.toLowerCase() || 'pending';

  const getStatusBadge = (request: any) => {
    const status = normalizeStatus(request.status);
    const paymentStatus = normalizeStatus(request.payment_status);

    if (status === 'approved') {
      if (paymentStatus === 'paid') {
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid (₹{Number(request.paid_amount || request.amount).toLocaleString('en-IN')})
          </Badge>
        );
      } else if (paymentStatus === 'partial') {
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
            <CreditCard className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        );
      } else {
        const remainingDays = request.scheduled_payment_date ? getRemainingDays(request.scheduled_payment_date) : 0;
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            <Timer className="mr-1 h-3 w-3" />
            {remainingDays > 0 ? `${remainingDays} days left` : 'Due'}
          </Badge>
        );
      }
    } else if (status === 'declined') {
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Declined</Badge>;
    } else {
      return <Badge variant="outline" className="border-primary text-primary"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
    }
  };

  // --- STATISTICS ---
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r: any) => normalizeStatus(r.status) === 'pending').length;
  const approvedRequests = requests.filter((r: any) => normalizeStatus(r.status) === 'approved').length;
  const declinedRequests = requests.filter((r: any) => normalizeStatus(r.status) === 'declined').length;
  
  const totalRequestedAmount = requests.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  
  const approvedAmount = requests
    .filter((r: any) => normalizeStatus(r.status) === 'approved')
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    
  const pendingAmount = requests
    .filter((r: any) => normalizeStatus(r.status) === 'pending')
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  // Filter requests for table
  const filteredRequests = useMemo(() => {
    let data = [...requests];
    if (activeTab === 'my') {
      data = data.filter((r: any) => String(r.user) === String(currentUser?.id));
    }
    return data.sort((a: any, b: any) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime());
  }, [requests, activeTab, currentUser?.id]);

  // Roles Check
  const canManageRequests = currentUser?.role === 'admin' || currentUser?.role === 'responsible_member';
  const isAdmin = currentUser?.role === 'admin';

   // Check if user can request funds or deposit to wallet
  const canRequestFunds = currentUser.role === 'member' || currentUser.role === 'responsible_member';
  const canDepositWallet = currentUser.role === 'member' || currentUser.role === 'responsible_member';


  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fund Requests</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Request and manage fund disbursements</p>
        </div>
      </div>

         {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {canRequestFunds && (
                  <Dialog open={showFundRequestModal} onOpenChange={setShowFundRequestModal}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={handleFundRequestClick}
                        size="lg"
                        className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Heart className="h-5 w-5 mr-2 relative z-10" />
                        <span className="relative z-10 font-semibold">Request Fund</span>
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                )}
                {canDepositWallet && (
                  <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
                    <DialogTrigger asChild>
                      <Button 
                        size="lg"
                        variant="outline"
                        className="group relative overflow-hidden border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Wallet className="h-5 w-5 mr-2 relative z-10" />
                        <span className="relative z-10 font-semibold">Deposit Wallet</span>
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                )}
            </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500 text-white flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Total Requests</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-100">{totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-green-500 text-white flex-shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Approved</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100">{approvedRequests}</p>
                <p className="text-xs text-green-500 dark:text-green-400">₹{approvedAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-500 text-white flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400">Pending</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 dark:text-orange-100">{pendingRequests}</p>
                <p className="text-xs text-orange-500 dark:text-orange-400">₹{pendingAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-red-500 text-white flex-shrink-0">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Declined</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-900 dark:text-red-100">{declinedRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500 text-white flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">Total Requested</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100">₹{totalRequestedAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500 text-white flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-cyan-600 dark:text-cyan-400">Approval Rate</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                  {totalRequests > 0 ? ((approvedRequests / totalRequests) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      {canManageRequests && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'my')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger 
              value="all" 
              className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100"
            >
              All Requests
            </TabsTrigger>
            <TabsTrigger 
              value="my" 
              className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100"
            >
              My Requests
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Requests Table */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-slate-500 text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            {activeTab === 'all' ? 'All Fund Requests' : 'My Fund Requests'}
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">
            Review and manage fund assistance requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Member</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100 hidden sm:table-cell">Reason</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Request Date</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Status</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100 hidden md:table-cell">Payment Info</TableHead>
                  {isAdmin && (
                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100 w-12 text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                          <FileText className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No fund requests found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request: any) => (
                    <TableRow key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userPhotos[request.user]} alt={request.user_name} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{request.user_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{request.reason}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                          ₹{Number(request.amount).toLocaleString('en-IN')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs hidden sm:table-cell">
                        <p className="truncate text-slate-700 dark:text-slate-300" title={request.reason}>
                          {request.reason}
                        </p>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {new Date(request.requested_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>{getStatusBadge(request)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {normalizeStatus(request.status) === 'approved' && request.scheduled_payment_date ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Due: {new Date(request.scheduled_payment_date).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </TableCell>
                      
                      {isAdmin && (
                        <TableCell className="text-right">
                          {normalizeStatus(request.status) === 'pending' ? (
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                                onClick={() => handleApproveRequest(request)}
                              >
                                <CheckCircle className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Approve</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                                onClick={() => handleDeclineRequest(request)}
                              >
                                <XCircle className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Decline</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                              {request.status.toLowerCase()}
                            </span>
                          )}
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

      {/* Create Request Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Heart className="h-5 w-5" />
              </div>
              Request Fund
            </DialogTitle>
            <DialogDescription>
              Submit a request for marriage fund assistance from the community.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fund-amount" className="text-sm font-medium">Requested Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400">₹</span>
                <Input
                  id="fund-amount"
                  type="number"
                  placeholder={`Enter amount (max ₹${maxAmount.toLocaleString('en-IN')})`}
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="h-12 pl-10 border-slate-300 focus:border-blue-500"
                  min="1"
                  max={maxAmount}
                />
              </div>
               <p className="text-xs text-slate-500 dark:text-slate-400">
                  Maximum amount per request: ₹{maxAmount.toLocaleString('en-IN')}
                </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fund-reason" className="text-sm font-medium">Reason for Request</Label>
              <Select 
                value={formData.reason} 
                onValueChange={(val) => setFormData({...formData, reason: val})}
              >
                <SelectTrigger className="h-12 border-slate-300 focus:border-blue-500">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Marriage">Marriage Expenses</SelectItem>
                  <SelectItem value="Medical">Medical Emergency</SelectItem>
                  <SelectItem value="Education">Education Expenses</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fund-detailed-reason" className="text-sm font-medium">Detailed Explanation</Label>
              <Textarea 
                id="fund-detailed-reason"
                placeholder="Please provide detailed information about your fund request..." 
                value={formData.detailedReason} 
                onChange={(e) => setFormData({...formData, detailedReason: e.target.value})}
                className="min-h-[100px] border-slate-300 focus:border-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={createMutation.isPending}>Cancel</Button>
            <Button 
              onClick={handleCreateSubmit} 
              disabled={createMutation.isPending || !formData.amount || !formData.reason} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
               {createMutation.isPending  ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Request Dialog */}
      <Dialog open={showApproveModal} onOpenChange={closeModals}>
       <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <CheckCircle className="h-5 w-5" />
              </div>
              Approve Fund Request
            </DialogTitle>
            <DialogDescription>
              Schedule payment for {selectedRequest?.user_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Request Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Member:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{selectedRequest?.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ₹{Number(selectedRequest?.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Reason:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedRequest?.reason}</span>
                  </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-date" className="text-sm font-medium">Payment Date</Label>
              <DatePicker 
                value={paymentDate ? paymentDate.toISOString().split('T')[0] : ''}
                onChange={(dateString) => setPaymentDate(new Date(dateString))}
                placeholder="Select payment date"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Payment will be scheduled for the selected date (typically 45 days from approval)
              </p>
            </div>
              {/* Approval Notice */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Approval Notice</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      This will approve the fund request and schedule payment. The member will be notified of the approval and payment date.
                    </p>
                  </div>
                </div>
              </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModals} disabled={approveMutation.isPending}>Cancel</Button>
            <Button 
              onClick={processApproval} 
              disabled={approveMutation.isPending || !paymentDate}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {approveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Request Dialog */}
      <Dialog open={showDeclineModal} onOpenChange={closeModals}>
       <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <XCircle className="h-5 w-5" />
              </div>
              Decline Fund Request
            </DialogTitle>
            <DialogDescription>
              Provide reason for declining {selectedRequest?.user_name}'s request
            </DialogDescription>
          </DialogHeader>
          
            <div className="grid gap-4 py-4">
            <div className="grid gap-4">
              {/* Request Details */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Request Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Member:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedRequest?.user_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      ₹{selectedRequest?.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Reason:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedRequest?.reason}</span>
                  </div>
                </div>
              </div>

              {/* Decline Reason */}
              <div className="grid gap-2">
                <Label htmlFor="decline-reason" className="text-sm font-medium">
                  Reason for Declining *
                </Label>
                <Textarea
                  id="decline-reason"
                  placeholder="Please provide a clear reason for declining this fund request..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="min-h-[100px] border-slate-300 focus:border-red-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This reason will be shared with the member
                </p>
              </div>

              {/* Decline Notice */}
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-900 dark:text-red-100 mb-1">Decline Notice</p>
                    <p className="text-red-700 dark:text-red-300">
                      This will decline the fund request. The member will be notified with the reason provided.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModals} disabled={declineMutation.isPending}>Cancel</Button>
            <Button 
              onClick={processDecline} 
              disabled={declineMutation.isPending || !declineReason.trim()}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
            >
               {declineMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms of Use Dialog */}
            <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
              <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-2xl mx-2 sm:mx-4 h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-500 text-white">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    Terms of Use Required
                  </DialogTitle>
                  <DialogDescription>
                    You must acknowledge the Terms of Use before requesting funds
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          Terms of Use Required
                        </h4>
                        <p className="text-amber-800 dark:text-amber-200 text-sm">
                          Before you can request funds from the CBMS Marriage Fund, you must read and acknowledge our Terms of Use. 
                          This ensures you understand the rules, responsibilities, and procedures of the fund.
                        </p>
                      </div>
                    </div>
                  </div>
      
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Key Points from Terms of Use:
                    </h4>
                    <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      <li>• Each member contributes ₹5,000 per marriage</li>
                      <li>• 45-day advance notice required for marriage</li>
                      <li>• Payment due one week before marriage</li>
                      <li>• Fund disbursement on marriage day or day before</li>
                      <li>• One-month grace period for late payments</li>
                      <li>• All transactions must be recorded and verified</li>
                    </ul>
                  </div>
                </div>
      
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowTermsDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTermsAcknowledgment}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    I Acknowledge & Accept Terms
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      {/* Wallet Deposit Dialog */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <Wallet className="h-5 w-5" />
              </div>
              Deposit to Wallet
            </DialogTitle>
            <DialogDescription>
              Add funds to your personal wallet for future use.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wallet-amount" className="text-sm font-medium">
                  Deposit Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400">₹</span>
                  <Input
                    id="wallet-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={walletFormData.amount}
                    onChange={(e) => handleWalletInputChange('amount', e.target.value)}
                    className="h-12 pl-10 border-slate-300 focus:border-green-500"
                    required
                    min="1"
                    disabled={isSubmittingWallet}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wallet-payment-method" className="text-sm font-medium">
                  Payment Method
                </Label>
                <Select
                  value={walletFormData.paymentMethod}
                  onValueChange={(value) => handleWalletInputChange('paymentMethod', value)}
                  disabled={isSubmittingWallet}
                >
                  <SelectTrigger className="h-12 border-slate-300 focus:border-green-500">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI Payment</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="net_banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wallet-transaction-id" className="text-sm font-medium">
                  Transaction ID / Reference Number
                </Label>
                <Input
                  id="wallet-transaction-id"
                  type="text"
                  placeholder="Enter transaction ID or reference number"
                  value={walletFormData.transactionId}
                  onChange={(e) => handleWalletInputChange('transactionId', e.target.value)}
                  className="h-12 border-slate-300 focus:border-green-500"
                  required
                  disabled={isSubmittingWallet}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wallet-notes" className="text-sm font-medium">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="wallet-notes"
                  placeholder="Any additional information about this deposit..."
                  value={walletFormData.notes}
                  onChange={(e) => handleWalletInputChange('notes', e.target.value)}
                  className="min-h-[100px] border-slate-300 focus:border-green-500"
                  disabled={isSubmittingWallet}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWalletModal(false)}
              disabled={isSubmittingWallet}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWalletSubmit}
              disabled={isSubmittingWallet || !walletFormData.amount || !walletFormData.transactionId}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {isSubmittingWallet ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Submit Deposit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FundRequests;