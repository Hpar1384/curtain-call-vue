-- Invariant: a cancelled booking never has a valid ticket.
CREATE OR REPLACE FUNCTION public.cascade_booking_cancel_to_tickets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tickets SET status = 'cancelled'
   WHERE booking_id = NEW.id AND status = 'valid';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS booking_cancel_cascade_tickets ON public.bookings;
CREATE TRIGGER booking_cancel_cascade_tickets
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
EXECUTE FUNCTION public.cascade_booking_cancel_to_tickets();

CREATE OR REPLACE FUNCTION public.guard_valid_ticket_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'valid' AND EXISTS (
    SELECT 1 FROM public.bookings WHERE id = NEW.booking_id AND status = 'cancelled') THEN
    RAISE EXCEPTION 'بلیت معتبر برای رزرو لغوشده مجاز نیست';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_valid_ticket_booking ON public.tickets;
CREATE TRIGGER guard_valid_ticket_booking
BEFORE INSERT OR UPDATE OF status, booking_id ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_valid_ticket_booking();

REVOKE ALL ON FUNCTION public.cascade_booking_cancel_to_tickets() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_valid_ticket_booking() FROM PUBLIC, anon, authenticated;

-- Payment failure/cancel path now uses the shared release logic.
CREATE OR REPLACE FUNCTION public.process_payment(p_booking_id uuid, p_outcome text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    PERFORM public._release_bookings(ARRAY[p_booking_id]);
  END IF;
  RETURN json_build_object('paymentId', v_payment_id, 'status', p_outcome, 'reference', v_ref);
END $function$;