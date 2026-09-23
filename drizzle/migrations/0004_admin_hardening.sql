CREATE OR REPLACE FUNCTION public.guard_inactive_show_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shows WHERE id = NEW.show_id AND is_active) THEN
    RAISE EXCEPTION 'این نمایش در حال حاضر فعال نیست';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_inactive_show_booking() FROM public, anon, authenticated;
CREATE TRIGGER guard_inactive_show_booking BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_inactive_show_booking();

-- Status changes on bookings/tickets must go through audited RPCs only
DROP POLICY IF EXISTS "admins update bookings" ON public.bookings;
DROP POLICY IF EXISTS "admins update tickets" ON public.tickets;
REVOKE UPDATE ON public.bookings, public.tickets FROM authenticated, anon;