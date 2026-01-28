-- Add negotiation approval columns to quotations table
ALTER TABLE public.quotations
ADD COLUMN negotiation_status text DEFAULT 'draft' CHECK (negotiation_status IN ('draft', 'pending', 'approved', 'rejected')),
ADD COLUMN negotiation_approved_at timestamp with time zone DEFAULT NULL,
ADD COLUMN negotiation_approved_by uuid DEFAULT NULL,
ADD COLUMN negotiation_rejection_reason text DEFAULT NULL;