
-- Add revision_number column to quotations
ALTER TABLE public.quotations ADD COLUMN revision_number integer NOT NULL DEFAULT 0;

-- Create quotation_revisions table for history
CREATE TABLE public.quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  quotation_number text,
  project_name text NOT NULL,
  project_description text,
  client_id uuid REFERENCES public.clients(id),
  man_days jsonb,
  grand_total numeric,
  margin_percentage numeric,
  approval_status text,
  approved_by uuid,
  approved_at timestamptz,
  revised_by uuid,
  revision_reason text,
  snapshot_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_revisions ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotation_revisions (same as quotations - role-based)
CREATE POLICY "Authenticated users with roles can view revisions"
ON public.quotation_revisions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'marketing') OR
  public.has_role(auth.uid(), 'bdo') OR
  public.has_role(auth.uid(), 'coo') OR
  public.has_role(auth.uid(), 'finance')
);

CREATE POLICY "Authenticated users with roles can insert revisions"
ON public.quotation_revisions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'marketing') OR
  public.has_role(auth.uid(), 'bdo') OR
  public.has_role(auth.uid(), 'coo')
);

-- Index for faster lookups
CREATE INDEX idx_quotation_revisions_quotation_id ON public.quotation_revisions(quotation_id);
CREATE INDEX idx_quotation_revisions_client_id ON public.quotation_revisions(quotation_id, created_at DESC);
