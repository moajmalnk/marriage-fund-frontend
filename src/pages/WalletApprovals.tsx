import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWalletTransactions, approveWalletTransaction, rejectWalletTransaction } from '@/services/wallet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, Wallet, AlertCircle } from 'lucide-react';
import { fixProfilePhotoUrl } from '@/lib/utils'; // Ensure this utility is imported

const WalletApprovals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Fetch Transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: fetchWalletTransactions,
  });

  // Filter only Pending requests
  const pendingTransactions = transactions.filter((t: any) => t.status === 'PENDING');

  // 2. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: approveWalletTransaction,
    onMutate: (id) => setProcessingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      // Also invalidate payments/dashboard since approval adds to collections
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      
      toast({ 
        title: "Approved", 
        description: "Deposit verified and added to member's collection total.",
        className: "bg-green-50 border-green-200 text-green-800"
      });
      setProcessingId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve transaction", variant: "destructive" });
      setProcessingId(null);
    }
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: rejectWalletTransaction,
    onMutate: (id) => setProcessingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      toast({ title: "Rejected", description: "Deposit request rejected." });
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-blue-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verify Deposits</h1>
          <p className="text-muted-foreground">Review pending wallet transactions</p>
        </div>
        <Badge variant="outline" className="h-8 px-3 text-sm">
          {pendingTransactions.length} Pending
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Pending Requests
          </CardTitle>
          <CardDescription>Verify the transaction ID with your bank record before approving.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
              <p>All caught up! No pending deposits.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method & Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={fixProfilePhotoUrl(tx.user_profile_photo)} />
                            <AvatarFallback>{tx.user_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{tx.user_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-lg text-emerald-600">
                          ₹{Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs uppercase">
                            {tx.payment_method.replace('_', ' ')}
                          </Badge>
                          <div className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit select-all">
                            {tx.transaction_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                        <div className="text-xs">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => rejectMutation.mutate(tx.id)}
                            disabled={!!processingId}
                          >
                            {processingId === tx.id ? '...' : <XCircle className="h-4 w-4" />}
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approveMutation.mutate(tx.id)}
                            disabled={!!processingId}
                          >
                            {processingId === tx.id ? '...' : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletApprovals;