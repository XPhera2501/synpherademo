
-- Fix overly permissive INSERT policies
DROP POLICY "Authenticated can insert roi" ON public.roi_facts;
CREATE POLICY "Creators can insert roi" ON public.roi_facts FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'creator'));

DROP POLICY "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());
