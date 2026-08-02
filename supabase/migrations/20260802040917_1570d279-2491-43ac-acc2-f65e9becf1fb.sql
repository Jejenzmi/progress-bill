DROP VIEW IF EXISTS public.document_verifications;

CREATE OR REPLACE FUNCTION public.verify_document(_verification_id text)
RETURNS TABLE (
  verification_id text,
  original_file_name text,
  signer_name text,
  signer_position text,
  signed_at timestamptz,
  file_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sd.verification_id, sd.original_file_name, sd.signer_name, sd.signer_position, sd.signed_at, sd.file_type
  FROM public.signed_documents sd
  WHERE sd.verification_id IS NOT NULL
    AND sd.verification_id = upper(_verification_id)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.verify_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_document(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM authenticated;

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);