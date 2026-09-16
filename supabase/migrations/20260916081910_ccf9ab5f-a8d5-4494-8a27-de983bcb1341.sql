CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  provider text NOT NULL DEFAULT 'mock',
  status text NOT NULL DEFAULT 'pending',
  reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_status_check CHECK (status IN ('pending','success','failed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins view all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TICKETS
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_item_id uuid NOT NULL REFERENCES public.booking_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticket_code text NOT NULL UNIQUE,
  qr_payload text NOT NULL,
  seat_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'valid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_status_check CHECK (status IN ('valid','used','cancelled')),
  CONSTRAINT tickets_item_unique UNIQUE (booking_item_id)
);
GRANT SELECT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bookings: allow awaiting payment status
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','awaiting_payment','confirmed','cancelled'));

-- create_booking now leaves booking awaiting payment
CREATE OR REPLACE FUNCTION public.create_booking(p_slug text, p_session_id uuid, p_seat_labels text[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_show_id uuid;
  v_price integer;
  v_total integer := 0;
  v_booking_id uuid;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'برای رزرو باید وارد حساب کاربری شوید';
  END IF;

  IF p_seat_labels IS NULL OR array_length(p_seat_labels, 1) IS NULL THEN
    RAISE EXCEPTION 'هیچ صندلی‌ای انتخاب نشده است';
  END IF;

  IF array_length(p_seat_labels, 1) > 8 THEN
    RAISE EXCEPTION 'حداکثر ۸ صندلی در هر رزرو مجاز است';
  END IF;

  SELECT id, price INTO v_show_id, v_price FROM public.shows WHERE slug = p_slug;
  IF v_show_id IS NULL THEN
    RAISE EXCEPTION 'نمایش یافت نشد';
  END IF;

  CREATE TEMP TABLE _picked ON COMMIT DROP AS
  SELECT ss.id, COALESCE(ss.price, v_price) AS unit_price, ss.status
  FROM public.show_seats ss
  JOIN public.seats s ON s.id = ss.seat_id
  WHERE ss.session_id = p_session_id
    AND (s.row_label || s.seat_number::text) = ANY (p_seat_labels)
  FOR UPDATE OF ss;

  SELECT count(*) INTO v_count FROM _picked;
  IF v_count <> array_length(p_seat_labels, 1) THEN
    RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی معتبر نیستند';
  END IF;

  IF EXISTS (SELECT 1 FROM _picked WHERE status <> 'available') THEN
    RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی دیگر آزاد نیستند';
  END IF;

  SELECT sum(unit_price) INTO v_total FROM _picked;

  INSERT INTO public.bookings (show_id, session_id, user_id, seat_count, total_price, status)
  VALUES (v_show_id, p_session_id, v_user, v_count, v_total, 'awaiting_payment')
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, show_seat_id, unit_price)
  SELECT v_booking_id, id, unit_price FROM _picked;

  UPDATE public.show_seats SET status = 'reserved' WHERE id IN (SELECT id FROM _picked);

  RETURN v_booking_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی همین حالا رزرو شدند';
END;
$$;

-- process a (mock) payment for a booking
CREATE OR REPLACE FUNCTION public.process_payment(p_booking_id uuid, p_outcome text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_payment_id uuid;
  v_ref text;
  v_item record;
  v_code text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'ابتدا وارد حساب کاربری شوید';
  END IF;
  IF p_outcome NOT IN ('success','failed','cancelled') THEN
    RAISE EXCEPTION 'نتیجهٔ پرداخت نامعتبر است';
  END IF;

  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND user_id = v_user FOR UPDATE;
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'رزرو یافت نشد';
  END IF;
  IF v_booking.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'این رزرو در انتظار پرداخت نیست';
  END IF;

  v_ref := 'MOCK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.payments (booking_id, user_id, amount, provider, status, reference)
  VALUES (p_booking_id, v_user, v_booking.total_price, 'mock', p_outcome, v_ref)
  RETURNING id INTO v_payment_id;

  IF p_outcome = 'success' THEN
    UPDATE public.bookings SET status = 'confirmed' WHERE id = p_booking_id;

    FOR v_item IN
      SELECT bi.id AS item_id, s.row_label || s.seat_number::text AS label
      FROM public.booking_items bi
      JOIN public.show_seats ss ON ss.id = bi.show_seat_id
      JOIN public.seats s ON s.id = ss.seat_id
      WHERE bi.booking_id = p_booking_id
      ORDER BY s.row_label, s.seat_number
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
  END IF;

  RETURN json_build_object('paymentId', v_payment_id, 'status', p_outcome, 'reference', v_ref);
END;
$$;

-- cancel a single ticket and release its seat
CREATE OR REPLACE FUNCTION public.cancel_ticket(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ticket public.tickets%ROWTYPE;
  v_remaining integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'ابتدا وارد حساب کاربری شوید';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets
  WHERE id = p_ticket_id AND (user_id = v_user OR public.has_role(v_user, 'admin'))
  FOR UPDATE;
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'بلیت یافت نشد';
  END IF;
  IF v_ticket.status <> 'valid' THEN
    RAISE EXCEPTION 'این بلیت قابل لغو نیست';
  END IF;

  UPDATE public.tickets SET status = 'cancelled' WHERE id = p_ticket_id;

  UPDATE public.show_seats SET status = 'available'
  WHERE id = (SELECT show_seat_id FROM public.booking_items WHERE id = v_ticket.booking_item_id);

  SELECT count(*) INTO v_remaining FROM public.tickets
  WHERE booking_id = v_ticket.booking_id AND status = 'valid';
  IF v_remaining = 0 THEN
    UPDATE public.bookings SET status = 'cancelled' WHERE id = v_ticket.booking_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.process_payment(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ticket(uuid) TO authenticated;
