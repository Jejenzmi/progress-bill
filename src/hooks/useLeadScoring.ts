import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from './useLeads';

export interface ScoringRule {
  id: string;
  name: string;
  category: 'engagement' | 'activity' | 'behavior' | 'profile';
  condition: string;
  points: number;
  description: string;
}

export interface LeadScoreBreakdown {
  leadId: string;
  totalScore: number;
  maxPossibleScore: number;
  appliedRules: {
    rule: ScoringRule;
    matched: boolean;
    points: number;
  }[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

// Default scoring rules
export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  // Profile rules
  {
    id: 'has_email',
    name: 'Has Email',
    category: 'profile',
    condition: 'email IS NOT NULL',
    points: 10,
    description: 'Lead memiliki email yang valid',
  },
  {
    id: 'has_phone',
    name: 'Has Phone',
    category: 'profile',
    condition: 'phone IS NOT NULL',
    points: 10,
    description: 'Lead memiliki nomor telepon',
  },
  {
    id: 'has_company',
    name: 'Has Company',
    category: 'profile',
    condition: 'company_name IS NOT NULL',
    points: 15,
    description: 'Lead memiliki nama perusahaan',
  },
  {
    id: 'has_industry',
    name: 'Industry Identified',
    category: 'profile',
    condition: 'industry IS NOT NULL',
    points: 10,
    description: 'Industri lead teridentifikasi',
  },
  {
    id: 'high_value',
    name: 'High Value Lead',
    category: 'profile',
    condition: 'estimated_value >= 100000000',
    points: 20,
    description: 'Nilai estimasi ≥ Rp 100 juta',
  },
  {
    id: 'medium_value',
    name: 'Medium Value Lead',
    category: 'profile',
    condition: 'estimated_value >= 50000000 AND estimated_value < 100000000',
    points: 10,
    description: 'Nilai estimasi Rp 50-100 juta',
  },
  
  // Engagement rules
  {
    id: 'recent_contact',
    name: 'Recently Contacted',
    category: 'engagement',
    condition: 'last_contacted_at >= 7_days_ago',
    points: 15,
    description: 'Dihubungi dalam 7 hari terakhir',
  },
  {
    id: 'follow_up_scheduled',
    name: 'Follow-up Scheduled',
    category: 'engagement',
    condition: 'next_follow_up_at IS NOT NULL AND next_follow_up_at >= now',
    points: 10,
    description: 'Memiliki jadwal follow-up aktif',
  },
  {
    id: 'warm_status',
    name: 'Warm Lead',
    category: 'engagement',
    condition: 'status = warm',
    points: 15,
    description: 'Status lead adalah warm',
  },
  {
    id: 'hot_status',
    name: 'Hot Lead',
    category: 'engagement',
    condition: 'status = hot',
    points: 25,
    description: 'Status lead adalah hot',
  },

  // Activity rules (calculated separately)
  {
    id: 'has_activities',
    name: 'Has Activities',
    category: 'activity',
    condition: 'activities_count >= 1',
    points: 10,
    description: 'Memiliki minimal 1 aktivitas',
  },
  {
    id: 'multiple_activities',
    name: 'Multiple Activities',
    category: 'activity',
    condition: 'activities_count >= 3',
    points: 15,
    description: 'Memiliki 3+ aktivitas',
  },
  {
    id: 'recent_activity',
    name: 'Recent Activity',
    category: 'activity',
    condition: 'last_activity_at >= 7_days_ago',
    points: 15,
    description: 'Aktivitas dalam 7 hari terakhir',
  },

  // Behavior rules
  {
    id: 'has_notes',
    name: 'Has Notes',
    category: 'behavior',
    condition: 'notes IS NOT NULL AND notes != ""',
    points: 5,
    description: 'Memiliki catatan',
  },
  {
    id: 'has_tags',
    name: 'Tagged Lead',
    category: 'behavior',
    condition: 'tags IS NOT NULL AND array_length(tags) > 0',
    points: 5,
    description: 'Memiliki tags',
  },
  {
    id: 'enterprise_size',
    name: 'Enterprise Company',
    category: 'behavior',
    condition: 'company_size = enterprise',
    points: 20,
    description: 'Perusahaan enterprise',
  },
  {
    id: 'medium_size',
    name: 'Medium Company',
    category: 'behavior',
    condition: 'company_size = medium',
    points: 10,
    description: 'Perusahaan menengah',
  },
];

export function useLeadScoring() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateScore = useCallback(async (lead: Lead): Promise<LeadScoreBreakdown> => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch activities for this lead
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    const activitiesCount = activities?.length || 0;
    const lastActivity = activities?.[0];
    const lastActivityAt = lastActivity ? new Date(lastActivity.created_at) : null;

    const appliedRules: LeadScoreBreakdown['appliedRules'] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const rule of DEFAULT_SCORING_RULES) {
      maxPossibleScore += rule.points;
      let matched = false;

      switch (rule.id) {
        // Profile rules
        case 'has_email':
          matched = !!lead.email;
          break;
        case 'has_phone':
          matched = !!lead.phone;
          break;
        case 'has_company':
          matched = !!lead.company_name;
          break;
        case 'has_industry':
          matched = !!lead.industry;
          break;
        case 'high_value':
          matched = (lead.estimated_value || 0) >= 100000000;
          break;
        case 'medium_value':
          matched = (lead.estimated_value || 0) >= 50000000 && (lead.estimated_value || 0) < 100000000;
          break;

        // Engagement rules
        case 'recent_contact':
          matched = lead.last_contacted_at ? new Date(lead.last_contacted_at) >= sevenDaysAgo : false;
          break;
        case 'follow_up_scheduled':
          matched = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) >= now : false;
          break;
        case 'warm_status':
          matched = lead.status === 'warm';
          break;
        case 'hot_status':
          matched = lead.status === 'hot';
          break;

        // Activity rules
        case 'has_activities':
          matched = activitiesCount >= 1;
          break;
        case 'multiple_activities':
          matched = activitiesCount >= 3;
          break;
        case 'recent_activity':
          matched = lastActivityAt ? lastActivityAt >= sevenDaysAgo : false;
          break;

        // Behavior rules
        case 'has_notes':
          matched = !!lead.notes && lead.notes.trim() !== '';
          break;
        case 'has_tags':
          matched = lead.tags && lead.tags.length > 0;
          break;
        case 'enterprise_size':
          matched = lead.company_size === 'enterprise';
          break;
        case 'medium_size':
          matched = lead.company_size === 'medium';
          break;
      }

