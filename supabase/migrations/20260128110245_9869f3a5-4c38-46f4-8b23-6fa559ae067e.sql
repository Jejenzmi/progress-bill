-- Create table for project team members with bonus allocation
CREATE TABLE public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  man_days NUMERIC(10,2) NOT NULL DEFAULT 0,
  complexity_weight NUMERIC(3,2) NOT NULL DEFAULT 1.0, -- 0.5 to 2.0
  contribution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for project bonus settings
CREATE TABLE public.project_bonus_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE UNIQUE,
  bonus_pool_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.0, -- % of margin allocated for bonus
  margin_amount NUMERIC(15,2) NOT NULL DEFAULT 0, -- Actual margin in IDR
  bonus_pool_amount NUMERIC(15,2) NOT NULL DEFAULT 0, -- Calculated bonus pool
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  finalized_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual bonus calculations
CREATE TABLE public.team_member_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_bonus_id UUID REFERENCES public.project_bonus_settings(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.project_team_members(id) ON DELETE CASCADE,
  weighted_contribution NUMERIC(15,2) NOT NULL DEFAULT 0, -- man_days × complexity_weight
  contribution_percentage NUMERIC(5,2) NOT NULL DEFAULT 0, -- % of total contribution
  bonus_amount NUMERIC(15,2) NOT NULL DEFAULT 0, -- Final bonus in IDR
  status TEXT DEFAULT 'pending', -- pending, approved, paid
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_team_members
CREATE POLICY "Authenticated users can view team members"
  ON public.project_team_members FOR SELECT
  USING (true);

CREATE POLICY "Marketing, PM, BDO, and admin can insert team members"
  ON public.project_team_members FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'marketing'::app_role) OR 
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'bdo'::app_role)
  );

CREATE POLICY "Marketing, PM, BDO, and admin can update team members"
  ON public.project_team_members FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'marketing'::app_role) OR 
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'bdo'::app_role)
  );

CREATE POLICY "Admin can delete team members"
  ON public.project_team_members FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for project_bonus_settings
CREATE POLICY "Authenticated users can view bonus settings"
  ON public.project_bonus_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin and Finance can insert bonus settings"
  ON public.project_bonus_settings FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "Admin and Finance can update bonus settings"
  ON public.project_bonus_settings FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "Admin can delete bonus settings"
  ON public.project_bonus_settings FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for team_member_bonuses
CREATE POLICY "Authenticated users can view bonuses"
  ON public.team_member_bonuses FOR SELECT
  USING (true);

CREATE POLICY "Admin and Finance can insert bonuses"
  ON public.team_member_bonuses FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "Admin and Finance can update bonuses"
  ON public.team_member_bonuses FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "Admin can delete bonuses"
  ON public.team_member_bonuses FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updating timestamps
CREATE TRIGGER update_project_team_members_updated_at
  BEFORE UPDATE ON public.project_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_bonus_settings_updated_at
  BEFORE UPDATE ON public.project_bonus_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_member_bonuses_updated_at
  BEFORE UPDATE ON public.team_member_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();