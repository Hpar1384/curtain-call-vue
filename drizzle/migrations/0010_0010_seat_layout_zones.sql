ALTER TABLE public.seats
  ADD COLUMN section text NOT NULL DEFAULT 'main',
  ADD COLUMN zone text NOT NULL DEFAULT 'standard',
  ADD COLUMN aisle_after boolean NOT NULL DEFAULT false;
ALTER TABLE public.seats ADD CONSTRAINT seats_section_chk CHECK (section IN ('main','balcony'));
ALTER TABLE public.seats ADD CONSTRAINT seats_zone_chk CHECK (zone IN ('standard','vip','economy'));

ALTER TABLE public.halls ADD COLUMN curved boolean NOT NULL DEFAULT true;

ALTER TABLE public.shows
  ADD COLUMN vip_price integer,
  ADD COLUMN economy_price integer;
ALTER TABLE public.shows ADD CONSTRAINT shows_zone_prices_chk
  CHECK ((vip_price IS NULL OR vip_price >= 0) AND (economy_price IS NULL OR economy_price >= 0));

-- Zone price for a seat in a show; NULL means "use the show base price" (existing COALESCE in create_booking).
CREATE OR REPLACE FUNCTION public.zone_price(p_show_id uuid, p_zone text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_zone WHEN 'vip' THEN s.vip_price WHEN 'economy' THEN s.economy_price ELSE NULL END
  FROM public.shows s WHERE s.id = p_show_id
$$;

-- New session seats get their zone price automatically.
CREATE OR REPLACE FUNCTION public.set_show_seat_zone_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS NULL THEN
    SELECT public.zone_price(ss.show_id, st.zone) INTO NEW.price
    FROM public.show_sessions ss, public.seats st
    WHERE ss.id = NEW.session_id AND st.id = NEW.seat_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER show_seats_zone_price BEFORE INSERT ON public.show_seats
  FOR EACH ROW EXECUTE FUNCTION public.set_show_seat_zone_price();

-- Re-price only AVAILABLE seats of FUTURE sessions in a hall. Booked items keep their stored unit_price.
CREATE OR REPLACE FUNCTION public.admin_reprice_hall(p_hall_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.show_seats x
     SET price = public.zone_price(ses.show_id, st.zone)
    FROM public.show_sessions ses, public.seats st, public.shows sh
   WHERE x.session_id = ses.id AND x.seat_id = st.id AND sh.id = ses.show_id
     AND sh.hall_id = p_hall_id AND x.status = 'available' AND ses.starts_at > now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_reprice_hall(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reprice_hall(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_show_seat_zone_price() FROM PUBLIC, anon, authenticated;