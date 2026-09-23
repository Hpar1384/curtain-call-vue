
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS used_at timestamptz;

CREATE OR REPLACE FUNCTION public.can_checkin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin'::public.app_role, 'checkin_operator'::public.app_role))
$$;

CREATE OR REPLACE FUNCTION public.checkin_ticket(p_code text, p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid(); v_code text;
  v_ticket public.tickets%ROWTYPE; v_booking public.bookings%ROWTYPE;
  v_show public.shows%ROWTYPE; v_session public.show_sessions%ROWTYPE;
  v_hall text; v_at timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.can_checkin(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthorized_operator'); END IF;
  v_code := trim(coalesce(p_code, ''));
  IF v_code = '' THEN RETURN jsonb_build_object('ok', false, 'code', 'invalid_ticket'); END IF;
  SELECT * INTO v_ticket FROM public.tickets WHERE qr_payload = v_code OR ticket_code = v_code FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'ticket_not_found'); END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_ticket.booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'invalid_ticket'); END IF;
  IF v_ticket.status = 'cancelled' OR v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_cancelled'); END IF;
  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_paid'); END IF;
  IF p_session_id IS NOT NULL AND v_booking.session_id <> p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_invalid'); END IF;
  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_already_used', 'checkedInAt', v_ticket.used_at); END IF;
  IF v_ticket.status <> 'valid' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_ticket'); END IF;

  INSERT INTO public.check_ins (ticket_id, session_id, checked_in_by)
  VALUES (v_ticket.id, v_booking.session_id, v_uid)
  ON CONFLICT (ticket_id) DO NOTHING RETURNING checked_in_at INTO v_at;
  IF v_at IS NULL THEN
    SELECT checked_in_at INTO v_at FROM public.check_ins WHERE ticket_id = v_ticket.id;
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_already_used', 'checkedInAt', v_at);
  END IF;
  UPDATE public.tickets SET status = 'used', used_at = v_at, updated_at = now() WHERE id = v_ticket.id;

  SELECT * INTO v_session FROM public.show_sessions WHERE id = v_booking.session_id;
  SELECT * INTO v_show FROM public.shows WHERE id = v_booking.show_id;
  SELECT h.name INTO v_hall FROM public.halls h WHERE h.id = v_show.hall_id;
  RETURN jsonb_build_object('ok', true, 'code', 'checked_in',
    'ticketCode', v_ticket.ticket_code, 'seat', v_ticket.seat_label,
    'showTitle', v_show.title, 'hall', coalesce(v_hall, ''),
    'startsAt', v_session.starts_at, 'checkedInAt', v_at,
    'operatorEmail', (SELECT email FROM auth.users WHERE id = v_uid));
END $$;

