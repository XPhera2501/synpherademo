
-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'reviewer', 'viewer');

-- 2. Create enum for asset status
CREATE TYPE public.asset_status AS ENUM ('draft', 'in_review', 'approved', 'released');

-- 3. Create enum for departments
CREATE TYPE public.department AS ENUM ('Operations', 'Legal', 'R&D', 'Marketing', 'Finance', 'HR', 'IT', 'Executive');

-- 4. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  department public.department DEFAULT 'Operations',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Security definer function for role checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Function to get user's role (returns highest privilege)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'creator' THEN 2
    WHEN 'reviewer' THEN 3
    WHEN 'viewer' THEN 4
  END
  LIMIT 1
$$;

-- 8. Prompt assets table
CREATE TABLE public.prompt_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT,
  department public.department NOT NULL DEFAULT 'Operations',
  status public.asset_status NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  version NUMERIC(5,1) NOT NULL DEFAULT 1.0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  commit_message TEXT DEFAULT 'Initial creation',
  parent_id UUID REFERENCES public.prompt_assets(id) ON DELETE SET NULL,
  security_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (security_status IN ('GREEN', 'AMBER', 'RED', 'PENDING')),
  justification TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_assets ENABLE ROW LEVEL SECURITY;

-- 9. Version snapshots table
CREATE TABLE public.version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.prompt_assets(id) ON DELETE CASCADE,
  version NUMERIC(5,1) NOT NULL,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  commit_message TEXT NOT NULL DEFAULT '',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.version_snapshots ENABLE ROW LEVEL SECURITY;

-- 10. Lineage entries table
CREATE TABLE public.lineage_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.prompt_assets(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.prompt_assets(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'forked', 'released', 'updated')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lineage_entries ENABLE ROW LEVEL SECURITY;

-- 11. ROI facts table
CREATE TABLE public.roi_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.prompt_assets(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Time Savings', 'Risk Mitigation', 'Efficiency', 'Cost Savings', 'New Value')),
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roi_facts ENABLE ROW LEVEL SECURITY;

-- 12. Prompt comments table
CREATE TABLE public.prompt_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.prompt_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_comments ENABLE ROW LEVEL SECURITY;

-- 13. Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 14. Auto-create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'creator');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_prompt_assets_updated_at BEFORE UPDATE ON public.prompt_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== RLS POLICIES ==========

-- Profiles: users can see all profiles, edit their own
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- User roles: users see their own, admins manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Prompt assets: all authenticated can read, creators/admins can write
CREATE POLICY "Authenticated can view prompts" ON public.prompt_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can insert prompts" ON public.prompt_assets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'creator')));
CREATE POLICY "Creators can update own prompts" ON public.prompt_assets FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete prompts" ON public.prompt_assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- Version snapshots: follow prompt access
CREATE POLICY "Authenticated can view snapshots" ON public.version_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert snapshots" ON public.version_snapshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Lineage entries: follow prompt access
CREATE POLICY "Authenticated can view lineage" ON public.lineage_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert lineage" ON public.lineage_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ROI facts: all can read, creators/admins can write
CREATE POLICY "Authenticated can view roi" ON public.roi_facts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert roi" ON public.roi_facts FOR INSERT TO authenticated WITH CHECK (true);

-- Comments: all can read, authors manage own
CREATE POLICY "Authenticated can view comments" ON public.prompt_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert comments" ON public.prompt_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON public.prompt_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.prompt_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Audit logs: only admins can read
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_prompt_assets_department ON public.prompt_assets(department);
CREATE INDEX idx_prompt_assets_status ON public.prompt_assets(status);
CREATE INDEX idx_prompt_assets_created_by ON public.prompt_assets(created_by);
CREATE INDEX idx_prompt_assets_parent_id ON public.prompt_assets(parent_id);
CREATE INDEX idx_version_snapshots_asset_id ON public.version_snapshots(asset_id);
CREATE INDEX idx_lineage_entries_asset_id ON public.lineage_entries(asset_id);
CREATE INDEX idx_roi_facts_asset_id ON public.roi_facts(asset_id);
CREATE INDEX idx_prompt_comments_prompt_id ON public.prompt_comments(prompt_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
