import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Shield, Heart, Calendar, DollarSign, TrendingUp, CreditCard, Clock, Edit, Phone, Camera } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '@/services/users';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { fetchDashboardStats } from '@/services/dashboard';
// Import the Cropper Component
import { ImageCropperDialog } from '@/components/ImageCropperDialog';

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

const Profile = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // --- UI STATE ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // --- CROPPER STATE ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    marital_status: 'Unmarried',
    phone: '',
    email: '',
    profile_photo: '' // Used for Preview URL
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    enabled: !!currentUser,
  });

  // 1. Fetch Payments for Statistics
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await api.get('/payments/');
      return res.data;
    }
  });

  // Populate form when user loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        username: currentUser.username || '',
        marital_status: currentUser.marital_status || 'Unmarried',
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        profile_photo: fixProfilePhotoUrl(currentUser.profile_photo) || ''
      });
    }
  }, [currentUser]);

  // 2. Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => updateUser({ id: currentUser!.id, data }),
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated successfully" });
      setIsEditDialogOpen(false);
      // Reload to refresh AuthContext context data
      window.location.reload();
    },
    onError: (error: any) => {
      console.error("Update Error:", error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  });

  if (authLoading) {
    return <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!currentUser) return null;

  // --- HANDLERS ---

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 1. User selects a file -> Open Cropper
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTempImageSrc(e.target?.result as string);
        setIsCropperOpen(true); // Open Modal
      };
      reader.readAsDataURL(file);
      
      // Reset value to allow selecting same file again if needed
      event.target.value = ''; 
    }
  };

  // 2. Cropper finished -> Update State
  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    setPhotoFile(croppedFile); // Store raw file for upload
    setFormData(prev => ({ ...prev, profile_photo: previewUrl })); // Update UI preview
  };

  // 3. Save Profile -> Send to Backend
  const handleSaveProfile = () => {
    const data = new FormData();
    
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    data.append('first_name', firstName);
    data.append('last_name', lastName);
    data.append('username', formData.username);
    data.append('email', formData.email);
    data.append('phone', formData.phone);
    data.append('marital_status', formData.marital_status);

    // Append Photo ONLY if changed
    if (photoFile) {
      data.append('profile_photo', photoFile);
    }

    updateMutation.mutate(data);
  };

  // --- STATISTICS LOGIC ---
  const userPayments = payments.filter((p: any) => String(p.user) === String(currentUser.id));
  
  const totalPaid = userPayments
    .filter((p: any) => p.transaction_type === 'COLLECT')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    
  const marriageTarget = Number(currentUser.assigned_monthly_amount) > 0 
    ? Number(currentUser.assigned_monthly_amount) 
    : (dashboardStats?.system_target || 0);

  const toCollect = marriageTarget - totalPaid;
  const progress = marriageTarget > 0 ? (totalPaid / marriageTarget) * 100 : 0;
  
  const sortedPayments = [...userPayments].sort((a: any, b: any) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastPayment = sortedPayments.length > 0 ? sortedPayments[0] : null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View your account information and statistics</p>
        </div>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-fit">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500 text-white"><Edit className="h-5 w-5" /></div>
                Edit Profile
              </DialogTitle>
              <DialogDescription>Update your personal information and profile details.</DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              
              {/* --- PROFILE PHOTO UPLOAD (Overlay Strategy) --- */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 border-2 border-slate-200 dark:border-slate-700">
                    <AvatarImage src={fixProfilePhotoUrl(formData.profile_photo)} alt="Profile" className="object-cover" />
                    <AvatarFallback className="text-2xl bg-slate-100 dark:bg-slate-800">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Overlay Input for Reliable Clicking */}
                  <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg z-10 border-2 border-white dark:border-slate-900 cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Change Profile Photo"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Click the camera icon to update photo</p>
              </div>
              {/* ----------------------------------- */}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="h-12" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)} className="h-12" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="h-12" placeholder="Enter your email address" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="h-12" placeholder="Enter your phone number" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select value={formData.marital_status} onValueChange={(value) => handleInputChange('marital_status', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Unmarried">Unmarried</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={updateMutation.isPending}>Cancel</Button>
              <Button onClick={handleSaveProfile} disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {updateMutation.isPending ? 'Saving...' : (<><Edit className="h-4 w-4 mr-2" /> Save Changes</>)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- CROPPER COMPONENT --- */}
        <ImageCropperDialog
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
        />
      </div>

      {/* Profile Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500 text-white flex-shrink-0"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Total Paid</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-100">₹{totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">Marriage fund</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-green-500 text-white flex-shrink-0"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Target Amount</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100">₹{marriageTarget.toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-500 dark:text-green-400">Marriage fund goal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-500 text-white flex-shrink-0"><Calendar className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400">To Collect</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 dark:text-orange-100">₹{Math.max(0, toCollect).toLocaleString('en-IN')}</p>
                <p className="text-xs text-orange-500 dark:text-orange-400">Remaining amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500 text-white flex-shrink-0"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">Total Payments</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100">{userPayments.length}</p>
                <p className="text-xs text-purple-500 dark:text-purple-400">Payment count</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500 text-white flex-shrink-0"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-cyan-600 dark:text-cyan-400">Progress</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-900 dark:text-cyan-100">{progress.toFixed(1)}%</p>
                <p className="text-xs text-cyan-500 dark:text-cyan-400">Fund completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-500 text-white flex-shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Last Payment</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {lastPayment ? new Date(lastPayment.date).toLocaleDateString('en-IN') : 'None'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recent activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-slate-500 text-white"><TrendingUp className="h-5 w-5" /></div>
            Marriage Fund Progress
          </CardTitle>
          <CardDescription className="text-slate-700 dark:text-slate-300">Your progress towards the marriage fund target</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Progress: {progress.toFixed(1)}%</span>
              <span>₹{totalPaid.toLocaleString('en-IN')} / ₹{marriageTarget.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <div className="p-2 rounded-lg bg-blue-500 text-white"><User className="h-5 w-5" /></div>
            Personal Information
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">Your account details and profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-blue-200 dark:border-blue-700">
            <Avatar className="h-16 w-16">
              <AvatarImage src={fixProfilePhotoUrl(currentUser.profile_photo)} alt="Profile" className="object-cover" />
              <AvatarFallback className="text-xl">{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{currentUser.name}</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"><User className="h-4 w-4" /><span>Full Name</span></div>
              <p className="text-lg font-medium text-blue-900 dark:text-blue-100">{currentUser.name}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"><Mail className="h-4 w-4" /><span>Username</span></div>
              <p className="text-lg font-medium text-blue-900 dark:text-blue-100">{currentUser.username}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"><Mail className="h-4 w-4" /><span>Email Address</span></div>
              <p className="text-lg font-medium text-blue-900 dark:text-blue-100">{currentUser.email || 'Not provided'}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"><Phone className="h-4 w-4" /><span>Phone Number</span></div>
              <p className="text-lg font-medium text-blue-900 dark:text-blue-100">{currentUser.phone || 'Not provided'}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"><Shield className="h-4 w-4" /><span>Role</span></div>
              <Badge variant="outline" className="capitalize bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                {currentUser.role.replace('_', ' ')}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"><Heart className="h-4 w-4" /><span>Marital Status</span></div>
              <Badge variant="outline" className={currentUser.marital_status === 'Married' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-800 border-slate-200'}>
                {currentUser.marital_status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;