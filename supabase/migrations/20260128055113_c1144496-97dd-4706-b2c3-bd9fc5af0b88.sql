-- Add quotation_id column to projects table to link with quotations
ALTER TABLE public.projects 
ADD COLUMN quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_projects_quotation_id ON public.projects(quotation_id);