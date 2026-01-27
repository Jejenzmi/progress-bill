-- Allow admin to view all user roles (for role management)
CREATE POLICY "Admin can view all user roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin to insert user roles
CREATE POLICY "Admin can insert user roles"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admin to update user roles
CREATE POLICY "Admin can update user roles"
ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin to delete user roles
CREATE POLICY "Admin can delete user roles"
ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin to view all profiles (for user listing)
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));