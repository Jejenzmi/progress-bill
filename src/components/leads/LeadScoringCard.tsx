import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle,
  Zap,
  RefreshCw,
  Loader2,
  Lightbulb,
} from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { useLeadScoring, LeadScoreBreakdown, DEFAULT_SCORING_RULES } from '@/hooks/useLeadScoring';
import { cn } from '@/lib/utils';

interface LeadScoringCardProps {
  lead: Lead;
  onScoreUpdate?: (score: number) => void;
}

const gradeColors: Record<string, string> = {
  A: 'bg-success text-success-foreground',
  B: 'bg-primary text-primary-foreground',
  C: 'bg-warning text-warning-foreground',
  D: 'bg-orange-500 text-white',
  F: 'bg-destructive text-destructive-foreground',
};

const categoryLabels: Record<string, { label: string; icon: string }> = {
  profile: { label: 'Profil', icon: '👤' },
  engagement: { label: 'Engagement', icon: '🤝' },
  activity: { label: 'Aktivitas', icon: '📊' },
  behavior: { label: 'Perilaku', icon: '🎯' },
};

export function LeadScoringCard({ lead, onScoreUpdate }: LeadScoringCardProps) {
  const [scoreBreakdown, setScoreBreakdown] = useState<LeadScoreBreakdown | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { calculateScore, updateLeadScore } = useLeadScoring();

  const fetchScore = async () => {
    setLoading(true);
    try {
      const breakdown = await calculateScore(lead);
      setScoreBreakdown(breakdown);
      
      // Update lead score in database if changed
      if (breakdown.totalScore !== lead.score) {
        await updateLeadScore(lead.id, breakdown.totalScore);
        onScoreUpdate?.(breakdown.totalScore);
      }
    } catch (error) {
      console.error('Error calculating score:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [lead.id]);

  if (!scoreBreakdown) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const scorePercentage = (scoreBreakdown.totalScore / scoreBreakdown.maxPossibleScore) * 100;

  // Group rules by category
  const rulesByCategory = scoreBreakdown.appliedRules.reduce((acc, item) => {
    const category = item.rule.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof scoreBreakdown.appliedRules>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Lead Score
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchScore} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
            gradeColors[scoreBreakdown.grade]
          )}>
            {scoreBreakdown.grade}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                {scoreBreakdown.totalScore} / {scoreBreakdown.maxPossibleScore} poin
              </span>
              <span className="text-sm text-muted-foreground">
                {scorePercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={scorePercentage} className="h-2" />
          </div>
        </div>

        {/* Recommendation */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Lightbulb className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            {scoreBreakdown.recommendation}
          </p>
        </div>

        {/* Collapsible Breakdown */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" size="sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Detail Scoring
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {Object.entries(rulesByCategory).map(([category, rules]) => (
              <div key={category} className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span>{categoryLabels[category]?.icon}</span>
                  {categoryLabels[category]?.label || category}
                </p>
                <div className="space-y-1 pl-6">
                  {rules.map((item) => (
                    <div 
                      key={item.rule.id}
                      className={cn(
                        "flex items-center justify-between py-1 text-sm",
                        !item.matched && "text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {item.matched ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {item.rule.name}
                      </span>
                      <Badge 
                        variant={item.matched ? "default" : "outline"}
                        className={cn(
                          "text-xs",
                          item.matched && "bg-success"
                        )}
                      >
                        {item.matched ? `+${item.rule.points}` : `0/${item.rule.points}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Summary view for list/table
export function LeadScoreBadge({ score, maxScore = 200 }: { score: number; maxScore?: number }) {
  const percentage = (score / maxScore) * 100;
  let grade: string;
  let color: string;

  if (percentage >= 80) {
    grade = 'A';
    color = 'bg-success text-success-foreground';
  } else if (percentage >= 60) {
    grade = 'B';
    color = 'bg-primary text-primary-foreground';
  } else if (percentage >= 40) {
    grade = 'C';
    color = 'bg-warning text-warning-foreground';
  } else if (percentage >= 20) {
    grade = 'D';
    color = 'bg-orange-500 text-white';
  } else {
    grade = 'F';
    color = 'bg-destructive text-destructive-foreground';
  }

  return (
    <Badge className={cn("font-bold", color)}>
      {grade} ({score})
    </Badge>
  );
}
