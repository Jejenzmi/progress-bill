-- Fix 1: Update RLS policy for clients table to restrict access to specific roles
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Create new SELECT policy that only allows specific roles to view clients
CREATE POLICY "Authorized roles can view clients" 
ON public.clients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'marketing'::app_role) OR 
  has_role(auth.uid(), 'bdo'::app_role) OR
  has_role(auth.uid(), 'coo'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'finance'::app_role)
);

-- Fix 2: Update activities table to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;

-- Create new policy where users can only see activities they created, are assigned to, or related to their projects
CREATE POLICY "Users can view relevant activities" 
ON public.activities 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coo'::app_role) OR
  created_by = auth.uid() OR 
  assigned_to = auth.uid()
);