-- Insert quotation_settings if not exists
INSERT INTO public.settings (key, value) VALUES
  ('quotation_settings', '{"prefix": "QUO-ZMI"}')
ON CONFLICT (key) DO NOTHING;