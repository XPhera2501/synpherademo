
-- Delete related data for fork assets first (foreign key dependencies)
DELETE FROM public.version_snapshots WHERE asset_id IN (
  SELECT id FROM public.prompt_assets WHERE title LIKE '%(Fork)%'
);

DELETE FROM public.lineage_entries WHERE asset_id IN (
  SELECT id FROM public.prompt_assets WHERE title LIKE '%(Fork)%'
) OR parent_id IN (
  SELECT id FROM public.prompt_assets WHERE title LIKE '%(Fork)%'
);

DELETE FROM public.roi_facts WHERE asset_id IN (
  SELECT id FROM public.prompt_assets WHERE title LIKE '%(Fork)%'
);

DELETE FROM public.prompt_comments WHERE prompt_id IN (
  SELECT id FROM public.prompt_assets WHERE title LIKE '%(Fork)%'
);

DELETE FROM public.audit_logs WHERE target_id IN (
  SELECT id FROM public.prompt_assets WHERE title LIKE '%(Fork)%'
);

-- Delete the fork assets themselves
DELETE FROM public.prompt_assets WHERE title LIKE '%(Fork)%';

-- Update old 'released' status to 'approved'
UPDATE public.prompt_assets SET status = 'approved' WHERE status = 'released';
