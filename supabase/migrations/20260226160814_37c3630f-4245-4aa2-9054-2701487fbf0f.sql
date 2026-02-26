
-- Trigger to prevent created_by from being changed on prompt_assets
CREATE OR REPLACE FUNCTION public.protect_created_by()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  -- Always preserve the original created_by value
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_prompt_assets_created_by
  BEFORE UPDATE ON public.prompt_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_created_by();
