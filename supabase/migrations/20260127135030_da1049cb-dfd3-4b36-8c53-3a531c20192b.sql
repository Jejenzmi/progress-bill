-- Create quotation_comments table for approval workflow communication
CREATE TABLE public.quotation_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view quotation comments"
ON public.quotation_comments
FOR SELECT
USING (true);

CREATE POLICY "BDO, COO, and admin can insert comments"
ON public.quotation_comments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'bdo'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role)
);

CREATE POLICY "Users can delete own comments"
ON public.quotation_comments
FOR DELETE
USING (auth.uid() = user_id);