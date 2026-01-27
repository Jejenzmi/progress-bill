-- Add approval workflow columns to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS submitted_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_by uuid,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));

-- Update RLS policies for leads table to include BDO
DROP POLICY IF EXISTS "Marketing and admin can insert leads" ON public.leads;
CREATE POLICY "Marketing, BDO, and admin can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

DROP POLICY IF EXISTS "Marketing and admin can update leads" ON public.leads;
CREATE POLICY "Marketing, BDO, and admin can update leads" 
ON public.leads 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

-- Update RLS policies for projects table to include BDO
DROP POLICY IF EXISTS "Marketing and admin can insert projects" ON public.projects;
CREATE POLICY "Marketing, BDO, and admin can insert projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

DROP POLICY IF EXISTS "Marketing and admin can update projects" ON public.projects;
CREATE POLICY "Marketing, BDO, and admin can update projects" 
ON public.projects 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

-- Update RLS policies for activities table to include BDO
DROP POLICY IF EXISTS "Marketing, PM, and admin can insert activities" ON public.activities;
CREATE POLICY "Marketing, PM, BDO, and admin can insert activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

DROP POLICY IF EXISTS "Marketing, PM, and admin can update activities" ON public.activities;
CREATE POLICY "Marketing, PM, BDO, and admin can update activities" 
ON public.activities 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

-- Update RLS policies for quotations to include BDO
DROP POLICY IF EXISTS "Marketing and admin can insert quotations" ON public.quotations;
CREATE POLICY "Marketing, BDO, and admin can insert quotations" 
ON public.quotations 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

DROP POLICY IF EXISTS "Marketing and admin can update quotations" ON public.quotations;
CREATE POLICY "Marketing, BDO, COO, and admin can update quotations" 
ON public.quotations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role) OR has_role(auth.uid(), 'coo'::app_role));

DROP POLICY IF EXISTS "Marketing and admin can delete quotations" ON public.quotations;
CREATE POLICY "Marketing, BDO, and admin can delete quotations" 
ON public.quotations 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

-- Update RLS policies for clients to include BDO
DROP POLICY IF EXISTS "Marketing and admin can insert clients" ON public.clients;
CREATE POLICY "Marketing, BDO, and admin can insert clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

DROP POLICY IF EXISTS "Marketing and admin can update clients" ON public.clients;
CREATE POLICY "Marketing, BDO, and admin can update clients" 
ON public.clients 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

-- Update RLS policies for payment_terms to include BDO
DROP POLICY IF EXISTS "Marketing and admin can insert payment_terms" ON public.payment_terms;
CREATE POLICY "Marketing, BDO, and admin can insert payment_terms" 
ON public.payment_terms 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));

DROP POLICY IF EXISTS "Marketing and admin can update payment_terms" ON public.payment_terms;
CREATE POLICY "Marketing, BDO, and admin can update payment_terms" 
ON public.payment_terms 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role) OR has_role(auth.uid(), 'bdo'::app_role));