      const points = matched ? rule.points : 0;
      totalScore += points;
      
      appliedRules.push({
        rule,
        matched,
        points,
      });
    }

    // Calculate grade
    const scorePercentage = (totalScore / maxPossibleScore) * 100;
    let grade: LeadScoreBreakdown['grade'];
    let recommendation: string;

    if (scorePercentage >= 80) {
      grade = 'A';
      recommendation = 'Lead prioritas tinggi - segera follow up dan buat proposal';
    } else if (scorePercentage >= 60) {
      grade = 'B';
      recommendation = 'Lead potensial - jadwalkan meeting dan explore kebutuhan';
    } else if (scorePercentage >= 40) {
      grade = 'C';
      recommendation = 'Lead perlu nurturing - kirim konten edukatif dan follow up berkala';
    } else if (scorePercentage >= 20) {
      grade = 'D';
      recommendation = 'Lead cold - lengkapi data dan tentukan apakah layak dikejar';
    } else {
      grade = 'F';
      recommendation = 'Lead tidak qualified - lengkapi profil atau pertimbangkan untuk drop';
    }

    return {
      leadId: lead.id,
      totalScore,
      maxPossibleScore,
      appliedRules,
      grade,
      recommendation,
    };
  }, []);

  const calculateBulkScores = useCallback(async (leads: Lead[]): Promise<Map<string, LeadScoreBreakdown>> => {
    setLoading(true);
    setError(null);

    try {
      const scores = new Map<string, LeadScoreBreakdown>();
      
      // Fetch all activities for all leads in one query
      const leadIds = leads.map(l => l.id);
      const { data: allActivities } = await supabase
        .from('activities')
        .select('*')
        .in('lead_id', leadIds);

      const activitiesByLead = new Map<string, typeof allActivities>();
      allActivities?.forEach(activity => {
        const existing = activitiesByLead.get(activity.lead_id!) || [];
        existing.push(activity);
        activitiesByLead.set(activity.lead_id!, existing);
      });

      for (const lead of leads) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const leadActivities = activitiesByLead.get(lead.id) || [];
        const activitiesCount = leadActivities.length;
        const lastActivity = leadActivities.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const lastActivityAt = lastActivity ? new Date(lastActivity.created_at) : null;

        const appliedRules: LeadScoreBreakdown['appliedRules'] = [];
        let totalScore = 0;
        let maxPossibleScore = 0;

        for (const rule of DEFAULT_SCORING_RULES) {
          maxPossibleScore += rule.points;
          let matched = false;

          switch (rule.id) {
            case 'has_email': matched = !!lead.email; break;
            case 'has_phone': matched = !!lead.phone; break;
            case 'has_company': matched = !!lead.company_name; break;
            case 'has_industry': matched = !!lead.industry; break;
            case 'high_value': matched = (lead.estimated_value || 0) >= 100000000; break;
            case 'medium_value': matched = (lead.estimated_value || 0) >= 50000000 && (lead.estimated_value || 0) < 100000000; break;
            case 'recent_contact': matched = lead.last_contacted_at ? new Date(lead.last_contacted_at) >= sevenDaysAgo : false; break;
            case 'follow_up_scheduled': matched = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) >= now : false; break;
            case 'warm_status': matched = lead.status === 'warm'; break;
            case 'hot_status': matched = lead.status === 'hot'; break;
            case 'has_activities': matched = activitiesCount >= 1; break;
            case 'multiple_activities': matched = activitiesCount >= 3; break;
            case 'recent_activity': matched = lastActivityAt ? lastActivityAt >= sevenDaysAgo : false; break;
            case 'has_notes': matched = !!lead.notes && lead.notes.trim() !== ''; break;
            case 'has_tags': matched = lead.tags && lead.tags.length > 0; break;
            case 'enterprise_size': matched = lead.company_size === 'enterprise'; break;
            case 'medium_size': matched = lead.company_size === 'medium'; break;
          }

          const points = matched ? rule.points : 0;
          totalScore += points;
          appliedRules.push({ rule, matched, points });
        }

        const scorePercentage = (totalScore / maxPossibleScore) * 100;
        let grade: LeadScoreBreakdown['grade'];
        let recommendation: string;

        if (scorePercentage >= 80) {
          grade = 'A';
          recommendation = 'Lead prioritas tinggi - segera follow up dan buat proposal';
        } else if (scorePercentage >= 60) {
          grade = 'B';
          recommendation = 'Lead potensial - jadwalkan meeting dan explore kebutuhan';
        } else if (scorePercentage >= 40) {
          grade = 'C';
          recommendation = 'Lead perlu nurturing - kirim konten edukatif dan follow up berkala';
        } else if (scorePercentage >= 20) {
          grade = 'D';
          recommendation = 'Lead cold - lengkapi data dan tentukan apakah layak dikejar';
        } else {
          grade = 'F';
          recommendation = 'Lead tidak qualified - lengkapi profil atau pertimbangkan untuk drop';
        }

        scores.set(lead.id, {
          leadId: lead.id,
          totalScore,
          maxPossibleScore,
          appliedRules,
          grade,
          recommendation,
        });
      }

      return scores;
    } catch (err: any) {
      setError(err.message);
      return new Map();
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLeadScore = useCallback(async (leadId: string, score: number) => {
    const { error } = await supabase
      .from('leads')
      .update({ score })
      .eq('id', leadId);

    if (error) throw error;
  }, []);

  return {
    calculateScore,
    calculateBulkScores,
    updateLeadScore,
    loading,
    error,
    rules: DEFAULT_SCORING_RULES,
  };
}
