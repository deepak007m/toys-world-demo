-- Allow verified admins to read catalogue analytics without exposing events publicly.
GRANT SELECT ON public.catalog_events TO authenticated;

DROP POLICY IF EXISTS "Admins can read catalog events" ON public.catalog_events;
CREATE POLICY "Admins can read catalog events"
    ON public.catalog_events
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));
