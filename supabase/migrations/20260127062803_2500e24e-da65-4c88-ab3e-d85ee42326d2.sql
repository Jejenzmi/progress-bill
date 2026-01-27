-- Create signed_documents table to store document signing history
CREATE TABLE public.signed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_file_name TEXT NOT NULL,
  original_file_path TEXT NOT NULL,
  signed_file_path TEXT,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  qr_position TEXT NOT NULL DEFAULT 'bottom-right',
  signer_name TEXT NOT NULL,
  signer_position TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own signed documents
CREATE POLICY "Users can view their own signed documents"
ON public.signed_documents
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own signed documents
CREATE POLICY "Users can insert their own signed documents"
ON public.signed_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own signed documents
CREATE POLICY "Users can delete their own signed documents"
ON public.signed_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Admin can manage all signed documents
CREATE POLICY "Admins can manage all signed documents"
ON public.signed_documents
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_signed_documents_updated_at
BEFORE UPDATE ON public.signed_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signed-documents', 'signed-documents', false);

-- RLS for storage - users can upload to their own folder
CREATE POLICY "Users can upload signed documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'signed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own signed documents
CREATE POLICY "Users can view own signed documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own signed documents
CREATE POLICY "Users can delete own signed documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'signed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);