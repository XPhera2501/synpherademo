ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'approver';

ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'pending_approval';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.prompt_assets
ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_reviewer_id ON public.prompt_assets(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_approver_id ON public.prompt_assets(approver_id);

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 0
    WHEN 'admin' THEN 1
    WHEN 'approver' THEN 2
    WHEN 'creator' THEN 3
    WHEN 'reviewer' THEN 4
    WHEN 'viewer' THEN 5
  END
  LIMIT 1
$function$;