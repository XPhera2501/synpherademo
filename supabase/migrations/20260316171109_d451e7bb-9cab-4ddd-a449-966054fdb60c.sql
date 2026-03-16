
DELETE FROM public.version_snapshots WHERE asset_id = 'bc97088c-1b5e-4d4f-8ea2-c0cec106a5e7';
DELETE FROM public.lineage_entries WHERE asset_id = 'bc97088c-1b5e-4d4f-8ea2-c0cec106a5e7';
DELETE FROM public.roi_facts WHERE asset_id = 'bc97088c-1b5e-4d4f-8ea2-c0cec106a5e7';
DELETE FROM public.prompt_comments WHERE prompt_id = 'bc97088c-1b5e-4d4f-8ea2-c0cec106a5e7';
DELETE FROM public.audit_logs WHERE target_id = 'bc97088c-1b5e-4d4f-8ea2-c0cec106a5e7';
DELETE FROM public.prompt_assets WHERE id = 'bc97088c-1b5e-4d4f-8ea2-c0cec106a5e7';
