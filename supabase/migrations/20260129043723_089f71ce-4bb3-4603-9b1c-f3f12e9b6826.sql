-- Drop existing delete policy
DROP POLICY IF EXISTS "Admin can delete leads" ON public.leads;

-- Create new delete policy that includes marketing and BDO
CREATE POLICY "Marketing, BDO, and admin can delete leads"
ON public.leads
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);