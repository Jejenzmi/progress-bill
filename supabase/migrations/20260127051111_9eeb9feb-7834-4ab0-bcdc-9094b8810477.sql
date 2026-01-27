-- Create a function to automatically promote CEO to admin on signup
CREATE OR REPLACE FUNCTION public.handle_ceo_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user's full name matches CEO name
  IF NEW.raw_user_meta_data->>'full_name' = 'Jejen Jaenudin, SM., M. Kom' THEN
    -- Delete the default marketing role that was assigned
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Assign admin role to CEO
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user signup (after the default handler)
DROP TRIGGER IF EXISTS on_ceo_signup ON auth.users;
CREATE TRIGGER on_ceo_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ceo_signup();