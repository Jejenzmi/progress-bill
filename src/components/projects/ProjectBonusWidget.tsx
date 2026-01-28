import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Award, ChevronDown, Users, Loader2 } from 'lucide-react';
import { TeamBonusCalculator } from './TeamBonusCalculator';

interface ProjectBonusWidgetProps {
  projectId: string;
  projectValue: number;
  marginPercentage?: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  proposed: { label: 'Menunggu Approval', variant: 'secondary' },
  finance_approved: { label: 'Disetujui Finance', variant: 'default' },
  finalized: { label: 'Finalisasi', variant: 'default' },
  rejected: { label: 'Ditolak', variant: 'destructive' },
};

export function ProjectBonusWidget({ projectId, projectValue, marginPercentage = 20 }: ProjectBonusWidgetProps) {
  const { hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bonusSummary, setBonusSummary] = useState<{
    hasBonus: boolean;
    teamCount: number;
    totalBonus: number;
    status: string;
  }>({
    hasBonus: false,
    teamCount: 0,
    totalBonus: 0,
    status: 'draft',
  });

  const canView = hasRole('admin') || hasRole('finance') || hasRole('project_manager') || hasRole('marketing') || hasRole('bdo');

  useEffect(() => {
    if (canView) {
      fetchBonusSummary();
    } else {
      setLoading(false);
    }
  }, [projectId, canView]);

  const fetchBonusSummary = async () => {
    try {
      // Fetch bonus settings
      const { data: bonusData } = await supabase
        .from('project_bonus_settings')
        .select('bonus_pool_amount, finalized_status')
        .eq('project_id', projectId)
        .single();

      // Fetch team member count
      const { count: teamCount } = await supabase
        .from('project_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (bonusData) {
        setBonusSummary({
          hasBonus: true,
          teamCount: teamCount || 0,
          totalBonus: Number(bonusData.bonus_pool_amount),
          status: bonusData.finalized_status || 'draft',
        });
      } else {
        setBonusSummary({
          hasBonus: false,
          teamCount: 0,
          totalBonus: 0,
          status: 'draft',
        });
      }
    } catch (error) {
      console.error('Error fetching bonus summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canView) return null;

  const marginAmount = Math.round(projectValue * (marginPercentage / (100 + marginPercentage)));
  const statusInfo = STATUS_LABELS[bonusSummary.status] || STATUS_LABELS.draft;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Bonus Tim Produksi</CardTitle>
                  <CardDescription className="text-xs">
                    {bonusSummary.hasBonus 
                      ? `${bonusSummary.teamCount} anggota • ${formatCurrency(bonusSummary.totalBonus)}`
                      : 'Belum dikonfigurasi'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bonusSummary.hasBonus && (
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <TeamBonusCalculator
              projectId={projectId}
              marginAmount={marginAmount}
              compact={true}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
