-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'marketing', 'finance', 'project_manager');

-- Create enum for project status
CREATE TYPE public.project_status AS ENUM ('Pipeline', 'Won', 'Lost', 'Completed');

-- Create enum for pipeline stage
CREATE TYPE public.pipeline_stage AS ENUM ('Meeting', 'Proposal', 'Negosiasi', 'Closing');

-- Create enum for term trigger
CREATE TYPE public.term_trigger AS ENUM ('SPK_SIGNED', 'PROGRESS_REPORT', 'BAST', 'MAINTENANCE', 'CUSTOM');

-- Create enum for evidence type
CREATE TYPE public.evidence_type AS ENUM ('BAST', 'Laporan Progress', 'Faktur Pajak', 'Bukti Potong PPh', 'SPK', 'Lainnya');

-- Create enum for invoice status
CREATE TYPE public.invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Overdue');

-- Create enum for client type
CREATE TYPE public.client_type AS ENUM ('Pemerintah', 'Swasta');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_type client_type NOT NULL DEFAULT 'Swasta',
  pic_name TEXT,
  pic_phone TEXT,
  pic_email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  spk_file_path TEXT,
  status project_status NOT NULL DEFAULT 'Pipeline',
  pipeline_stage pipeline_stage DEFAULT 'Meeting',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Payment terms table
CREATE TABLE public.payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  term_name TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  trigger_condition term_trigger NOT NULL DEFAULT 'SPK_SIGNED',
  trigger_description TEXT,
  is_locked BOOLEAN DEFAULT TRUE,
  due_date DATE,
  term_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Term evidences (documents)
CREATE TABLE public.term_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES public.payment_terms(id) ON DELETE CASCADE NOT NULL,
  file_type evidence_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  term_id UUID REFERENCES public.payment_terms(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'Draft',
  tax_invoice_number TEXT,
  payment_proof_file TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Quotations table
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  man_days JSONB NOT NULL DEFAULT '[]',
  hosting_cost DECIMAL(15,2) DEFAULT 0,
  maintenance_cost DECIMAL(15,2) DEFAULT 0,
  maintenance_period TEXT DEFAULT 'Tahunan',
  total_development DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  valid_until DATE,
  status TEXT DEFAULT 'Draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Settings table for company config, targets, etc.
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Email notifications log
CREATE TABLE public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  related_id UUID,
  status TEXT DEFAULT 'sent'
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Function to check user role (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_terms_updated_at BEFORE UPDATE ON public.payment_terms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-unlock term when evidence is uploaded
CREATE OR REPLACE FUNCTION public.check_term_evidence_and_unlock()
RETURNS TRIGGER AS $$
DECLARE
  term_trigger term_trigger;
  evidence_count INTEGER;
BEGIN
  -- Get the term's trigger condition
  SELECT trigger_condition INTO term_trigger FROM public.payment_terms WHERE id = NEW.term_id;
  
  -- Count evidences for this term
  SELECT COUNT(*) INTO evidence_count FROM public.term_evidences WHERE term_id = NEW.term_id;
  
  -- If there's at least one evidence, unlock the term
  IF evidence_count > 0 THEN
    UPDATE public.payment_terms SET is_locked = FALSE WHERE id = NEW.term_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unlock_term_on_evidence
AFTER INSERT ON public.term_evidences
FOR EACH ROW EXECUTE FUNCTION public.check_term_evidence_and_unlock();

-- RLS Policies

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: Only viewable by the user themselves
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Clients: All authenticated users can view, marketing/admin can manage
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Marketing and admin can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Marketing and admin can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

-- Projects: All authenticated can view, marketing/admin can manage
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Marketing and admin can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Marketing and admin can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

-- Payment terms: All authenticated can view, marketing/admin can manage
CREATE POLICY "Authenticated users can view payment_terms" ON public.payment_terms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Marketing and admin can insert payment_terms" ON public.payment_terms
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Marketing and admin can update payment_terms" ON public.payment_terms
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

-- Term evidences: All can view, PM/marketing/admin can upload
CREATE POLICY "Authenticated users can view term_evidences" ON public.term_evidences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "PM, marketing, admin can insert term_evidences" ON public.term_evidences
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'marketing') OR 
    public.has_role(auth.uid(), 'project_manager')
  );

-- Invoices: All authenticated can view, finance/admin can manage
CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Finance and admin can insert invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance')
  );

CREATE POLICY "Finance and admin can update invoices" ON public.invoices
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance')
  );

-- Quotations: All can view, marketing/admin can manage
CREATE POLICY "Authenticated users can view quotations" ON public.quotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Marketing and admin can insert quotations" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Marketing and admin can update quotations" ON public.quotations
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'marketing')
  );

-- Settings: All can view, admin can manage
CREATE POLICY "Authenticated users can view settings" ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert settings" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update settings" ON public.settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Email notifications: Admin can view all
CREATE POLICY "Admin can view email_notifications" ON public.email_notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert email_notifications" ON public.email_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default role (marketing) - can be changed by admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'marketing');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('company_profile', '{"name": "PT Zen Multimedia Indonesia", "npwp": "01.234.567.8-901.000", "address": "Jl. AP Pettarani No. 123, Makassar, Sulawesi Selatan 90221", "phone": "+62 411 123456", "email": "hello@zenmultimedia.co.id", "website": "www.zenmultimedia.co.id", "bank_info": "Bank BCA - 1234567890 a.n. PT Zen Multimedia Indonesia"}'),
  ('invoice_settings', '{"prefix": "INV/ZEN", "default_top_days": 14}'),
  ('rate_card', '{"Project Manager": 1500000, "Business Analyst": 1200000, "UI/UX Designer": 1000000, "Backend Developer": 1200000, "Frontend Developer": 1000000, "QA Engineer": 800000, "DevOps Engineer": 1300000}'),
  ('targets', '{"monthly_target_2026": 500000000, "yearly_target_2026": 6000000000}')
ON CONFLICT (key) DO NOTHING;