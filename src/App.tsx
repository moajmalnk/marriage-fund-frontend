import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Team from "./pages/Team";
import FundRequests from "./pages/FundRequests";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import ManageUsers from "./pages/ManageUsers";
import Install from "./pages/Install";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
import WalletApprovals from "./pages/WalletApprovals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  usePrivacyMode();
  
  // Optional fullscreen functionality - only on specific user request
  React.useEffect(() => {
    const handleFullscreenRequest = async (event: KeyboardEvent) => {
      // Only trigger fullscreen on F11 key press or Ctrl+Shift+F
      if (event.key === 'F11' || (event.ctrlKey && event.shiftKey && event.key === 'F')) {
        event.preventDefault();
        
        try {
          // Check if fullscreen is already active
          if (document.fullscreenElement || 
              (document as any).webkitFullscreenElement || 
              (document as any).msFullscreenElement) {
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
      }
    };

    // Add keyboard event listener for fullscreen toggle
    document.addEventListener('keydown', handleFullscreenRequest);

    return () => {
      document.removeEventListener('keydown', handleFullscreenRequest);
    };
  }, []);
  
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/install" element={<Install />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/payments" element={<Layout><Payments /></Layout>} />
        <Route path="/team" element={<Layout><Team /></Layout>} />
        <Route path="/fund-requests" element={<Layout><FundRequests /></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/manage-users" element={<Layout><ManageUsers /></Layout>} />
        <Route path="/wallet-approvals" element={<Layout><WalletApprovals /></Layout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
