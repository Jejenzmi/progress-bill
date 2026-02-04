-- Add project_description column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN project_description TEXT;