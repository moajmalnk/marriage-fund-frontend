import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Trash2, Users, Phone, Mail, Camera, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/services/users';
// 1. Import the Cropper
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

const ManageUsers = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- UI STATE ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  // --- CROPPER STATE (NEW) ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '', 
    role: 'member',
    marital_status: 'Unmarried',
    email: '',
    phone: '',
    profile_photo: '', 
    responsible_member: '',
    assigned_monthly_amount: '0',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // 1. Fetch Real Users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const responsibleMembers = users.filter((u: any) => u.role === 'responsible_member');

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.username ? "Username already exists" : "Failed to create user";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update user", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({ title: "Deleted", description: "User removed from system" });
    }
  });

  if (authLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  // --- HANDLERS ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameParts = formData.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const data = new FormData();
    data.append('username', formData.username);
    data.append('first_name', firstName);
    data.append('last_name', lastName);
    
    if (formData.email) data.append('email', formData.email);
    if (formData.phone) data.append('phone', formData.phone);
    
    data.append('role', formData.role);
    data.append('marital_status', formData.marital_status);
    data.append('assigned_monthly_amount', formData.assigned_monthly_amount);
    
    if (formData.responsible_member) {
      data.append('responsible_member', formData.responsible_member);
    }

    if (photoFile) {
      data.append('profile_photo', photoFile);
    }

    if (editingUserId) {
      updateMutation.mutate({ id: editingUserId, data });
    } else {
      if (!formData.password) {
        toast({ title: "Error", description: "Password is required", variant: "destructive" });
        return;
      }
      data.append('password', formData.password);
      createMutation.mutate(data);
    }
  };

  // 1. Handle File Selection -> Open Cropper
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTempImageSrc(e.target?.result as string);
        setIsCropperOpen(true); // Open Cropper Modal
      };
      reader.readAsDataURL(file);
      
      // Reset value to allow re-selecting the same file
      event.target.value = '';
    }
  };

  // 2. Handle Crop Completion -> Set Form Data
  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    setPhotoFile(croppedFile);
    setFormData(prev => ({ ...prev, profile_photo: previewUrl }));
  };

  const handleEdit = (user: any) => {
    setEditingUserId(user.id);
    setPhotoFile(null);
    
    setFormData({
      username: user.username,
      name: user.name || (user.first_name + ' ' + user.last_name),
      password: '', 
      role: user.role,
      marital_status: user.marital_status,
      email: user.email || '',
      phone: user.phone || '',
      profile_photo: fixProfilePhotoUrl(user.profile_photo) || '', 
      responsible_member: user.responsible_member || '',
      assigned_monthly_amount: user.assigned_monthly_amount?.toString() || '120000'
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '', name: '', password: '',
      role: 'member', marital_status: 'Unmarried',
      email: '', phone: '', profile_photo: '',
      responsible_member: '', assigned_monthly_amount: '0'
    });
    setPhotoFile(null);
    setEditingUserId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Create, edit, and manage all users</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] mx-2 sm:mx-4 h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <DialogHeader className="pb-3 sm:pb-6">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500 text-white">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                {editingUserId ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingUserId ? 'Update user information and settings' : 'Add a new user to the system with appropriate role and permissions'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
              
              {/* --- PROFILE PHOTO SECTION (With Overlay + Cropper) --- */}
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
                      onChange={handleFileSelect} // Calls handler to open Cropper
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Change Profile Photo"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the camera icon to upload a profile photo
                </p>
              </div>
              {/* -------------------------------------------------- */}

              <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="h-12"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUserId ? 'Password (leave blank to keep)' : 'Password'}
                  </Label>
                  <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-12 pl-10"
                        placeholder={editingUserId ? "New password" : "*******"}
                        required={!editingUserId}
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-2">
                   <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: string) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="responsible_member">Responsible Member</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select value={formData.marital_status} onValueChange={(value: string) => setFormData({ ...formData, marital_status: value })}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Unmarried">Unmarried</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.role === 'member' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="responsible">Responsible Member</Label>
                     <Select value={formData.responsible_member?.toString()} onValueChange={(value) => setFormData({ ...formData, responsible_member: value })}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select responsible member" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsibleMembers.map((member: any) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name || member.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingUserId ? 'Update User' : 'Create User')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- CROPPER COMPONENT (Integrated Here) --- */}
        <ImageCropperDialog
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
        />
      </div>

      <Card className="bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
              <Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            All Users
          </CardTitle>
          <CardDescription>
            Manage all members, leaders, and admins in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Marital Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={fixProfilePhotoUrl(user.profile_photo)} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {user.email || 'Not provided'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {user.phone || 'Not provided'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.marital_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteClick(user)}
                          className="hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageUsers;