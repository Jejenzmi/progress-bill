-- Add approval workflow columns to project_bonus_settings
ALTER TABLE public.project_bonus_settings
ADD COLUMN IF NOT EXISTS proposed_by UUID,
ADD COLUMN IF NOT EXISTS proposed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by_finance UUID,
ADD COLUMN IF NOT EXISTS approved_at_finance TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalized_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add status column to team_member_bonuses for individual tracking
ALTER TABLE public.team_member_bonuses
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_bonus_settings_status ON public.project_bonus_settings(finalized_status);
CREATE INDEX IF NOT EXISTS idx_project_bonus_settings_project ON public.project_bonus_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_team_member_bonuses_status ON public.team_member_bonuses(status);

COMMENT ON COLUMN public.project_bonus_settings.finalized_status IS 'Workflow status: draft, proposed, finance_approved, finalized, rejected';
COMMENT ON COLUMN public.project_bonus_settings.proposed_by IS 'User who proposed the bonus (PM/Marketing)';
COMMENT ON COLUMN public.project_bonus_settings.approved_by_finance IS 'Finance user who approved';
COMMENT ON COLUMN public.project_bonus_settings.finalized_by IS 'Admin who finalized the payment';