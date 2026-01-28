-- Add lead_id column to quotations table to track quotations created from Hot Leads
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON public.quotations(lead_id);

-- Add auto_create_project flag to track if project should be auto-created on approval
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS auto_create_project boolean DEFAULT false;