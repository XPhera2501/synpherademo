UPDATE public.prompt_assets
SET
  reviewer_id = COALESCE(reviewer_id, assigned_to),
  status = CASE
    WHEN status = 'created' AND assigned_to IS NOT NULL AND reviewer_id IS NULL THEN 'in_review'::public.asset_status
    ELSE status
  END,
  assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND status IN ('created', 'in_review');

CREATE OR REPLACE FUNCTION public.can_view_prompt_asset(
  _user_id uuid,
  _status public.asset_status,
  _created_by uuid,
  _department public.department,
  _reviewer_id uuid,
  _approver_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_department public.department;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'super_admin') THEN
    RETURN true;
  END IF;

  IF _status = 'approved' THEN
    RETURN true;
  END IF;

  IF _status = 'draft' THEN
    RETURN _created_by = _user_id;
  END IF;

  IF _status = 'created' THEN
    SELECT department INTO user_department
    FROM public.profiles
    WHERE id = _user_id;

    RETURN user_department = _department;
  END IF;

  IF _status IN ('in_review', 'pending_approval') THEN
    RETURN _created_by = _user_id OR _reviewer_id = _user_id OR _approver_id = _user_id;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Authenticated can view prompts" ON public.prompt_assets;
CREATE POLICY "Workflow visibility for prompts"
ON public.prompt_assets FOR SELECT
TO authenticated
USING (
  public.can_view_prompt_asset(
    auth.uid(),
    status,
    created_by,
    department,
    reviewer_id,
    approver_id
  )
);

DROP POLICY IF EXISTS "Authenticated can view snapshots" ON public.version_snapshots;
CREATE POLICY "Workflow visibility for snapshots"
ON public.version_snapshots FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.prompt_assets pa
    WHERE pa.id = version_snapshots.asset_id
      AND public.can_view_prompt_asset(
        auth.uid(),
        pa.status,
        pa.created_by,
        pa.department,
        pa.reviewer_id,
        pa.approver_id
      )
  )
);

DROP POLICY IF EXISTS "Authenticated can view lineage" ON public.lineage_entries;
CREATE POLICY "Workflow visibility for lineage"
ON public.lineage_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.prompt_assets pa
    WHERE pa.id = lineage_entries.asset_id
      AND public.can_view_prompt_asset(
        auth.uid(),
        pa.status,
        pa.created_by,
        pa.department,
        pa.reviewer_id,
        pa.approver_id
      )
  )
);

DROP POLICY IF EXISTS "Authenticated can view roi" ON public.roi_facts;
CREATE POLICY "Workflow visibility for roi"
ON public.roi_facts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.prompt_assets pa
    WHERE pa.id = roi_facts.asset_id
      AND public.can_view_prompt_asset(
        auth.uid(),
        pa.status,
        pa.created_by,
        pa.department,
        pa.reviewer_id,
        pa.approver_id
      )
  )
);

DROP POLICY IF EXISTS "Authenticated can view comments" ON public.prompt_comments;
CREATE POLICY "Workflow visibility for comments"
ON public.prompt_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.prompt_assets pa
    WHERE pa.id = prompt_comments.prompt_id
      AND public.can_view_prompt_asset(
        auth.uid(),
        pa.status,
        pa.created_by,
        pa.department,
        pa.reviewer_id,
        pa.approver_id
      )
  )
);