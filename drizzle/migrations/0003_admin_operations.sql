ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row jsonb := to_jsonb(COALESCE(NEW, OLD));
  v_details jsonb := '{}'::jsonb;
BEGIN
  IF v_actor IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_TABLE_NAME = 'check_ins' THEN
    NULL;
  ELSIF NOT public.has_role(v_actor, 'admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_TABLE_NAME IN ('bookings','tickets') THEN
    IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
    v_details := jsonb_build_object('from', OLD.status, 'to', NEW.status);
  ELSIF TG_TABLE_NAME = 'shows' THEN
    v_details := jsonb_build_object('title', v_row->>'title', 'is_active', v_row->'is_active');
  ELSIF TG_TABLE_NAME = 'show_sessions' THEN
    v_details := jsonb_build_object('date', v_row->>'date_label', 'time', v_row->>'time_label');
  ELSIF TG_TABLE_NAME = 'halls' THEN
    v_details := jsonb_build_object('name', v_row->>'name', 'rows', v_row->'rows_count', 'seats_per_row', v_row->'seats_per_row');
  ELSIF TG_TABLE_NAME = 'check_ins' THEN
    v_details := jsonb_build_object('ticket_id', v_row->>'ticket_id', 'session_id', v_row->>'session_id');
  END IF;
  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity, entity_id, details)
  VALUES (v_actor, (SELECT email FROM auth.users WHERE id = v_actor), lower(TG_OP), TG_TABLE_NAME,
          (v_row->>'id')::uuid, v_details);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE ALL ON FUNCTION public.audit_row() FROM public, anon, authenticated;

CREATE TRIGGER audit_shows AFTER INSERT OR UPDATE OR DELETE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_sessions AFTER INSERT OR UPDATE OR DELETE ON public.show_sessions FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_halls AFTER INSERT OR UPDATE OR DELETE ON public.halls FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_bookings AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_tickets AFTER UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_checkins AFTER INSERT ON public.check_ins FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- Delete guards (enforced regardless of caller)
CREATE OR REPLACE FUNCTION public.guard_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'shows' THEN
    IF EXISTS (SELECT 1 FROM public.bookings WHERE show_id = OLD.id) THEN
      RAISE EXCEPTION 'این نمایش رزرو یا بلیت فروخته‌شده دارد و قابل حذف نیست؛ آن را غیرفعال کنید';
    END IF;
    IF EXISTS (SELECT 1 FROM public.show_sessions WHERE show_id = OLD.id) THEN
      RAISE EXCEPTION 'این نمایش سانس دارد؛ ابتدا سانس‌ها را حذف یا نمایش را غیرفعال کنید';
    END IF;
  ELSIF TG_TABLE_NAME = 'show_sessions' THEN
    IF EXISTS (SELECT 1 FROM public.bookings WHERE session_id = OLD.id) THEN
      RAISE EXCEPTION 'این سانس رزرو دارد و قابل حذف نیست';
    END IF;
  ELSIF TG_TABLE_NAME = 'halls' THEN
    IF EXISTS (SELECT 1 FROM public.shows WHERE hall_id = OLD.id) THEN
      RAISE EXCEPTION 'نمایشی به این سالن متصل است و قابل حذف نیست';
    END IF;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.guard_delete() FROM public, anon, authenticated;
CREATE TRIGGER guard_delete_shows BEFORE DELETE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.guard_delete();
CREATE TRIGGER guard_delete_sessions BEFORE DELETE ON public.show_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_delete();
CREATE TRIGGER guard_delete_halls BEFORE DELETE ON public.halls FOR EACH ROW EXECUTE FUNCTION public.guard_delete();

-- Safe seat regeneration: never destroys seats tied to bookings
CREATE OR REPLACE FUNCTION public.regenerate_hall_seats(_hall_id uuid, _rows integer, _seats_per_row integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  IF _rows < 1 OR _rows > 20 OR _seats_per_row < 1 OR _seats_per_row > 30 THEN
    RAISE EXCEPTION 'ابعاد سالن نامعتبر است';
  END IF;
  SELECT rows_count, seats_per_row INTO v_old FROM public.halls WHERE id = _hall_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'سالن یافت نشد'; END IF;
  IF v_old.rows_count = _rows AND v_old.seats_per_row = _seats_per_row
     AND EXISTS (SELECT 1 FROM public.seats WHERE hall_id = _hall_id) THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_items bi
    JOIN public.show_seats ss ON ss.id = bi.show_seat_id
    JOIN public.seats s ON s.id = ss.seat_id
    WHERE s.hall_id = _hall_id
  ) THEN
    RAISE EXCEPTION 'این سالن رزرو ثبت‌شده دارد؛ تغییر چیدمان صندلی‌ها مجاز نیست';
  END IF;

  UPDATE public.halls SET rows_count = _rows, seats_per_row = _seats_per_row WHERE id = _hall_id;
  DELETE FROM public.seats WHERE hall_id = _hall_id;
  INSERT INTO public.seats (hall_id, row_label, seat_number)
  SELECT _hall_id, chr(64 + r), n FROM generate_series(1, _rows) r, generate_series(1, _seats_per_row) n;
  INSERT INTO public.show_seats (session_id, seat_id, status)
  SELECT ses.id, s.id, 'available' FROM public.show_sessions ses
  JOIN public.shows sh ON sh.id = ses.show_id AND sh.hall_id = _hall_id
  JOIN public.seats s ON s.hall_id = _hall_id;
