-- Fix remaining USING(true) policies for better security

-- 1. Drop old policy for bank_accounts (if exists)
DROP POLICY IF EXISTS "Authenticated users can view bank accounts" ON public.bank_accounts;

-- 2. Drop old policy for leads (if exists)  
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

-- 3. Drop old policy for invoices (if exists)
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

-- 4. Drop old policy for quotations (if exists)
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;

-- 5. Restrict payment_terms access
DROP POLICY IF EXISTS "Authenticated users can view payment_terms" ON public.payment_terms;
CREATE POLICY "Authorized roles can view payment_terms" 
ON public.payment_terms 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 6. Restrict projects access
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Authorized roles can view projects" 
ON public.projects 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 7. Restrict project_bonus_settings access
DROP POLICY IF EXISTS "Authenticated users can view bonus settings" ON public.project_bonus_settings;
CREATE POLICY "Authorized roles can view bonus settings" 
ON public.project_bonus_settings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role)
);

-- 8. Restrict team_member_bonuses access
DROP POLICY IF EXISTS "Authenticated users can view bonuses" ON public.team_member_bonuses;
CREATE POLICY "Authorized roles can view bonuses" 
ON public.team_member_bonuses 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role)
);

-- 9. Restrict project_team_members access
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.project_team_members;
CREATE POLICY "Authorized roles can view team members" 
ON public.project_team_members 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 10. Restrict term_evidences access
DROP POLICY IF EXISTS "Authenticated users can view term_evidences" ON public.term_evidences;
CREATE POLICY "Authorized roles can view term_evidences" 
ON public.term_evidences 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role)
);

-- 11. Restrict quotation_comments access  
DROP POLICY IF EXISTS "Authenticated users can view quotation comments" ON public.quotation_comments;
CREATE POLICY "Authorized roles can view quotation comments" 
ON public.quotation_comments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 12. Update signed_documents to remove public access but allow authenticated verification
DROP POLICY IF EXISTS "Anyone can verify documents by verification_id" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can verify documents" ON public.signed_documents;
CREATE POLICY "Authenticated users can verify by verification_id" 
ON public.signed_documents 
FOR SELECT 
USING (
  verification_id IS NOT NULL AND auth.role() = 'authenticated'
);