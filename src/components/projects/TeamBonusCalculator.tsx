import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  Loader2,
  Percent,
  Award,
  TrendingUp,
  Send,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  AlertCircle,
  Clock
} from 'lucide-react';

interface TeamMember {
  id?: string;
  user_id: string;
  role_name: string;
  man_days: number;
  complexity_weight: number;
  contribution_notes: string;
  user_name?: string;
}

interface BonusSettings {
  id?: string;
  bonus_pool_percentage: number;
  margin_amount: number;
  bonus_pool_amount: number;
  is_finalized: boolean;
  notes: string;
  finalized_status: 'draft' | 'proposed' | 'finance_approved' | 'finalized' | 'rejected';
  proposed_by?: string;
  proposed_at?: string;
  approved_by_finance?: string;
  approved_at_finance?: string;
  finalized_by?: string;
  finalized_at?: string;
  rejection_reason?: string;
}

interface TeamMemberBonus {
  id?: string;
  team_member_id: string;
  weighted_contribution: number;
  contribution_percentage: number;
  bonus_amount: number;
  status: string;
  user_name?: string;
  role_name?: string;
}

interface TeamBonusCalculatorProps {
  projectId?: string;
  quotationId?: string;
  marginAmount?: number;
  onClose?: () => void;
  compact?: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const COMPLEXITY_WEIGHTS = [
  { value: '0.5', label: '0.5 - Sangat Rendah' },
  { value: '0.75', label: '0.75 - Rendah' },
  { value: '1.0', label: '1.0 - Normal' },
  { value: '1.25', label: '1.25 - Tinggi' },
  { value: '1.5', label: '1.5 - Sangat Tinggi' },
  { value: '1.75', label: '1.75 - Kompleks' },
  { value: '2.0', label: '2.0 - Sangat Kompleks' },
];

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  proposed: { label: 'Menunggu Approval Finance', variant: 'secondary' },
  finance_approved: { label: 'Disetujui Finance', variant: 'default' },
  finalized: { label: 'Finalisasi', variant: 'default' },
  rejected: { label: 'Ditolak', variant: 'destructive' },
};

