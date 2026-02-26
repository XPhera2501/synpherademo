
-- Fix get_user_role to handle super_admin
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
    WHEN 'creator' THEN 2
    WHEN 'reviewer' THEN 3
    WHEN 'viewer' THEN 4
  END
  LIMIT 1
$function$;

-- RLS for departments: admins can CRUD, authenticated can read
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for roi_configs: admins can CRUD, authenticated can read
ALTER TABLE public.roi_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view roi_configs"
ON public.roi_configs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert roi_configs"
ON public.roi_configs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roi_configs"
ON public.roi_configs FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roi_configs"
ON public.roi_configs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for landing_content: public read, admins can CRUD
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view landing_content"
ON public.landing_content FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert landing_content"
ON public.landing_content FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update landing_content"
ON public.landing_content FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete landing_content"
ON public.landing_content FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for super_admin_whitelist: only super_admins can CRUD, super_admins can read
ALTER TABLE public.super_admin_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view whitelist"
ON public.super_admin_whitelist FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert whitelist"
ON public.super_admin_whitelist FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update whitelist"
ON public.super_admin_whitelist FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete whitelist"
ON public.super_admin_whitelist FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow anon to read whitelist for login check (email only)
CREATE POLICY "Anon can check whitelist for login"
ON public.super_admin_whitelist FOR SELECT
TO anon
USING (true);
