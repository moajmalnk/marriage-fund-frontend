import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  LogOut, 
  Menu,
  Heart,
  Settings,
  Sparkles,
  Shield,
  FileCheck,
  Volume2,
  VolumeX,
  Languages,
  Bell,
  Wallet,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchAllUsersPublic } from '@/services/users'; 
import { TooltipProvider } from '@/components/ui/tooltip';

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

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { currentUser, logout, isLoading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showAcknowledgeConfirmDialog, setShowAcknowledgeConfirmDialog] = useState(false);
  const [hasAcknowledgedTerms, setHasAcknowledgedTerms] = useState(false);
  const [isEnglishVersion, setIsEnglishVersion] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UPDATED: Fetch ALL users from the public endpoint for Terms List
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersPublic'],
    queryFn: fetchAllUsersPublic,
    enabled: !!currentUser,
  });

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      ));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Check if terms have been acknowledged
  useEffect(() => {
    const acknowledgedData = localStorage.getItem('cbms-terms-acknowledged');
    if (acknowledgedData) {
      try {
        const parsed = JSON.parse(acknowledgedData);
        setHasAcknowledgedTerms(parsed.acknowledged === true);
      } catch {
        // Handle old format (just 'true' string)
        setHasAcknowledgedTerms(acknowledgedData === 'true');
      }
    }
  }, []);

  // Get acknowledgement data for display
  const getAcknowledgementData = () => {
    const acknowledgedData = localStorage.getItem('cbms-terms-acknowledged');
    if (acknowledgedData) {
      try {
        const parsed = JSON.parse(acknowledgedData);
        if (parsed.acknowledged && parsed.date && parsed.userName) {
          return {
            userName: parsed.userName,
            date: new Date(parsed.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  // Get all member acknowledgements
  const getAllAcknowledgements = () => {
    const acknowledgementsData = localStorage.getItem('cbms-all-acknowledgements');
    if (acknowledgementsData) {
      try {
        return JSON.parse(acknowledgementsData);
      } catch {
        return {};
      }
    }
    return {};
  };

  // Check if a specific member has acknowledged
  const getMemberAcknowledgementStatus = (userId: string) => {
    const allAcknowledgements = getAllAcknowledgements();
    return allAcknowledgements[userId] || null;
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const handleAcknowledgeClick = () => {
    setShowAcknowledgeConfirmDialog(true);
  };

  const handleTermsAcknowledgment = () => {
    const acknowledgementData = {
      acknowledged: true,
      date: new Date().toISOString(),
      userName: currentUser?.name,
      userId: currentUser?.id,
    };
    localStorage.setItem('cbms-terms-acknowledged', JSON.stringify(acknowledgementData));
    
    // Store in all acknowledgements
    const allAcknowledgements = getAllAcknowledgements();
    allAcknowledgements[currentUser?.id || ''] = {
      acknowledged: true,
      date: new Date().toISOString(),
      userName: currentUser?.name,
    };
    localStorage.setItem('cbms-all-acknowledgements', JSON.stringify(allAcknowledgements));
    
    setHasAcknowledgedTerms(true);
    setShowAcknowledgeConfirmDialog(false);
    setShowTermsDialog(false);
  };

  // Voice reading function with professional lady English voice
  const handleVoiceReading = (language: 'en') => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const termsDialog = document.querySelector('[role="dialog"]');
    if (!termsDialog) return;

    // Get the English content for voice reading
    const englishContent = getEnglishContent();
    const textContent = englishContent || termsDialog.textContent || '';
    
    const utterance = new SpeechSynthesisUtterance(textContent);
    
    // Enhanced professional voice settings for lady English voice
    utterance.lang = 'en-US';
    utterance.rate = 0.75; // Slower for clear, professional delivery
    utterance.pitch = 0.85; // Lower pitch for professional lady voice
    utterance.volume = 1.0; // Full volume
    
    // Enhanced professional female voice selection with priority order
    const selectProfessionalLadyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Priority list for professional lady English voices
      const professionalLadyVoices = [
        // Premium/Enhanced voices (highest priority)
        'Microsoft Zira Desktop - English (United States)',
        'Microsoft Hazel Desktop - English (Great Britain)',
        'Google UK English Female',
        'Google US English Female',
        'Samantha', 'Victoria', 'Susan', 'Karen', 'Alex', 'Fiona',
        'Moira', 'Tessa', 'Veena', 'Rishi'
      ];
      
      // Find the best professional lady voice
      let selectedVoice = null;
      
      // First, try to find exact matches from priority list
      for (const voiceName of professionalLadyVoices) {
        selectedVoice = voices.find(voice => 
          voice.name === voiceName && 
          voice.lang.startsWith('en')
        );
        if (selectedVoice) break;
      }
      
      // If no exact match, try partial matches for professional lady voices
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('lady') ||
           voice.name.toLowerCase().includes('woman') ||
           voice.name.toLowerCase().includes('samantha'))
        );
      }
      
      // Final fallback: any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    };
    
    // Try to select voice immediately
    selectProfessionalLadyVoice();
    
    // If voices aren't loaded yet, wait for them
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', selectProfessionalLadyVoice, { once: true });
    }
    
    // Enhanced event handlers
    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);
    
    // Cancel any existing speech and start new reading
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };


  // Get English content for professional lady voice reading
  const getEnglishContent = () => {
    const englishContent = `
      CBMS Marriage Fund Regulations
      
      Purpose and Scope: This Marriage Fund has been established to provide financial support to CBMS members for their wedding expenses. All members participating in this fund must strictly adhere to the following rules and regulations.
      
      Section 1 - Membership Eligibility: Only permanent members of CBMS are eligible to join this fund. Matters related to inclusion of new members, exclusion, or membership duration shall be decided by CBMS authorized authorities.
      
      Section 2 - Fund Contribution: Each member must contribute five thousand rupees on the occasion of another member's wedding. It is each member's personal responsibility to pay the amount on time.
      
      Section 3 - Marriage Notification: Members must inform the fund coordinators at least forty-five days in advance when their wedding is finalized. The coordinators shall issue official notification to all members thirty days before the wedding for payment collection.
      
      Section 4 - Payment Schedule: All members must submit their contribution to the responsible persons at least one week before the wedding. Those who receive the fund are obligated to contribute the specified amount for subsequent weddings.
      
      Section 5 - Disbursement of Fund: The collected amount shall be disbursed to the concerned member on the day before or on the wedding day. In emergency situations, if funds are needed earlier, the coordinators must be informed at least two months in advance.
      
      Section 6 - Duration of the Fund: This fund will naturally conclude once all members' weddings are completed. A member shall not withdraw from the fund after joining.
      
      Section 7 - Delayed Payment Clause: For those unable to pay on time, the amount will be recorded as debt in their name. The outstanding amount must be settled within one month.
      
      Section 8 - Special Cases: If a member's wedding is postponed or cancelled, the previously collected amount will remain valid for the next wedding occasion. For non-payment cases, necessary actions may be taken as per group decision.
      
      Section 9 - Fund Management and Transparency: A Register, Google Sheet, or Account Book must be used to record collected and disbursed amounts. Fund management shall be handled by at least two responsible persons. Receipts and digital records must be provided for all transactions.
      
      Section 10 - Suggestions and Feedback: Any opinions or suggestions related to the fund can be directly shared with any of the coordinators.
      
      Section 11 - Closure and Remaining Funds: The fund will conclude once all members' weddings are completed. If there are any remaining funds at the final stage, they may be utilized as per the decision taken in the general meeting.
      
      Section 12 - Acknowledgement and Signatures: Having read and understood this regulation completely, the following members hereby acknowledge and accept all the terms mentioned herein.
    `;
    return englishContent;
  };

  const handleVoiceClick = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    } else {
      handleVoiceReading('en');
    }
  };

  const handleTranslationToggle = () => {
    setIsEnglishVersion(!isEnglishVersion);
  };

  // Get responsible members and regular members from actual user data
  const responsibleMembers = (allUsers as any[]).filter(user => user.role === 'responsible_member');
  const regularMembers = (allUsers as any[]).filter(user => user.role === 'member');

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 overflow-hidden">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'Payments', href: '/payments', icon: CreditCard, color: 'text-green-600' },
    { name: 'Verify Deposits', href: '/wallet-approvals', icon: Wallet, color: 'text-emerald-600' },
    { name: 'Team', href: '/team', icon: Users, color: 'text-purple-600' },
    { name: 'Fund Requests', href: '/fund-requests', icon: Heart, color: 'text-red-600' },
    { name: 'Manage Users', href: '/manage-users', icon: Settings, color: 'text-orange-600' },
    { name: 'Notifications', href: '/notifications', icon: Bell, color: 'text-amber-600' },
    { name: 'Terms of Use', href: '#', icon: FileCheck, color: 'text-indigo-600', isAction: true },
  ];

  const navigation = currentUser.role === 'admin' ? adminNavigation : [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'Payments', href: '/payments', icon: CreditCard, color: 'text-green-600' },
    { name: 'Team', href: '/team', icon: Users, color: 'text-purple-600' },
    { name: 'Fund Requests', href: '/fund-requests', icon: Heart, color: 'text-red-600' },
    { name: 'Notifications', href: '/notifications', icon: Bell, color: 'text-amber-600' },
    { name: 'Terms of Use', href: '#', icon: FileCheck, color: 'text-indigo-600', isAction: true },
  ];

  const SidebarContent = () => (
    <>
      {/* Header Card */}
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-blue-500/25">
                <Shield className="h-5 w-5" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                CBMS Fund
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Marriage Support System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <nav className="px-4 py-6 flex-1 space-y-3 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.href && !showTermsDialog;
          const isTermsActive = item.isAction && showTermsDialog;
          return (
            <div
              key={item.name}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {item.isAction ? (
                <button
                  onClick={() => {
                    setShowTermsDialog(true);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 ease-out w-full text-left navigation-item",
                    "hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-background",
                    isTermsActive
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25 border border-blue-400/20"
                      : "bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isTermsActive 
                      ? "bg-white/20" 
                      : "bg-slate-100/80 dark:bg-slate-700/80 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-600/80"
                  )}>
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-300",
                      isTermsActive ? "text-white" : "text-indigo-600"
                    )} />
                  </div>
                  <span className="font-medium">{item.name}</span>
                  {isTermsActive && (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <Sparkles className="h-3 w-3 text-white/80" />
                    </div>
                  )}
                  {isTermsActive && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-600/10 animate-pulse" />
                  )}
                </button>
              ) : (
                <Link
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 ease-out navigation-item",
                    "hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-background",
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25 border border-blue-400/20"
                      : "bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-slate-100/80 dark:bg-slate-700/80 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-600/80"
                  )}>
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-300",
                      isActive ? "text-white" : item.color
                    )} />
                  </div>
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <Sparkles className="h-3 w-3 text-white/80" />
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-600/10 animate-pulse" />
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className="p-2 sm:p-3 lg:p-4 border-t border-slate-200/60 dark:border-slate-700/60 mt-auto">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="h-10 w-10 rounded-2xl border-2 border-blue-100 dark:border-blue-900 shadow-sm">
                <AvatarImage src={fixProfilePhotoUrl(currentUser.profile_photo)} alt={currentUser.name} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-2xl">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white dark:border-slate-800" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Link 
                  to="/profile" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 min-w-0 cursor-pointer group"
                >
                  <p className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                    {currentUser.role.replace('_', ' ')}
                  </p>
                </Link>
                <button
                  onClick={handleLogoutClick}
                  className="flex-shrink-0 p-1 sm:p-1.5 rounded-md hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-all duration-200"
                  aria-label="Logout"
                >
                  <LogOut className="text-slate-500 dark:text-slate-400 ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg">
                <Shield className="h-4 w-4" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-white dark:border-slate-900 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                CBMS Fund
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Marriage Support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="left" 
                  className="w-80 p-0 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 z-[60]"
                >
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Main navigation menu with links to different sections of the application.
                  </SheetDescription>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 shadow-xl sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300 ease-in-out h-full",
        isMobile ? "pt-0" : "pt-0"
      )}>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <LogOut className="h-5 w-5" />
              </div>
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
              Are you sure you want to logout from your CBMS Fund account? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel 
              onClick={() => setShowLogoutDialog(false)}
              className="px-4 sm:px-6 py-2"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 sm:px-6 py-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms of Use Dialog - IMPROVED RESPONSIVENESS */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        {/* Added flex flex-col to ensure content takes proper height on mobile */}
        <DialogContent className="flex flex-col w-full max-w-[95vw] md:max-w-4xl h-[92vh] sm:h-[85vh] p-0 gap-0 overflow-hidden">
          
          {/* Header - Fixed */}
          <DialogHeader className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg mb-1">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-500 text-white flex-shrink-0">
                    <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-base sm:text-lg leading-tight">
                    {isEnglishVersion 
                      ? "CBMS Marriage Fund Regulations"
                      : "CBMS വിവാഹക്കുറി നിയമാവലി"
                    }
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-slate-500">
                  {isEnglishVersion
                    ? "Terms and Conditions"
                    : "നിബന്ധനകളും വ്യവസ്ഥകളും"
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* PURPOSE SECTION */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-base sm:text-lg">
                {isEnglishVersion ? "Purpose & Scope" : "ആമുഖം (Purpose & Scope)"}
              </h3>
              <p className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm leading-relaxed">
                {isEnglishVersion 
                  ? "This 'Marriage Fund' has been formed to provide financial support to CBMS members for their wedding expenses. All members participating in this fund must strictly adhere to the following rules and regulations."
                  : "CBMS അംഗങ്ങളുടെ വിവാഹച്ചെലവുകൾക്ക് സാമ്പത്തിക പിന്തുണ നൽകുന്നതിനായി ഈ \"വിവാഹക്കുറി\" രൂപീകരിച്ചിരിക്കുന്നു. ഈ കുറിയിൽ അംഗങ്ങളാകുന്ന എല്ലാവരും താഴെപ്പറയുന്ന നിയമങ്ങളും വ്യവസ്ഥകളും കർശനമായി പാലിക്കേണ്ടതാണ്."
                }
              </p>
            </div>

            {/* RULE SECTIONS */}
            <div className="space-y-6">
              {[
                {
                  titleE: "1. Membership Eligibility",
                  titleM: "1. അംഗത്വം (Membership Eligibility)",
                  descE: "Only permanent members of CBMS are eligible to join this fund. Matters related to new member inclusion, exclusion or membership duration shall be decided by authorized CBMS authorities.",
                  descM: "ഈ കുറിയിൽ അംഗമാകാൻ CBMS യിലെ സ്ഥിരാംഗങ്ങൾക്കു മാത്രമേ അർഹതയുള്ളൂ. പുതിയ അംഗങ്ങളെ ഉൾപ്പെടുത്തൽ, ഒഴിവാക്കൽ, അല്ലെങ്കിൽ അംഗത്വ കാലാവധി സംബന്ധിച്ച കാര്യങ്ങൾ അധികാരികൾ തീരുമാനിക്കും."
                },
                {
                  titleE: "2. Fund Contribution",
                  titleM: "2. പണസമാഹരണവും (Fund Contribution)",
                  descE: "Each member must contribute ₹5000 on the occasion of another member's wedding. It is each member’s responsibility to pay on time.",
                  descM: "ഓരോ അംഗവും മറ്റൊരു അംഗത്തിന്റെ വിവാഹത്തിന് ₹5000 വീതം അടയ്ക്കേണ്ടതാണ്. പണം സമയത്ത് അടയ്ക്കേണ്ടത് ഓരോരുത്തരുടെയും ഉത്തരവാദിത്വമാണ്."
                },
                {
                  titleE: "3. Marriage Notification",
                  titleM: "3. വിവാഹ അറിയിപ്പ്",
                  descE: "Members must inform fund coordinators at least 45 days before their wedding. Official notification to all members will be issued 30 days before the wedding.",
                  descM: "അംഗങ്ങൾ 45 ദിവസം മുമ്പ് വിവാഹ വിവരം അറിയിക്കണം. 30 ദിവസം മുമ്പ് ഔദ്യോഗിക അറിയിപ്പ് നൽകും."
                },
                {
                  titleE: "4. Payment Schedule",
                  titleM: "4. പണം അടയ്ക്കൽ സമയക്രമം",
                  descE: "Members must pay the amount at least one week before the wedding. The married member must contribute for future weddings as well.",
                  descM: "വിവാഹത്തിന് ഒരാഴ്ച മുമ്പ് പണം അടയ്ക്കണം. പണം കൈപ്പറ്റിയവരും പിന്നീട് അടയ്ക്കണം."
                },
                {
                  titleE: "5. Disbursement of Fund",
                  titleM: "5. പണം കൈമാറ്റം",
                  descE: "Collected amount will be given before or on the wedding day. For emergency needs, members must notify at least two months earlier.",
                  descM: "പിരിച്ചെടുത്ത തുക വിവാഹത്തിന് മുൻപോ വിവാഹദിവസമോ നൽകി തീർക്കും. അടിയന്തരാവശ്യങ്ങൾക്കായി രണ്ടുമാസം മുമ്പ് അറിയിക്കണം."
                },
                {
                  titleE: "6. Duration of the Fund",
                  titleM: "6. കുറിയുടെ നിലനിൽപ്പ്",
                  descE: "The fund ends once all members' weddings are completed. Members cannot leave the fund after joining.",
                  descM: "എല്ലാവരുടെയും വിവാഹം കഴിഞ്ഞാൽ കുറി അവസാനിക്കും. ഒരിക്കൽ ചേർന്നാൽ പിൻമാറാൻ പാടില്ല."
                },
                {
                  titleE: "7. Delayed Payment Clause",
                  titleM: "7. വൈകിയ പണമടവ്",
                  descE: "Late or partial payments will be recorded as debt and must be cleared within one month.",
                  descM: "വൈകിയോ ഭാഗികമായോ അടച്ചാൽ കടമായി രേഖപ്പെടുത്തി ഒരു മാസത്തിനകം തീർപ്പാക്കണം."
                },
                {
                  titleE: "8. Special Cases",
                  titleM: "8. പ്രത്യേക സാഹചര്യങ്ങൾ",
                  descE: "If the wedding is postponed or cancelled, earlier payments remain valid. Legal measures may be taken for non-payment.",
                  descM: "വിവാഹം മാറ്റുകയോ റദ്ദാക്കുകയോ ചെയ്താൽ പണം അടുത്ത അവസരത്തിൽ നിലനിൽക്കും. പണം അടക്കാത്തവർക്ക് നടപടി സ്വീകരിക്കാം."
                },
                {
                  titleE: "9. Fund Management & Transparency",
                  titleM: "9. ഫണ്ട് നിയന്ത്രണം & സുതാര്യത",
                  descE: "Record keeping must be done via register or Google Sheet. Minimum two responsible persons must manage the fund.",
                  descM: "റജിസ്റ്റർ/Google Sheet നിർബന്ധമാണ്. കുറഞ്ഞത് രണ്ട് പേർ ഫണ്ട് കൈകാര്യം ചെയ്യും."
                },
                {
                  titleE: "10. Suggestions & Feedback",
                  titleM: "10. അഭിപ്രായങ്ങളും നിർദ്ദേശങ്ങളും",
                  descE: "Suggestions can be submitted to any coordinator.",
                  descM: "ഏതെങ്കിലും അഭിപ്രായം/നിർദ്ദേശം ഉത്തരവാദികളിൽ ആരോടും പറയാവുന്നതാണ്."
                },
                {
                  titleE: "11. Closure & Remaining Funds",
                  titleM: "11. അവസാന ഘട്ടം",
                  descE: "Any remaining amount after the final marriage will be used as decided in the general meeting.",
                  descM: "അവസാനം ബാക്കി വരുന്ന തുക പൊതുയോഗത്തിൽ തീരുമാനിച്ച പ്രകാരം വിനിയോഗിക്കും."
                }
              ].map((sec, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    {isEnglishVersion ? sec.titleE : sec.titleM}
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {isEnglishVersion ? sec.descE : sec.descM}
                  </p>
                </div>
              ))}

              {/* OFFICIAL DOCUMENT BOX */}
              <div className="relative bg-white dark:bg-slate-900 border-4 border-double border-amber-700/30 dark:border-amber-600/30 rounded-md shadow-xl overflow-hidden mt-8">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-l-4 border-t-4 border-amber-700/40 dark:border-amber-600/40"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-r-4 border-t-4 border-amber-700/40 dark:border-amber-600/40"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-l-4 border-b-4 border-amber-700/40 dark:border-amber-600/40"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-r-4 border-b-4 border-amber-700/40 dark:border-amber-600/40"></div>
                </div>

                <div className="relative p-4 sm:p-8">
                  {/* SEAL */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full blur-md opacity-20"></div>
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 dark:from-amber-500 dark:to-amber-700 flex items-center justify-center border-4 border-amber-300 dark:border-amber-400 shadow-lg">
                        <FileCheck className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Heading */}
                  <div className="text-center mb-6">
                    <h4 className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100">
                      {isEnglishVersion ? "Acknowledgement & Signatures" : "അംഗീകാരം"}
                    </h4>
                    <p className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-widest mt-1">
                      Section 12
                    </p>
                  </div>

                  <div className="mb-8 text-center max-w-xl mx-auto">
                    <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                      {isEnglishVersion
                        ? "Having read and understood this regulation completely..."
                        : "ഈ നിയമാവലി പൂർണ്ണമായി വായിച്ചറിഞ്ഞ്..."
                      }
                    </p>
                  </div>

                  {/* MEMBERS GRID */}
                  <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
                    {/* RESPONSIBLE MEMBERS */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-amber-700/20 dark:border-amber-600/20">
                        <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {isEnglishVersion ? "Responsible Members" : "ഉത്തരവാദികൾ"}
                        </h5>
                      </div>
                      <div className="space-y-2">
                        {responsibleMembers.map((member, i) => {
                          const st = getMemberAcknowledgementStatus(member.id);
                          return (
                            <div key={i} className="flex items-center justify-between text-xs sm:text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                              <span className="font-medium truncate mr-2">{member.name}</span>
                              {st?.acknowledged ? (
                                <span className="text-green-600 dark:text-green-400 font-bold text-[10px] uppercase">Approved</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* REGULAR MEMBERS */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-amber-700/20 dark:border-amber-600/20">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {isEnglishVersion ? "Members" : "അംഗങ്ങൾ"}
                        </h5>
                      </div>
                      <div className="space-y-2">
                        {regularMembers.map((member, i) => {
                          const st = getMemberAcknowledgementStatus(member.id);
                          return (
                            <div key={i} className="flex items-center justify-between text-xs sm:text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                              <span className="font-medium truncate mr-2">{member.name}</span>
                              {st?.acknowledged ? (
                                <span className="text-green-600 dark:text-green-400 font-bold text-[10px] uppercase">Approved</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {hasAcknowledgedTerms && getAcknowledgementData() && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 text-sm">Terms Acknowledged</h4>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      By {getAcknowledgementData()?.userName} on {getAcknowledgementData()?.date}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Fixed at bottom */}
          <DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowTermsDialog(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
              
              <div className="flex gap-2 w-full sm:w-auto flex-1 sm:flex-none">
                <Button
                  onClick={handleVoiceClick}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 gap-2",
                    isReading ? "bg-blue-50 text-blue-600 border-blue-200" : ""
                  )}
                >
                  {isReading ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isReading ? "Stop" : "Listen"}
                </Button>
                
                <Button
                  onClick={handleTranslationToggle}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                >
                  <Languages className="h-4 w-4" />
                  {isEnglishVersion ? "മലയാളം" : "English"}
                </Button>
              </div>
              
              {!hasAcknowledgedTerms && (
                <Button
                  onClick={handleAcknowledgeClick}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  I Acknowledge
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledgement Confirmation Dialog */}
      <AlertDialog open={showAcknowledgeConfirmDialog} onOpenChange={setShowAcknowledgeConfirmDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500 text-white">
                <FileCheck className="h-5 w-5" />
              </div>
              Confirm Acknowledgement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
              Are you sure you have read and understood all the terms and conditions?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel 
              onClick={() => setShowAcknowledgeConfirmDialog(false)}
              className="px-4 sm:px-6 py-2"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTermsAcknowledgment}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 sm:px-6 py-2"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Yes, I Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Layout;