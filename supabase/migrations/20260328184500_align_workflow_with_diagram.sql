CREATE OR REPLACE FUNCTION public.get_prompt_workflow_phase(
  _metadata jsonb,
  _status public.asset_status,
  _reviewer_id uuid,
  _approver_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workflow_phase text;
BEGIN
  workflow_phase := _metadata -> 'workflow' ->> 'phase';

  IF workflow_phase IN ('reviewer_review', 'creator_rework', 'approver_review') THEN
    RETURN workflow_phase;
  END IF;

  IF _status = 'pending_approval' THEN
    RETURN 'approver_review';
  END IF;

  IF _status <> 'in_review' THEN
    RETURN NULL;
  END IF;

  IF _approver_id IS NOT NULL THEN
    RETURN 'approver_review';
  END IF;

  IF _reviewer_id IS NOT NULL THEN
    RETURN 'reviewer_review';
  END IF;

  RETURN 'creator_rework';
END;
$$;

UPDATE public.prompt_assets
SET
  status = 'in_review'::public.asset_status,
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{workflow}',
    jsonb_strip_nulls(
      COALESCE(metadata -> 'workflow', '{}'::jsonb) ||
      jsonb_build_object(
        'phase', 'approver_review',
        'submittedForApprovalAt', COALESCE(metadata -> 'workflow' ->> 'submittedForApprovalAt', updated_at::text)
      )
    ),
    true
  )
WHERE status = 'pending_approval';

UPDATE public.prompt_assets
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{workflow}',
  jsonb_strip_nulls(
    COALESCE(metadata -> 'workflow', '{}'::jsonb) ||
    jsonb_build_object(
      'phase',
      CASE
        WHEN approver_id IS NOT NULL THEN 'approver_review'
        WHEN reviewer_id IS NOT NULL THEN 'reviewer_review'
        ELSE 'creator_rework'
      END
    )
  ),
  true
)
WHERE status = 'in_review'
  AND COALESCE(metadata -> 'workflow' ->> 'phase', '') NOT IN ('reviewer_review', 'creator_rework', 'approver_review');

