-- Create lead_status enum
CREATE TYPE public.lead_status AS ENUM ('cold', 'warm', 'hot');

-- Create activity_type enum
CREATE TYPE public.activity_type AS ENUM ('meeting', 'call', 'email', 'whatsapp', 'note', 'follow_up');

-- Create leads table (separate from clients for proper funnel tracking)
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  source TEXT, -- where the lead came from (referral, website, event, etc.)
  status lead_status NOT NULL DEFAULT 'cold',
  score INTEGER NOT NULL DEFAULT 0, -- lead scoring (0-100)
  estimated_value NUMERIC DEFAULT 0,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_to_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table for sales activity tracking
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type activity_type NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  -- Polymorphic relation: can be linked to lead, client, or project
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  -- Reminder
  reminder_at TIMESTAMP WITH TIME ZONE,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  -- Meta
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure at least one relation exists
  CONSTRAINT activity_has_relation CHECK (
    lead_id IS NOT NULL OR client_id IS NOT NULL OR project_id IS NOT NULL
  )
);

-- Create sales_targets table for tracking goals
CREATE TABLE public.sales_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  target_period TEXT NOT NULL, -- e.g., '2026-01', '2026-Q1', '2026'
  target_amount NUMERIC NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means company-wide target
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint: one target per user per period (or company-wide)
  CONSTRAINT unique_target_per_period UNIQUE (target_type, target_period, user_id)
);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'success', 'error', 'reminder'
  link TEXT, -- optional link to navigate to
  related_id UUID, -- optional reference to related entity
  related_type TEXT, -- 'lead', 'client', 'project', 'activity', etc.
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT USING (true);

CREATE POLICY "Marketing and admin can insert leads" ON public.leads
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'marketing'::app_role)
  );

CREATE POLICY "Marketing and admin can update leads" ON public.leads
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'marketing'::app_role)
  );

CREATE POLICY "Admin can delete leads" ON public.leads
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for activities
CREATE POLICY "Authenticated users can view activities" ON public.activities
  FOR SELECT USING (true);

CREATE POLICY "Marketing, PM, and admin can insert activities" ON public.activities
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'marketing'::app_role) OR
    has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "Marketing, PM, and admin can update activities" ON public.activities
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'marketing'::app_role) OR
    has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "Admin can delete activities" ON public.activities
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for sales_targets
CREATE POLICY "Authenticated users can view sales_targets" ON public.sales_targets
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert sales_targets" ON public.sales_targets
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update sales_targets" ON public.sales_targets
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete sales_targets" ON public.sales_targets
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_next_follow_up ON public.leads(next_follow_up_at);
CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX idx_activities_client_id ON public.activities(client_id);
CREATE INDEX idx_activities_project_id ON public.activities(project_id);
CREATE INDEX idx_activities_scheduled_at ON public.activities(scheduled_at);
CREATE INDEX idx_activities_reminder_at ON public.activities(reminder_at) WHERE reminder_sent = false;
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_sales_targets_period ON public.sales_targets(target_type, target_period);

-- Update trigger for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for activities
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for sales_targets
CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add pipeline_probability to projects for forecasting
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100);

-- Set default probabilities based on pipeline_stage
UPDATE public.projects SET probability = 
  CASE pipeline_stage
    WHEN 'Meeting' THEN 10
    WHEN 'Proposal' THEN 30
    WHEN 'Negosiasi' THEN 60
    WHEN 'Closing' THEN 90
  END
WHERE probability = 0 AND status = 'Pipeline';

-- Enable realtime for pipeline updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;