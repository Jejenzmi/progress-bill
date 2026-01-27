import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Send, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Quotation {
  id: string;
  project_name: string;
  grand_total: number | null;
  approval_status: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  client_name?: string;
}

interface Comment {
  id: string;
  quotation_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name?: string;
}

interface QuotationApprovalDialogProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: 'submit' | 'review';
}

export function QuotationApprovalDialog({
  quotation,
  open,
  onOpenChange,
  onSuccess,
  mode,
}: QuotationApprovalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (open && quotation) {
      fetchComments();
    }
  }, [open, quotation?.id]);

  const fetchComments = async () => {
    if (!quotation) return;
    
    setLoadingComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('quotation_comments')
        .select('*')
        .eq('quotation_id', quotation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user names for comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const commentsWithNames = (commentsData || []).map(c => ({
        ...c,
        user_name: profileMap.get(c.user_id) || 'Unknown User',
      }));

      setComments(commentsWithNames);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!quotation || !user || !newComment.trim()) return;

    setAddingComment(true);
    try {
      const { error } = await supabase
        .from('quotation_comments')
        .insert({
          quotation_id: quotation.id,
          user_id: user.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      
      toast({
        title: 'Berhasil',
        description: 'Komentar berhasil ditambahkan',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Gagal menambahkan komentar',
        variant: 'destructive',
      });
    } finally {
      setAddingComment(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmitForApproval = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          approval_status: 'pending',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
        })
        .eq('id', quotation.id);

      if (error) throw error;

      // Add system comment if there's a note
      if (newComment.trim()) {
        await supabase
          .from('quotation_comments')
          .insert({
            quotation_id: quotation.id,
            user_id: user.id,
            comment: `[Submit] ${newComment.trim()}`,
          });
      }

      toast({
        title: 'Berhasil',
        description: 'Quotation telah disubmit untuk approval',
      });

      onSuccess();
      onOpenChange(false);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal submit quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!quotation || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          status: 'Sent',
        })
        .eq('id', quotation.id);

      if (error) throw error;

      // Add system comment
      await supabase
        .from('quotation_comments')
        .insert({
          quotation_id: quotation.id,
          user_id: user.id,
          comment: newComment.trim() ? `[Approved] ${newComment.trim()}` : '[Approved] Quotation disetujui',
        });

      toast({
        title: 'Berhasil',
        description: 'Quotation telah disetujui',
      });

      onSuccess();
      onOpenChange(false);
      setNewComment('');
    } catch (error) {
      console.error('Error approving quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyetujui quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!quotation || !user) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          approval_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason,
        })
        .eq('id', quotation.id);

      if (error) throw error;

      // Add system comment
      await supabase
        .from('quotation_comments')
        .insert({
          quotation_id: quotation.id,
          user_id: user.id,
          comment: `[Rejected] ${rejectionReason}`,
        });

      toast({
        title: 'Berhasil',
        description: 'Quotation telah ditolak',
      });

      onSuccess();
      onOpenChange(false);
      setRejectionReason('');
      setNewComment('');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menolak quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!quotation) return null;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="h-3 w-3 mr-1" /> Menunggu Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="h-3 w-3 mr-1" /> Ditolak</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'submit' ? 'Submit untuk Approval' : 'Review Quotation'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'submit'
              ? 'Kirim quotation ini untuk direview'
              : 'Review dan berikan keputusan untuk quotation ini'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Quotation Info */}
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{quotation.project_name}</h4>
                <p className="text-sm text-muted-foreground">{quotation.client_name || 'Klien tidak diketahui'}</p>
              </div>
              {getStatusBadge(quotation.approval_status)}
            </div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(quotation.grand_total || 0)}
            </div>
            {quotation.submitted_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Disubmit: {format(new Date(quotation.submitted_at), 'dd MMM yyyy HH:mm', { locale: id })}
              </p>
            )}
          </div>

          {/* Comments Section */}
          <div className="flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4" />
              <Label className="text-sm font-medium">Catatan & Komentar</Label>
            </div>
            
            <ScrollArea className="h-32 border rounded-lg p-3 bg-background">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada komentar
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-xs">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'dd MMM HH:mm', { locale: id })}
                        </span>
                      </div>
                      <p className={`pl-5 ${
                        comment.comment.startsWith('[Approved]') ? 'text-green-600 dark:text-green-400' :
                        comment.comment.startsWith('[Rejected]') ? 'text-red-600 dark:text-red-400' :
                        comment.comment.startsWith('[Submit]') ? 'text-blue-600 dark:text-blue-400' :
                        ''
                      }`}>
                        {comment.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Add Comment */}
            <div className="flex gap-2 mt-2">
              <Textarea
                placeholder="Tambahkan catatan..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleAddComment}
                disabled={addingComment || !newComment.trim()}
              >
                {addingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Rejection Reason (only for review mode) */}
          {mode === 'review' && quotation.approval_status === 'pending' && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Alasan Penolakan (jika ditolak)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Masukkan alasan penolakan..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          )}

          {quotation.rejection_reason && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Alasan Penolakan:</p>
              <p className="text-sm text-red-700 dark:text-red-300">{quotation.rejection_reason}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          
          {mode === 'submit' && quotation.approval_status !== 'pending' && (
            <Button onClick={handleSubmitForApproval} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit untuk Approval
            </Button>
          )}

          {mode === 'review' && quotation.approval_status === 'pending' && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Tolak
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Setujui
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
