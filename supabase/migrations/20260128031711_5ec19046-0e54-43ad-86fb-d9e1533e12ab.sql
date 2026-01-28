-- Add RLS policy for COO to view documents submitted to them
CREATE POLICY "COO can view documents for their approval"
ON public.signed_documents
FOR SELECT
USING (
  signer_type = 'coo' 
  AND has_role(auth.uid(), 'coo')
);

-- Add RLS policy for COO to update documents submitted to them (for approval/rejection)
CREATE POLICY "COO can update documents for their approval"
ON public.signed_documents
FOR UPDATE
USING (
  signer_type = 'coo' 
  AND has_role(auth.uid(), 'coo')
);

-- Add policy for CEO to view all documents (they already have admin role which has full access)
-- But let's also ensure CEO type documents are accessible
CREATE POLICY "Admin can view CEO type documents"
ON public.signed_documents
FOR SELECT
USING (
  signer_type = 'ceo' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin can update CEO type documents"
ON public.signed_documents
FOR UPDATE
USING (
  signer_type = 'ceo' 
  AND has_role(auth.uid(), 'admin')
);