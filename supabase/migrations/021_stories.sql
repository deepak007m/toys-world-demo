-- Toys World - Admin-managed homepage stories
-- Apply this migration in Supabase; it is intentionally not run by the app.

CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    excerpt TEXT NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 500),
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_published_order_idx
    ON public.stories (is_published, sort_order, published_at DESC);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published stories" ON public.stories;
CREATE POLICY "Public can read published stories"
    ON public.stories FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can read all stories" ON public.stories;
CREATE POLICY "Admins can read all stories"
    ON public.stories FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can insert stories" ON public.stories;
CREATE POLICY "Admins can insert stories"
    ON public.stories FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can update stories" ON public.stories;
CREATE POLICY "Admins can update stories"
    ON public.stories FOR UPDATE
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can delete stories" ON public.stories;
CREATE POLICY "Admins can delete stories"
    ON public.stories FOR DELETE
    TO authenticated
    USING ((SELECT public.is_admin()));

GRANT SELECT ON public.stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;

CREATE OR REPLACE FUNCTION public.set_stories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    IF TG_OP = 'INSERT' AND NEW.is_published THEN
        NEW.published_at = COALESCE(NEW.published_at, now());
    ELSIF TG_OP = 'UPDATE' AND NEW.is_published AND OLD.is_published IS DISTINCT FROM NEW.is_published THEN
        NEW.published_at = COALESCE(NEW.published_at, now());
    ELSIF NOT NEW.is_published THEN
        NEW.published_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_updated_at ON public.stories;
CREATE TRIGGER stories_updated_at
    BEFORE INSERT OR UPDATE ON public.stories
    FOR EACH ROW EXECUTE FUNCTION public.set_stories_updated_at();
