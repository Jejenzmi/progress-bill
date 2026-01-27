-- Create trigger function to assign BDO and COO roles to Indra Apriana
CREATE OR REPLACE FUNCTION public.handle_bdo_coo_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user's full name matches BDO/COO name
  IF NEW.raw_user_meta_data->>'full_name' = 'Indra Apriana, S.Kom' THEN
    -- Delete the default marketing role that was assigned
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Assign both BDO and COO roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      (NEW.id, 'bdo'),
      (NEW.id, 'coo');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for BDO/COO signup
DROP TRIGGER IF EXISTS on_auth_user_created_bdo_coo ON auth.users;
CREATE TRIGGER on_auth_user_created_bdo_coo
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_bdo_coo_signup();