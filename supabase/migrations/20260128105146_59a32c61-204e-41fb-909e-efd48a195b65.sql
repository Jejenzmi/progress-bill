-- Update profiles RLS policy to allow Admin to see all marketing user profiles
-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Recreate with broader access for admin
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);

-- Also add policy for viewing profiles based on marketing role for target assignment
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);