export function TeamBonusCalculator({ 
  projectId, 
  quotationId, 
  marginAmount = 0,
  onClose,
  compact = false
}: TeamBonusCalculatorProps) {
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [bonusSettings, setBonusSettings] = useState<BonusSettings>({
    bonus_pool_percentage: 10,
    margin_amount: marginAmount,
    bonus_pool_amount: marginAmount * 0.1,
    is_finalized: false,
    notes: '',
    finalized_status: 'draft',
  });
  const [calculatedBonuses, setCalculatedBonuses] = useState<TeamMemberBonus[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = hasRole('admin');
  const isFinance = hasRole('finance');
  const isPM = hasRole('project_manager');
  const isMarketing = hasRole('marketing');
  const isBDO = hasRole('bdo');

  const canEdit = (isAdmin || isFinance || isPM || isMarketing || isBDO) && 
    bonusSettings.finalized_status === 'draft';
  const canPropose = (isPM || isMarketing || isBDO || isAdmin) && 
    bonusSettings.finalized_status === 'draft';
  const canApproveFinance = (isFinance || isAdmin) && 
    bonusSettings.finalized_status === 'proposed';
  const canFinalize = isAdmin && 
    bonusSettings.finalized_status === 'finance_approved';
  const canReject = (isFinance || isAdmin) && 
    ['proposed', 'finance_approved'].includes(bonusSettings.finalized_status);

  useEffect(() => {
    fetchData();
  }, [projectId, quotationId]);

  useEffect(() => {
    calculateBonuses();
  }, [teamMembers, bonusSettings.bonus_pool_amount]);

  const fetchData = async () => {
    try {
      // Fetch users for dropdown
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');

      if (profilesData) {
        setUsers(profilesData.map(p => ({ id: p.user_id, name: p.full_name || 'Unknown' })));
      }

      // Fetch existing team members
      let query = supabase
        .from('project_team_members')
        .select('*');

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (quotationId) {
        query = query.eq('quotation_id', quotationId);
      }

      const { data: membersData } = await query;

      if (membersData && membersData.length > 0) {
        const membersWithNames = membersData.map(m => ({
          ...m,
          user_name: profilesData?.find(p => p.user_id === m.user_id)?.full_name || 'Unknown',
        }));
        setTeamMembers(membersWithNames);
      }

      // Fetch existing bonus settings
      let bonusQuery = supabase
        .from('project_bonus_settings')
        .select('*');

      if (projectId) {
        bonusQuery = bonusQuery.eq('project_id', projectId);
      } else if (quotationId) {
        bonusQuery = bonusQuery.eq('quotation_id', quotationId);
      }

      const { data: bonusData } = await bonusQuery.single();

      if (bonusData) {
        setBonusSettings({
          id: bonusData.id,
          bonus_pool_percentage: Number(bonusData.bonus_pool_percentage),
          margin_amount: Number(bonusData.margin_amount),
          bonus_pool_amount: Number(bonusData.bonus_pool_amount),
          is_finalized: bonusData.is_finalized || false,
          notes: bonusData.notes || '',
          finalized_status: (bonusData.finalized_status as any) || 'draft',
          proposed_by: bonusData.proposed_by || undefined,
          proposed_at: bonusData.proposed_at || undefined,
          approved_by_finance: bonusData.approved_by_finance || undefined,
          approved_at_finance: bonusData.approved_at_finance || undefined,
          finalized_by: bonusData.finalized_by || undefined,
          finalized_at: bonusData.finalized_at || undefined,
          rejection_reason: bonusData.rejection_reason || undefined,
        });
      } else if (marginAmount > 0) {
        setBonusSettings(prev => ({
          ...prev,
          margin_amount: marginAmount,
          bonus_pool_amount: marginAmount * (prev.bonus_pool_percentage / 100),
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBonuses = () => {
    if (teamMembers.length === 0) {
      setCalculatedBonuses([]);
      return;
    }

    const contributions = teamMembers.map(member => ({
      ...member,
      weighted_contribution: member.man_days * member.complexity_weight,
    }));

    const totalContribution = contributions.reduce((sum, m) => sum + m.weighted_contribution, 0);

    const bonuses: TeamMemberBonus[] = contributions.map(member => {
      const contributionPercentage = totalContribution > 0 
        ? (member.weighted_contribution / totalContribution) * 100 
        : 0;
      
      return {
        team_member_id: member.id || '',
        user_name: member.user_name,
        role_name: member.role_name,
        weighted_contribution: member.weighted_contribution,
        contribution_percentage: Math.round(contributionPercentage * 100) / 100,
        bonus_amount: Math.round((contributionPercentage / 100) * bonusSettings.bonus_pool_amount),
        status: 'pending',
      };
    });

    setCalculatedBonuses(bonuses);
  };

  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      {
        user_id: '',
        role_name: '',
        man_days: 1,
        complexity_weight: 1.0,
        contribution_notes: '',
      },
    ]);
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string | number) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'user_id') {
      const foundUser = users.find(u => u.id === value);
      updated[index].user_name = foundUser?.name || 'Unknown';
    }
    
    setTeamMembers(updated);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateBonusPoolPercentage = (percentage: number) => {
    const validPercentage = Math.min(Math.max(percentage, 0), 100);
    setBonusSettings(prev => ({
      ...prev,
      bonus_pool_percentage: validPercentage,
      bonus_pool_amount: prev.margin_amount * (validPercentage / 100),
    }));
  };

  const updateMarginAmount = (amount: number) => {
    setBonusSettings(prev => ({
      ...prev,
      margin_amount: amount,
      bonus_pool_amount: amount * (prev.bonus_pool_percentage / 100),
    }));
  };

  const saveAll = async () => {
    if (teamMembers.some(m => !m.user_id || !m.role_name)) {
      toast({
        title: 'Validasi Gagal',
        description: 'Semua anggota tim harus memiliki User dan Role yang dipilih',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const bonusSettingsData = {
        project_id: projectId || null,
        quotation_id: quotationId || null,
        bonus_pool_percentage: bonusSettings.bonus_pool_percentage,
        margin_amount: bonusSettings.margin_amount,
        bonus_pool_amount: bonusSettings.bonus_pool_amount,
        is_finalized: bonusSettings.is_finalized,
        notes: bonusSettings.notes,
        finalized_status: bonusSettings.finalized_status,
      };

      let bonusSettingsId = bonusSettings.id;

      if (bonusSettings.id) {
        await supabase
          .from('project_bonus_settings')
          .update(bonusSettingsData)
          .eq('id', bonusSettings.id);
      } else {
        const { data: newSettings } = await supabase
          .from('project_bonus_settings')
          .insert(bonusSettingsData)
          .select()
          .single();
        
        if (newSettings) {
          bonusSettingsId = newSettings.id;
          setBonusSettings(prev => ({ ...prev, id: newSettings.id }));
        }
      }

      if (projectId) {
        await supabase.from('project_team_members').delete().eq('project_id', projectId);
      } else if (quotationId) {
        await supabase.from('project_team_members').delete().eq('quotation_id', quotationId);
      }

      if (teamMembers.length > 0) {
        const membersToInsert = teamMembers.map(m => ({
          project_id: projectId || null,
          quotation_id: quotationId || null,
          user_id: m.user_id,
          role_name: m.role_name,
          man_days: m.man_days,
          complexity_weight: m.complexity_weight,
          contribution_notes: m.contribution_notes,
        }));

        const { data: insertedMembers } = await supabase
          .from('project_team_members')
          .insert(membersToInsert)
          .select();

        if (insertedMembers && bonusSettingsId) {
          await supabase
            .from('team_member_bonuses')
            .delete()
            .eq('project_bonus_id', bonusSettingsId);

          const bonusesToInsert = insertedMembers.map((member, index) => ({
            project_bonus_id: bonusSettingsId,
            team_member_id: member.id,
            weighted_contribution: calculatedBonuses[index]?.weighted_contribution || 0,
            contribution_percentage: calculatedBonuses[index]?.contribution_percentage || 0,
            bonus_amount: calculatedBonuses[index]?.bonus_amount || 0,
            status: 'pending',
          }));

          await supabase.from('team_member_bonuses').insert(bonusesToInsert);
        }
      }

      toast({
        title: 'Berhasil',
        description: 'Data tim dan bonus berhasil disimpan',
      });
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePropose = async () => {
    if (teamMembers.length === 0) {
      toast({
        title: 'Validasi Gagal',
        description: 'Tambahkan minimal satu anggota tim sebelum mengajukan',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading('propose');
    try {
      await saveAll();

      const { error } = await supabase
        .from('project_bonus_settings')
        .update({
          finalized_status: 'proposed',
          proposed_by: user?.id,
          proposed_at: new Date().toISOString(),
        })
        .eq('id', bonusSettings.id);

      if (error) throw error;

      setBonusSettings(prev => ({
        ...prev,
        finalized_status: 'proposed',
        proposed_by: user?.id,
        proposed_at: new Date().toISOString(),
      }));

      toast({
        title: 'Berhasil',
        description: 'Pengajuan bonus telah dikirim untuk approval Finance',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengajukan bonus',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveFinance = async () => {
    setActionLoading('approve');
    try {
      const { error } = await supabase
        .from('project_bonus_settings')
        .update({
          finalized_status: 'finance_approved',
          approved_by_finance: user?.id,
          approved_at_finance: new Date().toISOString(),
        })
        .eq('id', bonusSettings.id);

      if (error) throw error;

      setBonusSettings(prev => ({
        ...prev,
        finalized_status: 'finance_approved',
        approved_by_finance: user?.id,
        approved_at_finance: new Date().toISOString(),
      }));

      toast({
        title: 'Berhasil',
        description: 'Bonus telah disetujui. Menunggu finalisasi Admin.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyetujui bonus',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async () => {
    setActionLoading('finalize');
    try {
      const { error: settingsError } = await supabase
        .from('project_bonus_settings')
        .update({
          finalized_status: 'finalized',
          is_finalized: true,
          finalized_by: user?.id,
          finalized_at: new Date().toISOString(),
        })
        .eq('id', bonusSettings.id);

      if (settingsError) throw settingsError;

      // Update all team member bonuses to approved
      await supabase
        .from('team_member_bonuses')
        .update({ status: 'approved' })
        .eq('project_bonus_id', bonusSettings.id);

      setBonusSettings(prev => ({
        ...prev,
        finalized_status: 'finalized',
        is_finalized: true,
        finalized_by: user?.id,
        finalized_at: new Date().toISOString(),
      }));

      toast({
        title: 'Berhasil',
        description: 'Bonus telah difinalisasi dan siap untuk pembayaran.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memfinalisasi bonus',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Mohon isi alasan penolakan',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading('reject');
    try {
      const { error } = await supabase
        .from('project_bonus_settings')
        .update({
          finalized_status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('id', bonusSettings.id);

      if (error) throw error;

      setBonusSettings(prev => ({
        ...prev,
        finalized_status: 'rejected',
        rejection_reason: rejectionReason,
      }));

      setShowRejectDialog(false);
      setRejectionReason('');

      toast({
        title: 'Berhasil',
        description: 'Pengajuan bonus telah ditolak.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menolak bonus',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetToDraft = async () => {
    setActionLoading('reset');
    try {
      const { error } = await supabase
        .from('project_bonus_settings')
        .update({
          finalized_status: 'draft',
          rejection_reason: null,
          proposed_by: null,
          proposed_at: null,
          approved_by_finance: null,
          approved_at_finance: null,
        })
        .eq('id', bonusSettings.id);

      if (error) throw error;

      setBonusSettings(prev => ({
        ...prev,
        finalized_status: 'draft',
        rejection_reason: undefined,
        proposed_by: undefined,
        proposed_at: undefined,
        approved_by_finance: undefined,
        approved_at_finance: undefined,
      }));

      toast({
        title: 'Berhasil',
        description: 'Status dikembalikan ke Draft untuk revisi.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mereset status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const totalWeightedContribution = useMemo(() => 
    calculatedBonuses.reduce((sum, b) => sum + b.weighted_contribution, 0), 
    [calculatedBonuses]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[bonusSettings.finalized_status] || STATUS_LABELS.draft;

  return (
    <div className="space-y-6">
      {/* Status & Workflow Banner */}
      {bonusSettings.id && (
        <Card className={bonusSettings.finalized_status === 'rejected' ? 'border-destructive' : ''}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {bonusSettings.finalized_status === 'draft' && <Clock className="h-5 w-5 text-muted-foreground" />}
                {bonusSettings.finalized_status === 'proposed' && <Send className="h-5 w-5 text-primary" />}
                {bonusSettings.finalized_status === 'finance_approved' && <ThumbsUp className="h-5 w-5 text-primary" />}
                {bonusSettings.finalized_status === 'finalized' && <CheckCircle className="h-5 w-5 text-primary" />}
                {bonusSettings.finalized_status === 'rejected' && <AlertCircle className="h-5 w-5 text-destructive" />}
                <div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  {bonusSettings.rejection_reason && (
                    <p className="text-sm text-destructive mt-1">
                      Alasan: {bonusSettings.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canPropose && teamMembers.length > 0 && (
                  <Button onClick={handlePropose} disabled={actionLoading !== null}>
                    {actionLoading === 'propose' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="h-4 w-4 mr-2" />
                    Ajukan ke Finance
                  </Button>
                )}
                {canApproveFinance && (
                  <>
                    <Button onClick={handleApproveFinance} disabled={actionLoading !== null}>
                      {actionLoading === 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Setujui
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowRejectDialog(true)}
                      disabled={actionLoading !== null}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Tolak
                    </Button>
                  </>
                )}
                {canFinalize && (
                  <Button onClick={handleFinalize} disabled={actionLoading !== null}>
                    {actionLoading === 'finalize' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <DollarSign className="h-4 w-4 mr-2" />
                    Finalisasi Pembayaran
                  </Button>
                )}
                {bonusSettings.finalized_status === 'rejected' && (isAdmin || isPM || isMarketing) && (
                  <Button variant="outline" onClick={handleResetToDraft} disabled={actionLoading !== null}>
                    {actionLoading === 'reset' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revisi Ulang
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bonus Pool Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pengaturan Bonus Pool
          </CardTitle>
          <CardDescription>
            Tentukan persentase margin yang dialokasikan untuk bonus tim produksi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Margin Project</Label>
              <Input
                type="number"
                value={bonusSettings.margin_amount}
                onChange={(e) => updateMarginAmount(parseFloat(e.target.value) || 0)}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">
                {formatCurrency(bonusSettings.margin_amount)}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Alokasi Bonus (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={bonusSettings.bonus_pool_percentage}
                onChange={(e) => updateBonusPoolPercentage(parseFloat(e.target.value) || 0)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                Bonus Pool
              </Label>
              <div className="h-9 px-3 py-2 bg-muted rounded-md flex items-center font-semibold text-primary">
                {formatCurrency(bonusSettings.bonus_pool_amount)}
              </div>
            </div>
          </div>

          {!compact && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Formula Perhitungan:</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <strong>Bonus Pool</strong> = Margin × Persentase Alokasi</p>
                <p>• <strong>Kontribusi Tertimbang</strong> = Man-days × Bobot Kompleksitas</p>
                <p>• <strong>Bonus Individu</strong> = (Kontribusi Tertimbang / Total Kontribusi) × Bonus Pool</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Anggota Tim Produksi
              </CardTitle>
              <CardDescription>
                Tambahkan anggota tim dan tentukan kontribusi masing-masing
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={addTeamMember} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Tambah Anggota
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada anggota tim. Klik "Tambah Anggota" untuk menambahkan.
            </p>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border rounded-lg">
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-xs">Anggota Tim</Label>
                    <Select
                      value={member.user_id}
                      onValueChange={(value) => updateTeamMember(index, 'user_id', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Input
                      value={member.role_name}
                      onChange={(e) => updateTeamMember(index, 'role_name', e.target.value)}
                      placeholder="Contoh: Developer"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Man-days</Label>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={member.man_days}
                      onChange={(e) => updateTeamMember(index, 'man_days', parseFloat(e.target.value) || 0)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Bobot Kompleksitas</Label>
                    <Select
                      value={member.complexity_weight.toString()}
                      onValueChange={(value) => updateTeamMember(index, 'complexity_weight', parseFloat(value))}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLEXITY_WEIGHTS.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Catatan</Label>
                    <Input
                      value={member.contribution_notes}
                      onChange={(e) => updateTeamMember(index, 'contribution_notes', e.target.value)}
                      placeholder="Opsional"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTeamMember(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bonus Calculation Results */}
      {calculatedBonuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hasil Perhitungan Bonus
            </CardTitle>
            <CardDescription>
              Distribusi bonus berdasarkan kontribusi tertimbang masing-masing anggota
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anggota</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Kontribusi Tertimbang</TableHead>
                  <TableHead className="text-right">Persentase</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedBonuses.map((bonus, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{bonus.user_name}</TableCell>
                    <TableCell>{bonus.role_name}</TableCell>
                    <TableCell className="text-right">{bonus.weighted_contribution.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{bonus.contribution_percentage.toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(bonus.bonus_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{totalWeightedContribution.toFixed(2)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right text-primary">
                    {formatCurrency(bonusSettings.bonus_pool_amount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end gap-3">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
          )}
          <Button onClick={saveAll} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Simpan Draft
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan Bonus</DialogTitle>
            <DialogDescription>
              Mohon berikan alasan penolakan agar pengaju dapat melakukan revisi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alasan Penolakan</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
            >
              {actionLoading === 'reject' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
