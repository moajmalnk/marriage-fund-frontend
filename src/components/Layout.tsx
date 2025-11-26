import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  FileText, 
  LogOut, 
  UserCircle, 
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
  Maximize,
  Minimize,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
// UPDATED IMPORT
import { fetchAllUsersPublic } from '@/services/users'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
        'Samantha',
        'Victoria',
        'Susan',
        'Karen',
        'Alex',
        'Fiona',
        'Moira',
        'Tessa',
        'Veena',
        'Rishi',
        'Amélie',
        'Anna',
        'Carmit',
        'Damayanti',
        'Ellen',
        'Ioana',
        'Joana',
        'Kanya',
        'Laura',
        'Lekha',
        'Luciana',
        'Mariska',
        'Melina',
        'Milena',
        'Monica',
        'Nora',
        'Paulina',
        'Sara',
        'Satu',
        'Sin-ji',
        'Ting-Ting',
        'Trinoids',
        'Vicki',
        'Xander',
        'Yelda',
        'Yuna',
        'Yuri',
        'Zosia',
        'Zuzana'
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
           voice.name.toLowerCase().includes('samantha') ||
           voice.name.toLowerCase().includes('victoria') ||
           voice.name.toLowerCase().includes('susan') ||
           voice.name.toLowerCase().includes('karen') ||
           voice.name.toLowerCase().includes('alex') ||
           voice.name.toLowerCase().includes('fiona') ||
           voice.name.toLowerCase().includes('moira') ||
           voice.name.toLowerCase().includes('tessa') ||
           voice.name.toLowerCase().includes('veena') ||
           voice.name.toLowerCase().includes('microsoft') ||
           voice.name.toLowerCase().includes('google') ||
           voice.name.toLowerCase().includes('enhanced') ||
           voice.name.toLowerCase().includes('premium') ||
           voice.name.toLowerCase().includes('desktop'))
        );
      }
      
      // If still no match, try any English female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          voice.name.toLowerCase().includes('female')
        );
      }
      
      // Final fallback: any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Selected professional lady voice:', selectedVoice.name);
      } else {
        console.log('No professional lady voice found, using default');
      }
    };
    
    // Try to select voice immediately
    selectProfessionalLadyVoice();
    
    // If voices aren't loaded yet, wait for them
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', selectProfessionalLadyVoice, { once: true });
    }
    
    // Enhanced event handlers
    utterance.onstart = () => {
      setIsReading(true);
      console.log('Professional lady voice reading started');
    };
    
    utterance.onend = () => {
      setIsReading(false);
      console.log('Professional lady voice reading completed');
    };
    
    utterance.onerror = (event) => {
      setIsReading(false);
      console.error('Voice reading error:', event.error);
    };
    
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

  const handleFullscreenToggle = async () => {
    try {
      if (isFullscreen) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } else {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
      }
    } catch (error) {
      console.log('Fullscreen toggle failed:', error);
    }
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
                <AvatarImage src={currentUser.profile_photo} alt={currentUser.name} className="object-cover" />
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

      {/* Terms of Use Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-4xl mx-2 sm:mx-4 h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl mb-2">
              <div className="p-2 rounded-lg bg-indigo-500 text-white">
                <FileCheck className="h-5 w-5" />
              </div>
                  {isEnglishVersion 
                    ? "CBMS Marriage Fund Regulations"
                    : "CBMS വിവാഹക്കുറി നിയമാവലി (Marriage Fund Regulations)"
                  }
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
                  {isEnglishVersion
                    ? "Marriage Fund Terms and Conditions - Please read and acknowledge"
                    : "വിവാഹ ഫണ്ട് നിബന്ധനകളും വ്യവസ്ഥകളും - ദയവായി വായിച്ച് അംഗീകരിക്കുക"
                  }
            </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 text-sm sm:text-base leading-relaxed">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {isEnglishVersion ? "Purpose & Scope" : "ആമുഖം (Purpose & Scope)"}
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                {isEnglishVersion 
                  ? "This 'Marriage Fund' has been formed to provide financial support to CBMS members for their wedding expenses. All members participating in this fund must strictly adhere to the following rules and regulations."
                  : "CBMS അംഗങ്ങളുടെ വിവാഹച്ചെലവുകൾക്ക് സാമ്പത്തിക പിന്തുണ നൽകുന്നതിനായി ഈ \"വിവാഹക്കുറി\" രൂപീകരിച്ചിരിക്കുന്നു. ഈ കുറിയിൽ അംഗങ്ങളാകുന്ന എല്ലാവരും താഴെപ്പറയുന്ന നിയമങ്ങളും വ്യവസ്ഥകളും കർശനമായി പാലിക്കേണ്ടതാണ്."
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "1. Membership Eligibility" : "1. അംഗത്വം (Membership Eligibility)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "Only permanent members of CBMS are eligible to join this fund. Matters related to inclusion of new members, exclusion, or membership duration shall be decided by CBMS authorized authorities."
                    : "ഈ കുറിയിൽ അംഗമാകാൻ CBMS യിലെ സ്ഥിരാംഗങ്ങൾക്കു മാത്രമേ അർഹതയുള്ളൂ. പുതിയ അംഗങ്ങളെ ഉൾപ്പെടുത്തൽ, ഒഴിവാക്കൽ, അല്ലെങ്കിൽ അംഗത്വ കാലാവധി സംബന്ധിച്ച കാര്യങ്ങൾ CBMS അംഗീകൃത അധികാരികൾ തീരുമാനിക്കും."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "2. Fund Contribution" : "2. പണസമാഹരണവും (Fund Contribution)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "Each member must contribute ₹5000 (Five Thousand Rupees) on the occasion of another member's wedding. It is each member's personal responsibility to pay the amount on time."
                    : "ഓരോ അംഗവും മറ്റൊരു അംഗത്തിന്റെ വിവാഹാവസരത്തിൽ ₹5000 (അയ്യായിരം രൂപ) വീതം അടയ്ക്കേണ്ടതാണ്. പണം കൃത്യമായി സമയത്ത് അടയ്ക്കേണ്ടത് ഓരോ അംഗത്തിന്റെയും വ്യക്തിപരമായ ഉത്തരവാദിത്വമാണ്."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "3. Marriage Notification" : "3. വിവാഹ അറിയിപ്പ് (Marriage Notification)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "Members must inform the fund coordinators at least 45 days in advance when their wedding is finalized. The coordinators shall issue official notification to all members 30 days before the wedding for payment collection."
                    : "കുറിയിൽ അംഗമായിട്ടുള്ളവർ, തങ്ങളുടെ വിവാഹം നിശ്ചയിച്ചാൽ കുറഞ്ഞത് 45 ദിവസ മുമ്പ് കുറിയുടെ ഉത്തരവാദികളോട് വിവരം അറിയിക്കണം. ഉത്തരവാദിത്വമുള്ളവർ എല്ലാ അംഗങ്ങളെയും വിവാഹത്തിന് 30 ദിവസങ്ങൾക്ക് മുമ്പ് പണമടക്കാനുള്ള ഔദ്യോഗിക അറിയിപ്പ് നൽകേണ്ടതാണ്."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "4. Payment Schedule" : "4. പണം അടയ്ക്കൽ സമയക്രമം (Payment Schedule)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "All members must submit their contribution to the responsible persons at least one week before the wedding. Those who receive the fund (married members) are obligated to contribute the specified amount for subsequent weddings."
                    : "എല്ലാ അംഗങ്ങളും വിവാഹത്തിന് ഒരാഴ്ച മുമ്പ് തന്നെ പണം ഉത്തരവാദികളായ വ്യക്തികൾക്ക് കൈമാറിക്കഴിഞ്ഞിരിക്കണം. പണം കൈപ്പറ്റിയവരും (വിവാഹിതരും) തങ്ങളുടെ കടമയായി നിശ്ചിത തുക പിന്നീട് അടയ്ക്കേണ്ടതാണ്."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "5. Disbursement of Fund" : "5. പണം കൈമാറ്റം (Disbursement of Fund)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "The collected amount shall be disbursed to the concerned member on the day before or on the wedding day. In emergency situations (e.g., urgent expenses), if funds are needed earlier, the coordinators must be informed at least two months in advance."
                    : "പിരിച്ചെടുത്ത തുക വിവാഹത്തിൻ്റെ മുൻദിവസമോ വിവാഹദിനത്തെയോ ആയിരിക്കും ബന്ധപ്പെട്ട അംഗത്തിന് കൈമാറുക. അത്യാവശ്യ സാഹചര്യങ്ങളിൽ (ഉദാഹരണം: അടിയന്തര ചെലവ്) പണം ആവശ്യമായാൽ, അതിനു കുറഞ്ഞത് രണ്ട് മാസം മുമ്പ് ഉത്തരവാദിത്വമുള്ളവരെ വിവരം അറിയിക്കണം."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "6. Duration of the Fund" : "6. കുറിയുടെ നിലനിൽപ്പ് (Duration of the Fund)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "This fund will naturally conclude once all members' weddings are completed. A member shall not withdraw from the fund after joining."
                    : "ഈ കുറി അതിലെ എല്ലാ അംഗങ്ങളുടെയും വിവാഹങ്ങൾ കഴിഞ്ഞാൽ സ്വാഭാവികമായി അവസാനിക്കുന്നതാണ്. ഒരു വ്യക്തി അംഗത്വം ആരംഭിച്ചതിനുശേഷം പിൻമാറാൻ പാടില്ല."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "7. Delayed Payment Clause" : "7. വൈകിയ പണമടവ് (Delayed Payment Clause)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "For those unable to pay on time (fully or partially), the amount will be recorded as debt in their name. The outstanding amount must be settled within one month."
                    : "നിശ്ചിത സമയത്ത് പണമടക്കാൻ സാധിക്കാത്തവർക്ക് (മുഴുവനായോ ഭാഗികമായോ) ആ തുക അവരുടെ പേരിൽ കടമായി രേഖപ്പെടുത്തും. അവശേഷിക്കുന്ന തുക ഒരു മാസത്തിനകം തീർപ്പാക്കേണ്ടതാണ്."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "8. Special Cases" : "8. പ്രത്യേക സാഹചര്യങ്ങൾ (Special Cases)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "If a member's wedding is postponed or cancelled, the previously collected amount will remain valid for the next wedding occasion. For non-payment cases, necessary actions/legal measures may be taken as per group decision."
                    : "ഒരു അംഗത്തിന്റെ വിവാഹം മാറ്റിയാൽ അല്ലെങ്കിൽ റദ്ദായാൽ, മുൻപ് അടച്ച തുക അടുത്ത വിവാഹാവസരത്തിൽ നിലനിൽക്കും. പണം അടക്കാത്തവർക്ക്, ഗ്രൂപ്പിൻ്റെ തീരുമാനപ്രകാരം ആവശ്യമായ നടപടികൾ / നിയമനടപടി സ്വീകരിക്കാം."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "9. Fund Management & Transparency" : "9. ഫണ്ട് നിയന്ത്രണം & സുതാര്യത (Fund Management & Transparency)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "A Register / Google Sheet / Account Book must be used to record collected and disbursed amounts. Fund management shall be handled by at least two responsible persons. Receipts / Digital records must be provided for all transactions."
                    : "പിരിച്ചെടുക്കുന്ന തുകയും കൈമാറുന്ന തുകയും രേഖപ്പെടുത്താൻ റജിസ്റ്റർ / Google Sheet / അക്കൗണ്ട് ബുക്ക് നിർബന്ധമായും ഉപയോഗിക്കണം. പണം കൈകാര്യം ചെയ്യുക കുറഞ്ഞത് രണ്ട് ഉത്തരവാദികളായ വ്യക്തികളാണ് ചെയ്യേണ്ടത്. എല്ലാ ഇടപാടുകൾക്കും രസീത് / ഡിജിറ്റൽ രേഖ നൽകേണ്ടതാണ്."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "10. Suggestions & Feedback" : "10. അഭിപ്രായങ്ങളും നിർദ്ദേശങ്ങളും (Suggestions & Feedback)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "Any opinions or suggestions related to the fund can be directly shared with any of the coordinators."
                    : "കുറിയുമായി ബന്ധപ്പെട്ട ഏതു വിധത്തിലുള്ള അഭിപ്രായങ്ങളോ നിർദ്ദേശങ്ങളോ ഉത്തരവാദികളിൽ ആരോടും നേരിട്ട് പങ്കുവെക്കാവുന്നതാണ്."
                  }
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {isEnglishVersion ? "11. Closure & Remaining Funds" : "11. അവസാന ഘട്ടം (Closure & Remaining Funds)"}
                </h4>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEnglishVersion
                    ? "The fund will conclude once all members' weddings are completed. If there are any remaining funds at the final stage, they may be utilized as per the decision taken in the general meeting."
                    : "എല്ലാ അംഗങ്ങളുടെയും വിവാഹം കഴിഞ്ഞാൽ കുറി അവസാനിക്കും. അവസാന ഘട്ടത്തിൽ ബാക്കിയുള്ള തുക ഉണ്ടെങ്കിൽ അത് പൊതുയോഗത്തിൽ എടുത്ത തീരുമാനം അനുസരിച്ച് വിനിയോഗിക്കാവുന്നതാണ്."
                  }
                </p>
              </div>

              {/* Official Document Style */}
              <div className="relative bg-white dark:bg-slate-900 border-4 border-double border-amber-700/30 dark:border-amber-600/30 rounded-none shadow-2xl overflow-hidden">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-amber-700/40 dark:border-amber-600/40"></div>
                <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-amber-700/40 dark:border-amber-600/40"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-amber-700/40 dark:border-amber-600/40"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-amber-700/40 dark:border-amber-600/40"></div>
                
                <div className="relative p-8 sm:p-10">
                  {/* Official Seal */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full blur-md opacity-20"></div>
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 dark:from-amber-500 dark:to-amber-700 flex items-center justify-center border-4 border-amber-300 dark:border-amber-400 shadow-lg">
                        <FileCheck className="h-10 w-10 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="text-center mb-8 space-y-2">
                    <h4 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-wide">
                      {isEnglishVersion ? "Acknowledgement & Signatures" : "അംഗീകാരം"}
                    </h4>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-widest">
                      {isEnglishVersion ? "Section 12" : "Acknowledgement & Signatures"}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent"></div>
                      <div className="w-2 h-2 rounded-full bg-amber-700/40"></div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent"></div>
                    </div>
                  </div>

                  {/* Declaration Text */}
                  <div className="mb-8 text-center max-w-3xl mx-auto">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                      {isEnglishVersion
                        ? "Having read and understood this regulation completely, the following members hereby acknowledge and accept all the terms mentioned herein."
                        : "ഈ നിയമാവലി പൂർണ്ണമായി വായിച്ചറിഞ്ഞ്, ഇതിലെ എല്ലാ വ്യവസ്ഥകളും അംഗീകരിച്ചുകൊണ്ട് താഴെപ്പറയുന്നവർ ഒപ്പുവെക്കുന്നു."
                      }
                    </p>
                    {!isEnglishVersion && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">
                        "Having read and understood all regulations, the following members hereby acknowledge and accept these terms."
                      </p>
                    )}
                  </div>
                  
                  {/* Members Grid */}
                  <div className="grid gap-8 lg:grid-cols-2 mb-8">
                    {/* Responsible Members */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b-2 border-amber-700/20 dark:border-amber-600/20">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                  <div>
                          <h5 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {isEnglishVersion ? "Responsible Members" : "ഉത്തരവാദിത്വമുള്ളവർ"}
                          </h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                            {isEnglishVersion ? "Fund Coordinators" : "Responsible Members"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {responsibleMembers.map((member, index) => {
                          const memberStatus = getMemberAcknowledgementStatus(member.id);
                          const isApproved = memberStatus?.acknowledged === true;
                          
                          return (
                            <div 
                              key={member.id}
                              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {String(index + 1).padStart(2, '0')}.
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                  {member.name}
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700 dark:to-transparent"></div>
                              </div>
                              {isApproved ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border border-green-300 dark:border-green-700 shadow-sm min-w-[100px] justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50"></div>
                                  <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wide">
                                    Approved
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-300 dark:border-amber-700 shadow-sm min-w-[100px] justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div>
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                    Pending
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Regular Members */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b-2 border-amber-700/20 dark:border-amber-600/20">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {isEnglishVersion ? "Members" : "അംഗങ്ങൾ"}
                          </h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                            {isEnglishVersion ? "Fund Participants" : "Members"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {regularMembers.map((member, index) => {
                          const memberStatus = getMemberAcknowledgementStatus(member.id);
                          const isApproved = memberStatus?.acknowledged === true;
                          
                          return (
                            <div 
                              key={member.id}
                              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                {String(index + 1).padStart(2, '0')}.
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                  {member.name}
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-300 via-slate-200 to-transparent dark:from-slate-600 dark:via-slate-700 dark:to-transparent"></div>
                              </div>
                              {isApproved ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border border-green-300 dark:border-green-700 shadow-sm min-w-[100px] justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50"></div>
                                  <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wide">
                                    Approved
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-300 dark:border-amber-700 shadow-sm min-w-[100px] justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div>
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                    Pending
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Official Footer */}
                  <div className="mt-8 pt-6 border-t-2 border-double border-amber-700/20 dark:border-amber-600/20">
                    <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="h-px w-12 bg-amber-700/20"></div>
                      <span className="font-serif italic text-center px-2">
                        {isEnglishVersion
                          ? "This document serves as official acknowledgement of the CBMS Marriage Fund regulations"
                          : "ഈ രേഖ CBMS വിവാഹ ഫണ്ട് നിയന്ത്രണങ്ങളുടെ ഔദ്യോഗിക അംഗീകാരമായി പ്രവർത്തിക്കുന്നു"
                        }
                      </span>
                      <div className="h-px w-12 bg-amber-700/20"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasAcknowledgedTerms && getAcknowledgementData() && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500 text-white flex-shrink-0">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Terms Acknowledged
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Acknowledged by <span className="font-semibold">{getAcknowledgementData()?.userName}</span>
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Date: {getAcknowledgementData()?.date}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowTermsDialog(false)}
              className="px-4 sm:px-6 py-2"
            >
              Close
            </Button>
             <Button
                onClick={handleVoiceClick}
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-lg transition-all duration-200 hover:scale-105 gap-2",
                  isReading 
                    ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800/40" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                title={isReading ? "Stop Reading" : "Read Aloud"}
              >
                {isReading ? (
                  <VolumeX className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span className="font-semibold text-xs">
                  {isReading ? "Stop" : "Voice"}
                </span>
              </Button>
              
              <Button
                onClick={handleTranslationToggle}
                variant="outline"
                size="sm"
                className="rounded-lg transition-all duration-200 hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
                title={isEnglishVersion ? "Switch to Malayalam" : "Switch to English"}
              >
                <Languages className="h-4 w-4" />
                <span className="font-semibold text-xs">
                  {isEnglishVersion ? "മലയാളം" : "English"}
                </span>
              </Button>
              
            {!hasAcknowledgedTerms && (
              <Button
                  onClick={handleAcknowledgeClick}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 sm:px-6 py-2"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                I Acknowledge & Accept
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
              Are you sure you have read and understood all the terms and conditions of the CBMS Marriage Fund? By acknowledging, you agree to comply with all the regulations mentioned.
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