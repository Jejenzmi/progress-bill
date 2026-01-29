-- 1. Activities: Allow marketing, PM, BDO, admin to delete
DROP POLICY IF EXISTS "Admin can delete activities" ON public.activities;
CREATE POLICY "Marketing, PM, BDO, and admin can delete activities"
ON public.activities
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 2. Clients: Add DELETE policy for marketing, BDO, admin
CREATE POLICY "Marketing, BDO, and admin can delete clients"
ON public.clients
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 3. Project Team Members: Allow marketing, PM, BDO, admin to delete
DROP POLICY IF EXISTS "Admin can delete team members" ON public.project_team_members;
CREATE POLICY "Marketing, PM, BDO, and admin can delete team members"
ON public.project_team_members
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 4. Projects: Add DELETE policy for marketing, BDO, admin
CREATE POLICY "Marketing, BDO, and admin can delete projects"
ON public.projects
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 5. Payment Terms: Add DELETE policy
CREATE POLICY "Marketing, BDO, and admin can delete payment_terms"
ON public.payment_terms
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'bdo'::app_role)
);

-- 6. Term Evidences: Add DELETE policy for PM, marketing, admin
CREATE POLICY "PM, marketing, admin can delete term_evidences"
ON public.term_evidences
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role) OR
  has_role(auth.uid(), 'project_manager'::app_role)
);