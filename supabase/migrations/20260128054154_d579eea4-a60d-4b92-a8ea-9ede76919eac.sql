-- Create bank_accounts table for multiple bank account options
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (true);

CREATE POLICY "Admin can insert bank accounts"
ON public.bank_accounts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update bank accounts"
ON public.bank_accounts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete bank accounts"
ON public.bank_accounts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add tax_invoice_issued field to invoices table
ALTER TABLE public.invoices 
ADD COLUMN tax_invoice_issued BOOLEAN DEFAULT false,
ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id);

-- Insert default bank account from existing settings (will use the existing bank_info value)
INSERT INTO public.bank_accounts (bank_name, account_number, account_name, is_default)
VALUES ('Bank BCA', '1234567890', 'PT Zen Multimedia Indonesia', true);

-- Create trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();