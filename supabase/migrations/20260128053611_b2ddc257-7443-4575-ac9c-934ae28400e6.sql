-- Add NPWP columns to clients table
ALTER TABLE public.clients 
ADD COLUMN npwp_pribadi text,
ADD COLUMN npwp_badan text;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.npwp_pribadi IS 'NPWP Pribadi untuk klien perorangan';
COMMENT ON COLUMN public.clients.npwp_badan IS 'NPWP Badan untuk klien perusahaan';