-- Add party obligations columns to contracts table
ALTER TABLE public.contracts 
ADD COLUMN party1_obligations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN party2_obligations jsonb DEFAULT '[]'::jsonb;