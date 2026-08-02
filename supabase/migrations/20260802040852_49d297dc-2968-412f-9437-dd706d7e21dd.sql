-- 1. sales_targets: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view sales_targets" ON public.sales_targets;
CREATE POLICY "Users view own or managers view all sales_targets"
ON public.sales_targets FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'coo')
  OR public.has_role(auth.uid(), 'bdo')
);

-- 2. settings: sensitive margin settings restricted
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
CREATE POLICY "Authenticated can view non-sensitive settings"
ON public.settings FOR SELECT TO authenticated
USING (
  key <> 'margin_settings'
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'coo')
  OR public.has_role(auth.uid(), 'bdo')
);

-- 3. signed_documents: remove broad verification exposure
DROP POLICY IF EXISTS "Public can verify documents by verification_id" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can verify by verification_id" ON public.signed_documents;

-- expose only limited verification fields through a definer view
DROP VIEW IF EXISTS public.document_verifications;
CREATE VIEW public.document_verifications
WITH (security_invoker = false) AS
SELECT verification_id, original_file_name, signer_name, signer_position, signed_at, file_type
FROM public.signed_documents
WHERE verification_id IS NOT NULL;

GRANT SELECT ON public.document_verifications TO anon, authenticated;

-- 4. storage: documents bucket ownership checks
DROP POLICY IF EXISTS "Authenticated users can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their documents" ON storage.objects;

CREATE POLICY "Owners or admins can update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
);

CREATE POLICY "Owners or admins can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
  )
);

-- 5. SECURITY DEFINER function execution privileges
REVOKE ALL ON FUNCTION public.check_term_evidence_and_unlock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_bdo_coo_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_ceo_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;