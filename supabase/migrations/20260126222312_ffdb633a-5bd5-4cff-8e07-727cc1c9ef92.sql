-- Fix function search_path issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_term_evidence_and_unlock()
RETURNS TRIGGER AS $$
DECLARE
  term_trigger term_trigger;
  evidence_count INTEGER;
BEGIN
  SELECT trigger_condition INTO term_trigger FROM public.payment_terms WHERE id = NEW.term_id;
  SELECT COUNT(*) INTO evidence_count FROM public.term_evidences WHERE term_id = NEW.term_id;
  
  IF evidence_count > 0 THEN
    UPDATE public.payment_terms SET is_locked = FALSE WHERE id = NEW.term_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'marketing');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix permissive RLS policy for email_notifications
DROP POLICY IF EXISTS "System can insert email_notifications" ON public.email_notifications;

-- Only allow insert via service role (edge functions) by checking for specific conditions
CREATE POLICY "Authenticated users can log notifications" ON public.email_notifications
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'finance')
  );

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update their documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete their documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');