CREATE OR REPLACE FUNCTION public.staff_session_stats(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_total int; v_used int;
BEGIN
  IF v_uid IS NULL OR NOT public.can_checkin(v_uid) THEN RAISE EXCEPTION 'unauthorized_operator'; END IF;
  SELECT count(*) INTO v_total FROM public.tickets t JOIN public.bookings b ON b.id = t.booking_id
   WHERE b.session_id = p_session_id AND b.status = 'confirmed' AND t.status IN ('valid','used');
  SELECT count(*) INTO v_used FROM public.check_ins WHERE session_id = p_session_id;
  RETURN jsonb_build_object('total', v_total, 'checkedIn', v_used,
    'remaining', greatest(v_total - v_used, 0),
    'recent', coalesce((SELECT jsonb_agg(r) FROM (
      SELECT t.seat_label AS seat, t.ticket_code AS code, c.checked_in_at AS "checkedInAt"
      FROM public.check_ins c JOIN public.tickets t ON t.id = c.ticket_id
      WHERE c.session_id = p_session_id ORDER BY c.checked_in_at DESC LIMIT 10) r), '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.checkin_ticket(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_session_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_ticket(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_session_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_checkin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.regenerate_hall_seats(_hall_id uuid, _rows integer, _seats_per_row integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  IF _rows < 1 OR _rows > 20 OR _seats_per_row < 1 OR _seats_per_row > 30 THEN
    RAISE EXCEPTION 'ابعاد سالن نامعتبر است'; END IF;
  SELECT rows_count, seats_per_row INTO v_old FROM public.halls WHERE id = _hall_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'سالن یافت نشد'; END IF;
  IF v_old.rows_count = _rows AND v_old.seats_per_row = _seats_per_row
     AND EXISTS (SELECT 1 FROM public.seats WHERE hall_id = _hall_id) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b JOIN public.shows sh ON sh.id = b.show_id
             WHERE sh.hall_id = _hall_id AND b.status IN ('pending','awaiting_payment','confirmed')) THEN
    RAISE EXCEPTION 'سانس‌های این سالن رزرو فعال دارند؛ تغییر چیدمان صندلی‌ها مجاز نیست';
  END IF;
  IF EXISTS (SELECT 1 FROM public.booking_items bi JOIN public.show_seats ss ON ss.id = bi.show_seat_id
             JOIN public.seats s ON s.id = ss.seat_id WHERE s.hall_id = _hall_id) THEN
    RAISE EXCEPTION 'این سالن سابقهٔ رزرو دارد؛ تغییر چیدمان صندلی‌ها مجاز نیست';
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

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.bookings SET expires_at = created_at + interval '10 minutes' WHERE expires_at IS NULL;
ALTER TABLE public.bookings ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 minutes');

-- Idempotent; only touches overdue unpaid bookings. Called on demand (seat map load, new booking) + hourly backstop.
CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.bookings
    WHERE status IN ('pending','awaiting_payment') AND expires_at < now()
    FOR UPDATE SKIP LOCKED) x;
  IF v_ids IS NULL THEN RETURN 0; END IF;
  UPDATE public.show_seats SET status = 'available'
    WHERE id IN (SELECT show_seat_id FROM public.booking_items WHERE booking_id = ANY(v_ids) AND active);
  UPDATE public.booking_items SET active = false WHERE booking_id = ANY(v_ids);
  UPDATE public.bookings SET status = 'cancelled' WHERE id = ANY(v_ids);
  RETURN array_length(v_ids, 1);
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking(p_slug text, p_session_id uuid, p_seat_labels text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_show_id uuid; v_price integer; v_total integer := 0;
  v_booking_id uuid; v_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'برای رزرو باید وارد حساب کاربری شوید'; END IF;
  IF p_seat_labels IS NULL OR array_length(p_seat_labels, 1) IS NULL THEN RAISE EXCEPTION 'هیچ صندلی‌ای انتخاب نشده است'; END IF;
  IF array_length(p_seat_labels, 1) > 8 THEN RAISE EXCEPTION 'حداکثر ۸ صندلی در هر رزرو مجاز است'; END IF;
  PERFORM public.expire_stale_bookings();
  SELECT id, price INTO v_show_id, v_price FROM public.shows WHERE slug = p_slug;
  IF v_show_id IS NULL THEN RAISE EXCEPTION 'نمایش یافت نشد'; END IF;
  CREATE TEMP TABLE _picked ON COMMIT DROP AS
  SELECT ss.id, COALESCE(ss.price, v_price) AS unit_price, ss.status
  FROM public.show_seats ss JOIN public.seats s ON s.id = ss.seat_id
  WHERE ss.session_id = p_session_id AND (s.row_label || s.seat_number::text) = ANY (p_seat_labels)
  FOR UPDATE OF ss;
  SELECT count(*) INTO v_count FROM _picked;
  IF v_count <> array_length(p_seat_labels, 1) THEN RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی معتبر نیستند'; END IF;
  IF EXISTS (SELECT 1 FROM _picked WHERE status <> 'available') THEN RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی دیگر آزاد نیستند'; END IF;
  SELECT sum(unit_price) INTO v_total FROM _picked;
  INSERT INTO public.bookings (show_id, session_id, user_id, seat_count, total_price, status, expires_at)
  VALUES (v_show_id, p_session_id, v_user, v_count, v_total, 'awaiting_payment', now() + interval '10 minutes')
  RETURNING id INTO v_booking_id;
  INSERT INTO public.booking_items (booking_id, show_seat_id, unit_price) SELECT v_booking_id, id, unit_price FROM _picked;
  UPDATE public.show_seats SET status = 'reserved' WHERE id IN (SELECT id FROM _picked);
  RETURN v_booking_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی همین حالا رزرو شدند';
END $$;

CREATE OR REPLACE FUNCTION public.process_payment(p_booking_id uuid, p_outcome text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_booking public.bookings%ROWTYPE;
  v_payment_id uuid; v_ref text; v_item record; v_code text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'ابتدا وارد حساب کاربری شوید'; END IF;
  IF p_outcome NOT IN ('success','failed','cancelled') THEN RAISE EXCEPTION 'نتیجهٔ پرداخت نامعتبر است'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND user_id = v_user FOR UPDATE;
  IF v_booking.id IS NULL THEN RAISE EXCEPTION 'رزرو یافت نشد'; END IF;
  IF v_booking.status <> 'awaiting_payment' THEN RAISE EXCEPTION 'این رزرو در انتظار پرداخت نیست'; END IF;
  IF v_booking.expires_at IS NOT NULL AND v_booking.expires_at < now() THEN
    RAISE EXCEPTION 'مهلت پرداخت این رزرو تمام شده است؛ دوباره صندلی انتخاب کنید';
  END IF;
  v_ref := 'MOCK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO public.payments (booking_id, user_id, amount, provider, status, reference)
  VALUES (p_booking_id, v_user, v_booking.total_price, 'mock', p_outcome, v_ref) RETURNING id INTO v_payment_id;
  IF p_outcome = 'success' THEN
    UPDATE public.bookings SET status = 'confirmed' WHERE id = p_booking_id;
    FOR v_item IN
      SELECT bi.id AS item_id, s.row_label || s.seat_number::text AS label
      FROM public.booking_items bi JOIN public.show_seats ss ON ss.id = bi.show_seat_id
      JOIN public.seats s ON s.id = ss.seat_id
      WHERE bi.booking_id = p_booking_id ORDER BY s.row_label, s.seat_number
    LOOP
      v_code := 'TKT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      INSERT INTO public.tickets (booking_id, booking_item_id, user_id, ticket_code, qr_payload, seat_label, status)
      VALUES (p_booking_id, v_item.item_id, v_user, v_code,
              'CURTAINCALL|' || p_booking_id::text || '|' || v_code, v_item.label, 'valid');
    END LOOP;
  ELSE
    UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
    UPDATE public.show_seats SET status = 'available'
      WHERE id IN (SELECT show_seat_id FROM public.booking_items WHERE booking_id = p_booking_id);
    UPDATE public.booking_items SET active = false WHERE booking_id = p_booking_id;
  END IF;
  RETURN json_build_object('paymentId', v_payment_id, 'status', p_outcome, 'reference', v_ref);
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-stale-bookings';
SELECT cron.schedule('expire-stale-bookings', '0 * * * *', $$SELECT public.expire_stale_bookings()$$);

UPDATE public.show_sessions SET starts_at = (
  (CASE split_part(translate(date_label, '۰۱۲۳۴۵۶۷۸۹', '0123456789'), ' ', 2)
     WHEN 'مرداد' THEN date '2026-07-22' ELSE date '2026-08-22' END
   + split_part(translate(date_label, '۰۱۲۳۴۵۶۷۸۹', '0123456789'), ' ', 1)::int)
  + translate(time_label, '۰۱۲۳۴۵۶۷۸۹', '0123456789')::time
) AT TIME ZONE 'Asia/Tehran'
WHERE starts_at IS NULL;
UPDATE public.show_sessions SET starts_at = now() + interval '7 days' WHERE starts_at IS NULL;
ALTER TABLE public.show_sessions ALTER COLUMN starts_at SET NOT NULL;
ALTER TABLE public.show_sessions ALTER COLUMN date_label DROP NOT NULL;
ALTER TABLE public.show_sessions ALTER COLUMN weekday_label DROP NOT NULL;
ALTER TABLE public.show_sessions ALTER COLUMN time_label DROP NOT NULL;
ALTER TABLE public.show_sessions ALTER COLUMN date_label SET DEFAULT '';
ALTER TABLE public.show_sessions ALTER COLUMN weekday_label SET DEFAULT '';
ALTER TABLE public.show_sessions ALTER COLUMN time_label SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.admin_session_overview()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.starts_at), '[]'::json) INTO result FROM (
    SELECT ses.id, ses.starts_at,
      (SELECT count(*) FROM public.show_seats x WHERE x.session_id = ses.id) AS capacity,
      (SELECT count(*) FROM public.bookings b WHERE b.session_id = ses.id AND b.status IN ('pending','awaiting_payment','confirmed')) AS "activeBookings",
      (SELECT count(*) FROM public.tickets t JOIN public.bookings b ON b.id = t.booking_id
         WHERE b.session_id = ses.id AND t.status IN ('valid','used')) AS "ticketsTotal",
      (SELECT count(*) FROM public.check_ins c WHERE c.session_id = ses.id) AS "checkedIn"
    FROM public.show_sessions ses) t;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_row jsonb := to_jsonb(COALESCE(NEW, OLD)); v_details jsonb := '{}'::jsonb;
BEGIN
  IF v_actor IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_TABLE_NAME <> 'check_ins' AND NOT public.has_role(v_actor, 'admin') THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_TABLE_NAME IN ('bookings','tickets') THEN
    IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    v_details := jsonb_build_object('from', OLD.status, 'to', NEW.status);
  ELSIF TG_TABLE_NAME = 'shows' THEN
    v_details := jsonb_build_object('title', v_row->>'title', 'is_active', v_row->'is_active');
  ELSIF TG_TABLE_NAME = 'show_sessions' THEN
    v_details := jsonb_build_object('starts_at', v_row->>'starts_at');
  ELSIF TG_TABLE_NAME = 'halls' THEN
    v_details := jsonb_build_object('name', v_row->>'name', 'rows', v_row->'rows_count', 'seats_per_row', v_row->'seats_per_row');
  ELSIF TG_TABLE_NAME = 'theaters' THEN
    v_details := jsonb_build_object('name', v_row->>'name', 'city', v_row->>'city');
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    v_details := jsonb_build_object('user_id', v_row->>'user_id', 'role', v_row->>'role');
  ELSIF TG_TABLE_NAME = 'check_ins' THEN
    v_details := jsonb_build_object('ticket_id', v_row->>'ticket_id', 'session_id', v_row->>'session_id');
  END IF;
  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity, entity_id, details)
  VALUES (v_actor, (SELECT email FROM auth.users WHERE id = v_actor), lower(TG_OP), TG_TABLE_NAME, (v_row->>'id')::uuid, v_details);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.guard_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'shows' THEN
    IF EXISTS (SELECT 1 FROM public.bookings WHERE show_id = OLD.id) THEN
      RAISE EXCEPTION 'این نمایش رزرو یا بلیت فروخته‌شده دارد و قابل حذف نیست؛ آن را غیرفعال کنید'; END IF;
    IF EXISTS (SELECT 1 FROM public.show_sessions WHERE show_id = OLD.id) THEN
      RAISE EXCEPTION 'این نمایش سانس دارد؛ ابتدا سانس‌ها را حذف یا نمایش را غیرفعال کنید'; END IF;
  ELSIF TG_TABLE_NAME = 'show_sessions' THEN
    IF EXISTS (SELECT 1 FROM public.bookings WHERE session_id = OLD.id) THEN
      RAISE EXCEPTION 'این سانس رزرو دارد و قابل حذف نیست'; END IF;
  ELSIF TG_TABLE_NAME = 'halls' THEN
    IF EXISTS (SELECT 1 FROM public.shows WHERE hall_id = OLD.id) THEN
      RAISE EXCEPTION 'نمایشی به این سالن متصل است و قابل حذف نیست'; END IF;
  ELSIF TG_TABLE_NAME = 'theaters' THEN
    IF EXISTS (SELECT 1 FROM public.halls WHERE theater_id = OLD.id) THEN
      RAISE EXCEPTION 'این تئاتر سالن دارد؛ ابتدا سالن‌ها را حذف کنید'; END IF;
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS guard_delete_theaters ON public.theaters;
CREATE TRIGGER guard_delete_theaters BEFORE DELETE ON public.theaters FOR EACH ROW EXECUTE FUNCTION public.guard_delete();
DROP TRIGGER IF EXISTS audit_theaters ON public.theaters;
CREATE TRIGGER audit_theaters AFTER INSERT OR UPDATE OR DELETE ON public.theaters FOR EACH ROW EXECUTE FUNCTION public.audit_row();
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_row();

DROP POLICY IF EXISTS "posters public read" ON storage.objects;
CREATE POLICY "posters public read" ON storage.objects FOR SELECT USING (bucket_id = 'posters');
DROP POLICY IF EXISTS "posters admin insert" ON storage.objects;
CREATE POLICY "posters admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'posters' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "posters admin update" ON storage.objects;
CREATE POLICY "posters admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'posters' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "posters admin delete" ON storage.objects;
CREATE POLICY "posters admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'posters' AND public.has_role(auth.uid(), 'admin'));
