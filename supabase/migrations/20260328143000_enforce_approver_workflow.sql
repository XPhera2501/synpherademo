DROP POLICY IF EXISTS "Creators can update own prompts" ON public.prompt_assets;

CREATE POLICY "Workflow participants can update prompts"
ON public.prompt_assets FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR reviewer_id = auth.uid()
  OR approver_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  created_by = auth.uid()
  OR reviewer_id = auth.uid()
  OR approver_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE OR REPLACE FUNCTION public.protect_profile_governance_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.manager_id IS DISTINCT FROM OLD.manager_id OR NEW.department IS DISTINCT FROM OLD.department THEN
    IF auth.uid() IS NULL OR NOT (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Only admins can change manager or department assignments';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_governance_fields ON public.profiles;

CREATE TRIGGER protect_profile_governance_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_governance_fields();

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
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'in_review' AND NEW.reviewer_id IS NULL THEN
      RAISE EXCEPTION 'A reviewer must be assigned before a prompt can enter in_review';
    END IF;

    IF NEW.status = 'pending_approval' THEN
      RAISE EXCEPTION 'Prompts cannot be created directly in pending_approval';
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

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  active_reviewer := COALESCE(OLD.reviewer_id, NEW.reviewer_id);
  active_approver := COALESCE(OLD.approver_id, NEW.approver_id);

  IF OLD.status IN ('draft', 'created') AND NEW.status = 'in_review' THEN
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

  IF OLD.status = 'in_review' AND NEW.status = 'pending_approval' THEN
    IF actor IS DISTINCT FROM active_reviewer THEN
      RAISE EXCEPTION 'Only the assigned reviewer can submit a prompt for approval';
    END IF;

    IF NEW.approver_id IS NULL THEN
      RAISE EXCEPTION 'An approver must be assigned before entering pending_approval';
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

  IF OLD.status = 'in_review' AND NEW.status = 'created' THEN
    IF actor IS DISTINCT FROM active_reviewer THEN
      RAISE EXCEPTION 'Only the assigned reviewer can return a prompt to the creator';
    END IF;

    IF NEW.reviewer_id IS NOT NULL OR NEW.approver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Reviewer and approver assignments must be cleared when returning to creator';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'pending_approval' AND NEW.status = 'created' THEN
    IF actor IS DISTINCT FROM active_approver THEN
      RAISE EXCEPTION 'Only the assigned approver can return a prompt to the creator';
    END IF;

    IF NEW.reviewer_id IS NOT NULL OR NEW.approver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Reviewer and approver assignments must be cleared when returning to creator';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'pending_approval' AND NEW.status = 'approved' THEN
    IF actor IS DISTINCT FROM active_approver THEN
      RAISE EXCEPTION 'Only the assigned approver can approve a prompt';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unsupported workflow transition from % to %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS enforce_prompt_asset_workflow ON public.prompt_assets;

CREATE TRIGGER enforce_prompt_asset_workflow
BEFORE INSERT OR UPDATE ON public.prompt_assets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_prompt_asset_workflow();