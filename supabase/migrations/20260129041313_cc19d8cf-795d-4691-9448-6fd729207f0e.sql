-- Fix 1: Restrict bank_accounts access to finance and admin only
DROP POLICY IF EXISTS "Authenticated users can view bank accounts" ON public.bank_accounts;

CREATE POLICY "Finance and admin can view bank accounts" 
ON public.bank_accounts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR
  has_role(auth.uid(), 'coo'::app_role)
);

-- Fix 2: Restrict leads access to marketing, sales, and management
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

CREATE POLICY "Authorized roles can view leads" 
ON public.leads 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'marketing'::app_role) OR 
  has_role(auth.uid(), 'bdo'::app_role) OR
  has_role(auth.uid(), 'coo'::app_role)
);

-- Fix 3: Restrict invoices access to finance, PM, and management
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

CREATE POLICY "Authorized roles can view invoices" 
ON public.invoices 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role)
);

-- Fix 4: Update signed_documents public access - remove public policy and add proper auth check
-- Keep verification feature but require authentication for document access
DROP POLICY IF EXISTS "Anyone can verify documents by verification_id" ON public.signed_documents;

-- Create a more restrictive policy for verification
CREATE POLICY "Authenticated users can verify documents" 
ON public.signed_documents 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- Fix 5: Restrict quotations access
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;

CREATE POLICY "Authorized roles can view quotations" 
ON public.quotations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'marketing'::app_role) OR 
  has_role(auth.uid(), 'bdo'::app_role) OR
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'finance'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role)
);