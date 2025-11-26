import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, CheckCircle, AlertCircle, Info, XCircle, CreditCard, Heart, Megaphone,
  Check, Trash2, Clock, Star, Eye, EyeOff, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/services/notifications';
import { useAuth } from '@/contexts/AuthContext'; // Import Auth
import api from '@/lib/api'; // Import API for custom call
import { toast } from '@/hooks/use-toast';
import { Notification } from '@/types';

const Notifications = () => {
  const { currentUser } = useAuth(); // Get current user
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  
  // Announcement State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementData, setAnnouncementData] = useState({ title: '', message: '' });

  // --- API Data ---
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  // --- Mutations ---
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Success", description: "All notifications marked as read" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
      toast({ title: "Deleted", description: "Notification removed" });
    }
  });

  const announceMutation = useMutation({
    mutationFn: async (data: { title: string; message: string }) => {
      const response = await api.post('/notifications/announce/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowAnnouncementModal(false);
      setAnnouncementData({ title: '', message: '' });
      toast({ title: "Sent", description: "Announcement broadcast to all members" });
    },
    onError: () => {
        toast({ title: "Error", description: "Failed to send announcement", variant: "destructive" });
    }
  });

  // --- Helpers ---
  const getNotificationIcon = (type: string) => {
    const t = type?.toLowerCase() || 'info';
    switch (t) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'info': return <Info className="h-5 w-5 text-blue-600" />;
      case 'payment': return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'wedding': return <Heart className="h-5 w-5 text-pink-600" />;
      case 'announcement': return <Megaphone className="h-5 w-5 text-indigo-600" />;
      default: return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    const t = type?.toLowerCase() || 'info';
    switch (t) {
      case 'success': return 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
      case 'error': return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'info': return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      case 'payment': return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20';
      case 'wedding': return 'border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20';
      case 'announcement': return 'border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20';
      default: return 'border-l-slate-500 bg-slate-50/50 dark:bg-slate-950/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase() || 'low';
    switch (p) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const handleDeleteNotification = (id: string) => {
    setNotificationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteNotification = () => {
    if (notificationToDelete) {
        deleteMutation.mutate(notificationToDelete);
    }
  };

  const handleAnnounce = () => {
      if(!announcementData.title || !announcementData.message) return;
      announceMutation.mutate(announcementData);
  };

  const unreadCount = useMemo(() => notifications.filter((n: Notification) => !n.is_read).length, [notifications]);
  const totalCount = notifications.length;
  const highPriorityCount = useMemo(() => notifications.filter((n: Notification) => n.priority === 'HIGH' && !n.is_read).length, [notifications]);
  const thisWeekCount = useMemo(() => notifications.filter((n: Notification) => {
    const d = new Date(n.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length, [notifications]);

  if (isLoading) {
    return <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Stay updated with all CBMS Marriage Fund activities</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            <Bell className="h-4 w-4 mr-1" />
            {unreadCount} unread
          </Badge>
          
          {/* Mark All Read Button */}
          {unreadCount > 0 && (
            <Button onClick={() => markAllReadMutation.mutate()} variant="outline" size="sm" className="gap-2">
              <Check className="h-4 w-4" /> Mark all read
            </Button>
          )}

          {/* Admin Announcement Button */}
          {currentUser?.role === 'admin' && (
            <Dialog open={showAnnouncementModal} onOpenChange={setShowAnnouncementModal}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Megaphone className="h-4 w-4" /> Broadcast
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Broadcast Announcement</DialogTitle>
                        <DialogDescription>Send a wedding or general announcement to all members.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input 
                                placeholder="e.g., Wedding of [Name]" 
                                value={announcementData.title}
                                onChange={(e) => setAnnouncementData({...announcementData, title: e.target.value})}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Message</Label>
                            <Textarea 
                                placeholder="Details about the event..." 
                                value={announcementData.message}
                                onChange={(e) => setAnnouncementData({...announcementData, message: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAnnouncementModal(false)}>Cancel</Button>
                        <Button onClick={handleAnnounce} disabled={announceMutation.isPending} className="bg-indigo-600 text-white">
                            {announceMutation.isPending ? "Sending..." : "Send Broadcast"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500 text-white flex-shrink-0"><Bell className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Total Notifications</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-100">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-red-500 text-white flex-shrink-0"><EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Unread</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-900 dark:text-red-100">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-green-500 text-white flex-shrink-0"><Star className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">High Priority</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100">{highPriorityCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500 text-white flex-shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">This Week</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100">{thisWeekCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No notifications found</h3>
              <p className="text-slate-600 dark:text-slate-400">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification: Notification) => (
            <Card 
              key={notification.id} 
              className={cn(
                "transition-all duration-200 hover:shadow-md border-l-4",
                getNotificationColor(notification.notification_type),
                !notification.is_read && "ring-2 ring-blue-200 dark:ring-blue-800"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn("font-semibold text-slate-900 dark:text-slate-100", !notification.is_read && "font-bold")}>
                             {notification.title}
                          </h3>
                          {!notification.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(notification.created_at)}</span>
                          <Badge variant="secondary" className={cn("text-xs", getPriorityColor(notification.priority))}>
                            {notification.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          {!notification.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(notification.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                             <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNotification(notification.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" /> Delete Notification
            </AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this notification? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNotification} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;