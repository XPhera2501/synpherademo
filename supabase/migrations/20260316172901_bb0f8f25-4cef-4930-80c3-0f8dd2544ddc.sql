ALTER TABLE public.lineage_entries DROP CONSTRAINT lineage_entries_action_check;
UPDATE public.lineage_entries SET action = 'approved' WHERE action = 'released';
DELETE FROM public.lineage_entries WHERE action = 'forked';
ALTER TABLE public.lineage_entries ADD CONSTRAINT lineage_entries_action_check CHECK (action = ANY (ARRAY['created'::text, 'approved'::text, 'updated'::text]));