CREATE OR REPLACE FUNCTION public.enforce_prompt_asset_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  creator_manager uuid;
  creator_department public.department;
  approver_department public.department;
  active_reviewer uuid;
  active_approver uuid;
  old_phase text;
  new_phase text;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  new_phase := public.get_prompt_workflow_phase(NEW.metadata, NEW.status, NEW.reviewer_id, NEW.approver_id);

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'in_review' THEN
      IF NEW.reviewer_id IS NULL THEN
        RAISE EXCEPTION 'A reviewer must be assigned before a prompt can enter in_review';
      END IF;

      IF NEW.approver_id IS NOT NULL THEN
        RAISE EXCEPTION 'An approver cannot be assigned before reviewer submission';
      END IF;

      IF new_phase IS DISTINCT FROM 'reviewer_review' THEN
        RAISE EXCEPTION 'New prompts entering in_review must begin in reviewer_review';
      END IF;
    END IF;

    IF NEW.status = 'pending_approval' THEN
      RAISE EXCEPTION 'Pending approval is no longer a standalone workflow state';
    END IF;

    IF NEW.status = 'approved' AND NOT (
      public.has_role(actor, 'admin')
      OR public.has_role(actor, 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Only admins can create approved prompts directly';
    END IF;

    RETURN NEW;
  END IF;

  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(actor, 'admin') OR public.has_role(actor, 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be changed';
  END IF;

  IF NEW.status = 'pending_approval' THEN
    RAISE EXCEPTION 'Pending approval is no longer a standalone workflow state';
  END IF;

  old_phase := public.get_prompt_workflow_phase(OLD.metadata, OLD.status, OLD.reviewer_id, OLD.approver_id);
  active_reviewer := COALESCE(OLD.reviewer_id, NEW.reviewer_id);
  active_approver := COALESCE(OLD.approver_id, NEW.approver_id);

  IF OLD.status IN ('draft', 'created') AND NEW.status = 'in_review' AND new_phase = 'reviewer_review' THEN
    IF actor <> NEW.created_by THEN
      RAISE EXCEPTION 'Only the creator can submit a prompt for review';
    END IF;

    IF NEW.reviewer_id IS NULL THEN
      RAISE EXCEPTION 'A reviewer must be assigned before review starts';
    END IF;

    IF NEW.approver_id IS NOT NULL THEN
      RAISE EXCEPTION 'An approver cannot be assigned before reviewer submission';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status IN ('in_review', 'pending_approval') AND NEW.status = 'in_review' AND old_phase = 'reviewer_review' AND new_phase = 'approver_review' THEN
    IF actor IS DISTINCT FROM active_reviewer THEN
      RAISE EXCEPTION 'Only the assigned reviewer can submit a prompt for approval';
    END IF;

    IF NEW.approver_id IS NULL THEN
      RAISE EXCEPTION 'An approver must be assigned before approval review begins';
    END IF;

    SELECT manager_id, department
    INTO creator_manager, creator_department
    FROM public.profiles
    WHERE id = NEW.created_by;

    IF creator_manager IS DISTINCT FROM NEW.approver_id THEN
      RAISE EXCEPTION 'The approver must be the creator''s direct manager';
    END IF;

    IF NOT (
      public.has_role(NEW.approver_id, 'approver')
      OR public.has_role(NEW.approver_id, 'admin')
      OR public.has_role(NEW.approver_id, 'super_admin')
    ) THEN
      RAISE EXCEPTION 'The assigned approver must hold approver or admin access';
    END IF;

    SELECT department
    INTO approver_department
    FROM public.profiles
    WHERE id = NEW.approver_id;

    IF approver_department IS DISTINCT FROM creator_department THEN
      RAISE EXCEPTION 'The approver must be in the same department as the creator';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'in_review' AND NEW.status = 'in_review' AND old_phase = 'creator_rework' AND new_phase = 'reviewer_review' THEN
    IF actor IS DISTINCT FROM NEW.created_by THEN
      RAISE EXCEPTION 'Only the creator can re-submit a returned prompt for review';
    END IF;

    IF NEW.reviewer_id IS NULL THEN
      RAISE EXCEPTION 'A reviewer must be assigned before a returned prompt re-enters review';
    END IF;

    IF NEW.approver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Approver assignment must be cleared when re-submitting to reviewer';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status IN ('in_review', 'pending_approval') AND NEW.status = 'in_review' AND old_phase = 'reviewer_review' AND new_phase = 'creator_rework' THEN
    IF actor IS DISTINCT FROM active_reviewer THEN
      RAISE EXCEPTION 'Only the assigned reviewer can return a prompt to the creator';
    END IF;

    IF NEW.reviewer_id IS NOT NULL OR NEW.approver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Reviewer and approver assignments must be cleared when returning to creator';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status IN ('in_review', 'pending_approval') AND NEW.status = 'in_review' AND old_phase = 'approver_review' AND new_phase = 'creator_rework' THEN
    IF actor IS DISTINCT FROM active_approver THEN
      RAISE EXCEPTION 'Only the assigned approver can return a prompt to the creator';
    END IF;

    IF NEW.reviewer_id IS NOT NULL OR NEW.approver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Reviewer and approver assignments must be cleared when returning to creator';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status IN ('in_review', 'pending_approval') AND NEW.status = 'approved' AND old_phase = 'approver_review' THEN
    IF actor IS DISTINCT FROM active_approver THEN
      RAISE EXCEPTION 'Only the assigned approver can approve a prompt';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status AND old_phase IS NOT DISTINCT FROM new_phase THEN
    IF NEW.status = 'in_review' AND old_phase = 'reviewer_review' AND actor IS DISTINCT FROM active_reviewer THEN
      RAISE EXCEPTION 'Only the assigned reviewer can edit a prompt during reviewer review';
    END IF;

    IF NEW.status = 'in_review' AND old_phase = 'creator_rework' AND actor IS DISTINCT FROM NEW.created_by THEN
      RAISE EXCEPTION 'Only the creator can edit a prompt during creator rework';
    END IF;

    IF NEW.status = 'in_review' AND old_phase = 'approver_review' AND actor IS DISTINCT FROM active_approver THEN
      RAISE EXCEPTION 'Only the assigned approver can edit a prompt during approval review';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unsupported workflow transition from %/% to %/%', OLD.status, COALESCE(old_phase, 'none'), NEW.status, COALESCE(new_phase, 'none');
END;
$$;

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

  IF _status = 'in_review' THEN
    RETURN _created_by = _user_id OR _reviewer_id = _user_id OR _approver_id = _user_id;
  END IF;

  RETURN false;
END;
$$;