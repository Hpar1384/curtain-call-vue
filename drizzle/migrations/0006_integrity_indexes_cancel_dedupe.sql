-- 1. Indexes for hot paths (no duplicates of existing ones)
CREATE INDEX IF NOT EXISTS show_seats_session_status_idx ON public.show_seats (session_id, status);
CREATE INDEX IF NOT EXISTS tickets_qr_payload_idx ON public.tickets (qr_payload);
CREATE INDEX IF NOT EXISTS tickets_booking_id_idx ON public.tickets (booking_id);
CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS bookings_session_status_idx ON public.bookings (session_id, status);
CREATE INDEX IF NOT EXISTS bookings_status_expires_idx ON public.bookings (status, expires_at);
-- booking_items(booking_id) is already covered by booking_items_booking_id_show_seat_id_key

-- 2. Integrity: paid bookings / tickets / payments must never disappear via cascade
ALTER TABLE public.bookings DROP CONSTRAINT bookings_show_id_fkey,
  ADD CONSTRAINT bookings_show_id_fkey FOREIGN KEY (show_id) REFERENCES public.shows(id) ON DELETE RESTRICT;
ALTER TABLE public.bookings DROP CONSTRAINT bookings_session_id_fkey,
  ADD CONSTRAINT bookings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.show_sessions(id) ON DELETE RESTRICT;
ALTER TABLE public.booking_items DROP CONSTRAINT booking_items_booking_id_fkey,
  ADD CONSTRAINT booking_items_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;
ALTER TABLE public.booking_items DROP CONSTRAINT booking_items_show_seat_id_fkey,
  ADD CONSTRAINT booking_items_show_seat_id_fkey FOREIGN KEY (show_seat_id) REFERENCES public.show_seats(id) ON DELETE RESTRICT;
ALTER TABLE public.payments DROP CONSTRAINT payments_booking_id_fkey,
  ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;
ALTER TABLE public.tickets DROP CONSTRAINT tickets_booking_id_fkey,
  ADD CONSTRAINT tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;
ALTER TABLE public.tickets DROP CONSTRAINT tickets_booking_item_id_fkey,
  ADD CONSTRAINT tickets_booking_item_id_fkey FOREIGN KEY (booking_item_id) REFERENCES public.booking_items(id) ON DELETE RESTRICT;
ALTER TABLE public.check_ins DROP CONSTRAINT check_ins_ticket_id_fkey,
  ADD CONSTRAINT check_ins_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE RESTRICT;
ALTER TABLE public.check_ins DROP CONSTRAINT check_ins_session_id_fkey,
  ADD CONSTRAINT check_ins_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.show_sessions(id) ON DELETE RESTRICT;

-- Bookings are cancelled, never hard-deleted
DROP POLICY IF EXISTS "admins delete bookings" ON public.bookings;
REVOKE DELETE ON public.bookings FROM authenticated, anon;

-- 3. Single shared seat-release routine (used by admin cancel + expiry)
CREATE OR REPLACE FUNCTION public._release_bookings(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tickets SET status = 'cancelled' WHERE booking_id = ANY(p_ids) AND status = 'valid';
  UPDATE public.show_seats SET status = 'available'
    WHERE id IN (SELECT show_seat_id FROM public.booking_items WHERE booking_id = ANY(p_ids) AND active);
  UPDATE public.booking_items SET active = false WHERE booking_id = ANY(p_ids) AND active;
  UPDATE public.bookings SET status = 'cancelled' WHERE id = ANY(p_ids) AND status <> 'cancelled';
END $$;
REVOKE ALL ON FUNCTION public._release_bookings(uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_cancel_booking(p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'دسترسی مجاز نیست'; END IF;
  SELECT status INTO v_status FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'رزرو یافت نشد'; END IF;
  IF v_status = 'cancelled' THEN RAISE EXCEPTION 'این رزرو قبلاً لغو شده است'; END IF;
  PERFORM 1 FROM public.tickets WHERE booking_id = p_booking_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.tickets WHERE booking_id = p_booking_id AND status = 'used') THEN
    RAISE EXCEPTION 'بلیت این رزرو استفاده شده و قابل لغو نیست';
  END IF;
  PERFORM public._release_bookings(ARRAY[p_booking_id]);
END $$;

CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.bookings
    WHERE status IN ('pending','awaiting_payment') AND expires_at < now()
    FOR UPDATE SKIP LOCKED) x;
  IF v_ids IS NULL THEN RETURN 0; END IF;
  PERFORM public._release_bookings(v_ids);
  RETURN array_length(v_ids, 1);
END $$;