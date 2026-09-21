-- Check-in records
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.tickets(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.show_sessions(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid NOT NULL
);

GRANT SELECT ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- staff authorization helper
CREATE OR REPLACE FUNCTION public.can_checkin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'checkin_operator'::public.app_role)
  )
$$;

DROP POLICY IF EXISTS "Staff can view check-ins" ON public.check_ins;
CREATE POLICY "Staff can view check-ins"
ON public.check_ins FOR SELECT TO authenticated
USING (public.can_checkin(auth.uid()));

CREATE INDEX IF NOT EXISTS check_ins_session_idx ON public.check_ins(session_id, checked_in_at DESC);

-- Atomic check-in RPC
CREATE OR REPLACE FUNCTION public.checkin_ticket(p_code text, p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_ticket public.tickets%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_show public.shows%ROWTYPE;
  v_session public.show_sessions%ROWTYPE;
  v_hall text;
  v_at timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.can_checkin(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthorized_operator');
  END IF;

  v_code := trim(coalesce(p_code, ''));
  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_ticket');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets
  WHERE qr_payload = v_code OR ticket_code = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_not_found');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = v_ticket.booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_ticket');
  END IF;

  IF v_ticket.status = 'cancelled' OR v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_cancelled');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_paid');
  END IF;

  IF p_session_id IS NOT NULL AND v_booking.session_id <> p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_invalid');
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT checked_in_at INTO v_at FROM public.check_ins WHERE ticket_id = v_ticket.id;
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_already_used', 'checkedInAt', v_at);
  END IF;

  UPDATE public.tickets SET status = 'used', updated_at = now() WHERE id = v_ticket.id;

  INSERT INTO public.check_ins (ticket_id, session_id, checked_in_by)
  VALUES (v_ticket.id, v_booking.session_id, v_uid)
  ON CONFLICT (ticket_id) DO NOTHING
  RETURNING checked_in_at INTO v_at;

  IF v_at IS NULL THEN
    SELECT checked_in_at INTO v_at FROM public.check_ins WHERE ticket_id = v_ticket.id;
    RETURN jsonb_build_object('ok', false, 'code', 'ticket_already_used', 'checkedInAt', v_at);
  END IF;

  SELECT * INTO v_session FROM public.show_sessions WHERE id = v_booking.session_id;
  SELECT * INTO v_show FROM public.shows WHERE id = v_booking.show_id;
  SELECT h.name INTO v_hall FROM public.halls h WHERE h.id = v_show.hall_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'checked_in',
    'ticketCode', v_ticket.ticket_code,
    'seat', v_ticket.seat_label,
    'showTitle', v_show.title,
    'hall', coalesce(v_hall, ''),
    'date', coalesce(v_session.date_label, ''),
    'weekday', coalesce(v_session.weekday_label, ''),
    'time', coalesce(v_session.time_label, ''),
    'checkedInAt', v_at,
    'operatorEmail', (SELECT email FROM auth.users WHERE id = v_uid)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checkin_ticket(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.checkin_ticket(text, uuid) TO authenticated;

-- Staff dashboard stats
CREATE OR REPLACE FUNCTION public.staff_session_stats(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int;
  v_used int;
BEGIN
  IF v_uid IS NULL OR NOT public.can_checkin(v_uid) THEN
    RAISE EXCEPTION 'unauthorized_operator';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.tickets t
  JOIN public.bookings b ON b.id = t.booking_id
  WHERE b.session_id = p_session_id AND b.status = 'confirmed' AND t.status IN ('valid','used');

  SELECT count(*) INTO v_used FROM public.check_ins WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'total', v_total,
    'checkedIn', v_used,
    'remaining', greatest(v_total - v_used, 0),
    'recent', coalesce((
      SELECT jsonb_agg(r) FROM (
        SELECT t.seat_label AS seat, t.ticket_code AS code, c.checked_in_at AS "checkedInAt"
        FROM public.check_ins c
        JOIN public.tickets t ON t.id = c.ticket_id
        WHERE c.session_id = p_session_id
        ORDER BY c.checked_in_at DESC
        LIMIT 10
      ) r
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_session_stats(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_session_stats(uuid) TO authenticated;