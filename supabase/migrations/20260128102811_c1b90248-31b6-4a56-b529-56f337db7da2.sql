-- Add margin_percentage and negotiated_price columns to quotations table
ALTER TABLE public.quotations
ADD COLUMN margin_percentage numeric DEFAULT NULL,
ADD COLUMN negotiated_price numeric DEFAULT NULL,
ADD COLUMN negotiated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN negotiated_by uuid DEFAULT NULL,
ADD COLUMN negotiation_notes text DEFAULT NULL;