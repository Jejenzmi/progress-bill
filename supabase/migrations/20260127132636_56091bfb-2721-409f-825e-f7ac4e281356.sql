-- Add segmentation fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS company_size text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for better query performance on tags
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON public.leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_company_size ON public.leads(company_size);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);