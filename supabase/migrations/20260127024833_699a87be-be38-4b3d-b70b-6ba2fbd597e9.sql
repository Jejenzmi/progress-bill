-- Add DELETE policy for quotations table
CREATE POLICY "Marketing and admin can delete quotations"
ON public.quotations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role));