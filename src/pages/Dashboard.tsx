import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  IndianRupee, TrendingUp, TrendingDown, Users, Heart, ArrowUpRight, 
  Sparkles, Wallet, Crown, Trophy, Medal, Award, Target, 
  CheckCircle, Clock, XCircle, Calendar, Gift, PartyPopper, Share2, MessageSquare,
  History 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardStats, fetchRecentRequests } from '@/services/dashboard';
import { createWalletDeposit } from '@/services/wallet';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- WALLET MODAL STATE ---
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletFormData, setWalletFormData] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: ''
  });
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 1. Fetch Real Data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });
  const { data: recentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['recentRequests'],
    queryFn: fetchRecentRequests,
  });

  // --- WALLET MUTATION ---
  const walletDepositMutation = useMutation({
    mutationFn: createWalletDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      
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

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWallet(true);
    try {
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
      console.error(error);
      setIsSubmittingWallet(false);
    }
  };

  const handleWalletInputChange = (field: string, value: string) => {
    setWalletFormData(prev => ({ ...prev, [field]: value }));
  };

  if (authLoading || statsLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  // --- VARIABLES ---
  const totalBalance = stats?.financials?.balance || 0;
  const totalCollected = stats?.financials?.collected || 0;
  const totalDisbursed = stats?.financials?.disbursed || 0;
  const married = stats?.demographics?.married || 0;
  const unmarried = stats?.demographics?.unmarried || 0;
  const totalMembers = married + unmarried;
  const topThreeTeams = stats?.teams?.slice(0, 3) || [];
  const weddingAnnouncements = stats?.announcements || [];
  const canShareAnnouncements = currentUser.role === 'admin' || currentUser.role === 'responsible_member';

  // --- MESSAGE TEMPLATE ---
  const contributionMessageTemplate = `🎉 Wedding Announcement - Contribution Required

Dear CBMS Family,

We have exciting news! A wedding celebration is coming up and we need your support.

📅 Wedding Date: [Date]
👰🤵 Couple: [Names]
💰 Contribution Amount: ₹5,000 per member

This contribution helps us support our community members during their special moments. Your participation strengthens our bond as a family.

Please prepare your contribution of ₹5,000 and submit it through the CBMS Marriage Fund system.

Thank you for your continued support and participation in our community fund.

Best regards,
CBMS Marriage Fund Team

#CBMSFamily #WeddingCelebration #CommunitySupport`;

  // --- HELPER FUNCTIONS ---
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return { icon: Crown, color: 'text-yellow-600', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40', borderColor: 'border-yellow-400 dark:border-yellow-600', badgeStyle: 'text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', label: 'Champion' };
      case 2: return { icon: Trophy, color: 'text-gray-600', bgColor: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/60 dark:to-gray-700/60', borderColor: 'border-gray-400 dark:border-gray-500', badgeStyle: 'text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-900/10', label: 'Runner-Up' };
      case 3: return { icon: Medal, color: 'text-amber-700', bgColor: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40', borderColor: 'border-amber-400 dark:border-amber-600', badgeStyle: 'text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20', label: 'Third Place' };
      default: return { icon: Award, color: 'text-blue-600', bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40', borderColor: 'border-blue-400 dark:border-blue-600', badgeStyle: 'text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10', label: 'Top Team' };
    }
  };

  const getFundRequestStatus = (request: any) => {
    const status = request.status?.toUpperCase() || 'PENDING';
    const paymentStatus = request.payment_status?.toUpperCase() || 'PENDING';
    if (status === 'APPROVED') {
      if (paymentStatus === 'PAID') return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30', label: 'Paid', badgeColor: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' };
      else if (paymentStatus === 'PARTIAL') return { icon: Clock, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30', label: 'Partial', badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700' };
      else return { icon: Clock, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30', label: 'Pending Payment', badgeColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700' };
    } else if (status === 'PENDING') return { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30', label: 'Under Review', badgeColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700' };
    return { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30', label: 'Declined', badgeColor: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700' };
  };

  // --- DYNAMIC QUICK ACTIONS ---
  const getQuickActions = () => {
    const actions = [];

    if (currentUser.role === 'member') {
        actions.push({ 
            label: "Payment History", 
            icon: History, 
            href: "/payments", 
            variant: "default" as const, 
            count: "View", 
            subtitle: "My contributions" 
        });
    } else {
        actions.push({ 
            label: "Make Payment", 
            icon: IndianRupee, 
            href: "/payments", 
            variant: "default" as const, 
            count: "Pay", 
            subtitle: "Record transaction" 
        });
    }

    if (currentUser.role === 'member') {
        actions.push({
            label: "Deposit Wallet",
            icon: Wallet,
            onClick: () => setShowWalletModal(true),
            variant: "outline" as const,
            count: "Add",
            subtitle: "Add funds",
            isButton: true 
        });
    } else {
        actions.push({
            label: "View Team",
            icon: Users,
            href: "/team",
            variant: "outline" as const,
            count: "View",
            subtitle: "Manage members"
        });
    }

    actions.push({ 
        label: "Fund Requests", 
        icon: Heart, 
        href: "/fund-requests", 
        variant: "outline" as const, 
        count: "Reqs", 
        subtitle: "Approvals" 
    });

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back, <span className="font-semibold text-slate-900 dark:text-slate-100">{currentUser.name}</span>
          </p>
        </div>
      </div>

      {/* 1. Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        {/* ... (Kept existing cards) ... */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500 text-white flex-shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Total Balance</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-100">₹{Number(totalBalance).toLocaleString('en-IN')}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">Available funds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-green-500 text-white flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Total Collected</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100">₹{Number(totalCollected).toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-500 dark:text-green-400">All time collections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-red-500 text-white flex-shrink-0">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Total Disbursed</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-900 dark:text-red-100">₹{Number(totalDisbursed).toLocaleString('en-IN')}</p>
                <p className="text-xs text-red-500 dark:text-red-400">Approved requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500 text-white flex-shrink-0">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">Married Members</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100">{married}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500 text-white flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-cyan-600 dark:text-cyan-400">Unmarried Members</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-900 dark:text-cyan-100">{unmarried}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-500 text-white flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400">Total Members</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 dark:text-orange-100">{totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Announcements - FIXED RESPONSIVENESS */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white shrink-0">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-slate-900 dark:text-slate-100 text-lg sm:text-xl">
                  Wedding Announcements
                </CardTitle>
                <CardDescription className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  Latest wedding announcements and upcoming celebrations
                </CardDescription>
              </div>
            </div>
            
            {/* Share Button for Admins and Responsible Members */}
            {canShareAnnouncements && (
              <div className="flex sm:justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto h-9 px-3 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-900/40 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 hover:text-pink-800 dark:hover:text-pink-200"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </DialogTrigger>
                  
                  {/* Share Dialog Content - FIXED OVERFLOW & LAYOUT */}
                  <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-pink-600" />
                        Share Wedding Announcement
                      </DialogTitle>
                      <DialogDescription>
                        Use this template to share wedding announcements and collect contributions from members
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Message Template:
                        </h4>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded border text-sm font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
                          {contributionMessageTemplate}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          onClick={() => {
                            navigator.clipboard.writeText(contributionMessageTemplate);
                          }}
                          className="flex-1"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(contributionMessageTemplate)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="flex-1"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Share on WhatsApp
                        </Button>
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Note:</strong> Remember to replace [Wedding Date] and [Couple Names] with the actual details before sharing.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weddingAnnouncements.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-4 w-fit">
                  <Heart className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No wedding announcements yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Wedding announcements will appear here when members share their special news
                </p>
              </div>
            ) : (
              weddingAnnouncements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-all duration-200 hover:shadow-md bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border border-pink-200 dark:border-pink-800 gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm mt-1 sm:mt-0">
                      <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                          {announcement.title}
                        </p>
                        <Badge variant="outline" className="text-xs px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border-pink-300 dark:border-pink-700 whitespace-nowrap">
                          Wedding
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 break-words">
                        {announcement.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <Calendar className="h-3 w-3" />
                          <span>Announced: {new Date(announcement.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <Gift className="h-3 w-3" />
                          <span>Contribution Required</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side Info - Aligned with text on mobile via padding */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pl-[3.25rem] sm:pl-0 sm:text-right w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <PartyPopper className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 dark:text-pink-400" />
                      <span className="text-xs font-medium text-pink-600 dark:text-pink-400">
                        Celebration
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:mt-1">
                      ₹5,000 per member
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* View All Announcements Button */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
            <Button 
              variant="outline" 
              className="w-full h-10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
              asChild
            >
              <a href="/notifications">
                <Heart className="h-4 w-4 mr-2" />
                View All Announcements
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Quick Actions */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-slate-500 text-white"><Sparkles className="h-5 w-5" /></div>
            Quick Actions
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">Common tasks and navigation shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <div key={index} className="group">
                {action.isButton ? (
                    <Button 
                        variant={action.variant} 
                        className="h-20 w-full justify-start p-4 group hover:scale-105 transition-all duration-200"
                        onClick={action.onClick}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <action.icon className="h-5 w-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                            <div className="flex-1 text-left">
                                <div className="font-medium">{action.label}</div>
                                <div className="text-xs opacity-70">{action.subtitle}</div>
                            </div>
                            <div className="text-right">
                                <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </Button>
                ) : (
                    <Button variant={action.variant} className="h-20 w-full justify-start p-4 group hover:scale-105 transition-all duration-200" asChild>
                        <a href={action.href}>
                            <div className="flex items-center gap-3 w-full">
                            <action.icon className="h-5 w-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                            <div className="flex-1 text-left">
                                <div className="font-medium">{action.label}</div>
                                <div className="text-xs opacity-70">{action.subtitle}</div>
                            </div>
                            <div className="text-right">
                                <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            </div>
                        </a>
                    </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Top 3 Teams Ranking */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 text-white"><Trophy className="h-5 w-5" /></div>
            Top 3 Teams
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">Leading teams by total contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {topThreeTeams.map((team: any, index: number) => {
              const rank = index + 1;
              const rankInfo = getRankIcon(rank);
              const RankIcon = rankInfo.icon;

              const safeId = team?.responsible_member?.id ?? team?.id ?? `team-${index}`;
              const leaderName = team?.leader_name ?? team?.responsible_member?.name ?? 'Team';
              
              const memberCount = team?.member_count ?? 0;
              
              const totalPaid = Number(team?.total_paid ?? 0);
              const target = Number(team?.target ?? 0);
              const progress = Number(team?.progress ?? 0);

              return (
                <div key={safeId} className="relative group">
                  {/* Rank Badge */}
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className={`${rankInfo.bgColor} ${rankInfo.borderColor} border-2 rounded-full p-2 shadow-lg backdrop-blur-sm transform hover:scale-110 transition-transform duration-300`}>
                      <RankIcon className={`h-5 w-5 ${rankInfo.color}`} />
                    </div>
                  </div>
                  
                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-slate-800/10" />
                    
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      {/* 1. Team Icon */}
                      <div className="mb-4 flex items-center justify-center">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                          <Users className="h-8 w-8" />
                        </div>
                      </div>

                      {/* 2. Name & Member Count */}
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                        {leaderName} Team
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {memberCount} members
                      </p>

                      {/* 3. Rank Badge (Champion/Runner-Up) */}
                      <div className={`mb-6 flex items-center gap-2 px-5 py-1.5 rounded-full border-2 ${rankInfo.badgeStyle} bg-transparent`}>
                        <RankIcon className="h-4 w-4" />
                        <span className="text-xs font-bold tracking-wider uppercase">
                          {rankInfo.label}
                        </span>
                      </div>

                      {/* 4. Stacked Stats Container */}
                      <div className="w-full space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 mb-6 border border-slate-100 dark:border-slate-700/50">
                        
                        {/* Total Paid Row */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Paid</span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{totalPaid.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Target Row */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Target</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            ₹{target.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Progress Text Row */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Progress</span>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* 5. Bottom Progress Bar */}
                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>Team Progress</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="relative w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          
          {/* View All Teams Button */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
            <Button 
              variant="outline" 
              className="w-full h-10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
              asChild
            >
              <a href="/team">
                <Target className="h-4 w-4 mr-2" />
                View All Teams
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. Recent Fund Requests */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white"><Heart className="h-5 w-5" /></div>
            Recent Fund Requests
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">Latest approved and pending fund requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentRequests?.map((request: any) => {
              const statusInfo = getFundRequestStatus(request);
              const StatusIcon = statusInfo.icon;
              return (
                <div key={request.id} className={cn("flex items-center justify-between p-4 rounded-xl transition-all duration-200 hover:shadow-md", statusInfo.bgColor)}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                      <StatusIcon className={cn("h-5 w-5", statusInfo.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{request.user_name}</p>
                        <Badge variant="outline" className={cn("text-xs px-2 py-1", statusInfo.badgeColor)}>{statusInfo.label}</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">{request.reason}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>Requested: {new Date(request.requested_date).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-4">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl">₹{Number(request.amount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
            <Button variant="outline" className="w-full h-10" asChild>
              <a href="/fund-requests"><Heart className="h-4 w-4 mr-2" /> View All Fund Requests</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Deposit Modal (New on Dashboard) */}
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
              Add funds to your personal wallet. Pending Admin Approval.
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

export default Dashboard;