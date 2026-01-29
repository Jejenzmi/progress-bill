-- Update RLS policies for contract_templates to be role-based (more secure)
DROP POLICY IF EXISTS "Anyone authenticated can view contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admin can insert contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admin can update contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admin can delete contract templates" ON public.contract_templates;

-- Authorized roles can view templates
CREATE POLICY "Authorized roles can view contract templates" 
ON public.contract_templates 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'marketing'::app_role) OR 
  has_role(auth.uid(), 'bdo'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role)
);

-- Only admin can modify templates
CREATE POLICY "Admin can insert contract templates" 
ON public.contract_templates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update contract templates" 
ON public.contract_templates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete contract templates" 
ON public.contract_templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));