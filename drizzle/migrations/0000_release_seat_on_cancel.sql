-- allow a seat to be booked again after a booking/ticket is cancelled
ALTER TABLE public.booking_items ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE public.booking_items bi
SET active = false
FROM public.bookings b
WHERE b.id = bi.booking_id AND b.status = 'cancelled';

UPDATE public.booking_items bi
SET active = false
FROM public.tickets t
WHERE t.booking_item_id = bi.id AND t.status = 'cancelled';

ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_show_seat_unique;
CREATE UNIQUE INDEX IF NOT EXISTS booking_items_active_seat_unique
  ON public.booking_items (show_seat_id) WHERE active;

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
    UPDATE public.booking_items SET active = false WHERE booking_id = p_booking_id;
  END IF;

  RETURN json_build_object('paymentId', v_payment_id, 'status', p_outcome, 'reference', v_ref);
END;
$$;

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

  UPDATE public.booking_items SET active = false WHERE id = v_ticket.booking_item_id;

  SELECT count(*) INTO v_remaining FROM public.tickets
  WHERE booking_id = v_ticket.booking_id AND status = 'valid';
  IF v_remaining = 0 THEN
    UPDATE public.bookings SET status = 'cancelled' WHERE id = v_ticket.booking_id;
  END IF;
END;
$$;
