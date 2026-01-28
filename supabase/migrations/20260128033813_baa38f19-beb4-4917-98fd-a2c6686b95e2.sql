-- Add qr_page column to store the page number for QR Code placement
ALTER TABLE public.signed_documents 
ADD COLUMN qr_page INTEGER NOT NULL DEFAULT 1;