-- Add quotation_number column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS quotation_number TEXT;