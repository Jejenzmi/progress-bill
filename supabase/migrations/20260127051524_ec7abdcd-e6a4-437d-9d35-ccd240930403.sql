-- Create table for per-user TTE settings
CREATE TABLE public.user_tte_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  signer_name text NOT NULL,
  signer_position text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_tte_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all TTE settings
CREATE POLICY "Admin can view all TTE settings"
ON public.user_tte_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert TTE settings"
ON public.user_tte_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update TTE settings"
ON public.user_tte_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete TTE settings"
ON public.user_tte_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own TTE settings
CREATE POLICY "Users can view own TTE settings"
ON public.user_tte_settings FOR SELECT
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_tte_settings_updated_at
  BEFORE UPDATE ON public.user_tte_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();