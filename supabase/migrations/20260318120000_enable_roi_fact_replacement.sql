CREATE POLICY "Authenticated can update roi"
ON public.roi_facts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated can delete roi"
ON public.roi_facts
FOR DELETE
TO authenticated
USING (true);