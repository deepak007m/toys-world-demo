-- Toys World - derive review display names from the authenticated profile.
-- This migration is prepared but intentionally not executed by the app.

CREATE OR REPLACE FUNCTION public.set_review_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    profile_name TEXT;
BEGIN
    SELECT NULLIF(pg_catalog.btrim(full_name), '')
    INTO profile_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    NEW.display_name = COALESCE(profile_name, 'Customer');
    RETURN NEW;
END;
$$;

UPDATE public.reviews AS reviews
SET display_name = COALESCE(
    (
        SELECT NULLIF(pg_catalog.btrim(profiles.full_name), '')
        FROM public.profiles AS profiles
        WHERE profiles.id = reviews.user_id
    ),
    'Customer'
);

DROP TRIGGER IF EXISTS reviews_set_display_name ON public.reviews;
CREATE TRIGGER reviews_set_display_name
    BEFORE INSERT OR UPDATE OF user_id, display_name ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.set_review_display_name();

REVOKE ALL ON FUNCTION public.set_review_display_name() FROM PUBLIC, anon, authenticated;