END $$;

-- Dashboard
CREATE OR REPLACE FUNCTION public.admin_stats() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json; v_today timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Tehran') AT TIME ZONE 'Asia/Tehran';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  SELECT json_build_object(
    'activeShows', (SELECT count(*) FROM public.shows WHERE is_active),
    'upcomingSessions', (SELECT count(*) FROM public.show_sessions ses JOIN public.shows sh ON sh.id = ses.show_id
                          WHERE sh.is_active AND (ses.starts_at IS NULL OR ses.starts_at >= now())),
    'bookingsToday', (SELECT count(*) FROM public.bookings WHERE created_at >= v_today),
    'ticketsSold', (SELECT count(*) FROM public.tickets WHERE status IN ('valid','used')),
    'checkinsToday', (SELECT count(*) FROM public.check_ins WHERE checked_in_at >= v_today),
    'revenue', (SELECT COALESCE(sum(amount),0) FROM public.payments WHERE status = 'success'),
    'users', (SELECT count(*) FROM auth.users)
  ) INTO result;
  RETURN result;
END $$;

-- Per-session overview (capacity, sales, check-ins)
CREATE OR REPLACE FUNCTION public.admin_session_overview() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::json) INTO result FROM (
    SELECT ses.id, ses.sort_order,
      (SELECT count(*) FROM public.show_seats x WHERE x.session_id = ses.id) AS capacity,
      (SELECT count(*) FROM public.bookings b WHERE b.session_id = ses.id AND b.status IN ('pending','awaiting_payment','confirmed')) AS "activeBookings",
      (SELECT count(*) FROM public.tickets t JOIN public.bookings b ON b.id = t.booking_id
         WHERE b.session_id = ses.id AND t.status IN ('valid','used')) AS "ticketsTotal",
      (SELECT count(*) FROM public.check_ins c WHERE c.session_id = ses.id) AS "checkedIn"
    FROM public.show_sessions ses
  ) t;
  RETURN result;
END $$;

-- Hall overview (capacity + whether bookings lock the layout)
CREATE OR REPLACE FUNCTION public.admin_hall_overview() RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT h.id,
      (SELECT count(*) FROM public.seats s WHERE s.hall_id = h.id) AS capacity,
      (SELECT count(*) FROM public.shows sh WHERE sh.hall_id = h.id) AS "showCount",
      EXISTS (SELECT 1 FROM public.booking_items bi JOIN public.show_seats ss ON ss.id = bi.show_seat_id
              JOIN public.seats s ON s.id = ss.seat_id WHERE s.hall_id = h.id) AS "layoutLocked"
    FROM public.halls h
  ) t;
  RETURN result;
END $$;

-- Admin cancel booking: releases seats and cancels tickets atomically
CREATE OR REPLACE FUNCTION public.admin_cancel_booking(p_booking_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  SELECT status INTO v_status FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'رزرو یافت نشد'; END IF;
  IF v_status = 'cancelled' THEN RAISE EXCEPTION 'این رزرو قبلاً لغو شده است'; END IF;
  IF EXISTS (SELECT 1 FROM public.tickets WHERE booking_id = p_booking_id AND status = 'used') THEN
    RAISE EXCEPTION 'بلیت این رزرو استفاده شده و قابل لغو نیست';
  END IF;
  UPDATE public.tickets SET status = 'cancelled' WHERE booking_id = p_booking_id AND status = 'valid';
  UPDATE public.show_seats SET status = 'available'
    WHERE id IN (SELECT show_seat_id FROM public.booking_items WHERE booking_id = p_booking_id AND active);
  UPDATE public.booking_items SET active = false WHERE booking_id = p_booking_id;
  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_session_overview(), public.admin_hall_overview(), public.admin_cancel_booking(uuid), public.admin_stats(), public.regenerate_hall_seats(uuid,integer,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_session_overview(), public.admin_hall_overview(), public.admin_cancel_booking(uuid), public.admin_stats(), public.regenerate_hall_seats(uuid,integer,integer) TO authenticated;