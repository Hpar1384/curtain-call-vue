ALTER TABLE public.payments
  ADD COLUMN mode text NOT NULL DEFAULT 'test',
  ADD COLUMN authority text,
  ADD COLUMN gateway_ref text,
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN needs_refund boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD CONSTRAINT payments_mode_chk CHECK (mode IN ('test','live'));
CREATE UNIQUE INDEX payments_one_success_per_booking ON public.payments(booking_id) WHERE status = 'success';
CREATE UNIQUE INDEX payments_authority_unique ON public.payments(provider, authority) WHERE authority IS NOT NULL;

-- Payments are written only by server-side RPCs.
REVOKE INSERT, UPDATE ON public.payments FROM authenticated;

-- Step 1 (as the signed-in user): open a pending payment for an awaiting booking.
CREATE OR REPLACE FUNCTION public.start_payment(p_booking_id uuid, p_provider text, p_mode text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_b public.bookings%ROWTYPE; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'ابتدا وارد حساب کاربری شوید'; END IF;
  IF p_mode NOT IN ('test','live') THEN RAISE EXCEPTION 'حالت پرداخت نامعتبر است'; END IF;
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id AND user_id = v_user FOR UPDATE;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'رزرو یافت نشد'; END IF;
  IF v_b.status <> 'awaiting_payment' THEN RAISE EXCEPTION 'این رزرو در انتظار پرداخت نیست'; END IF;
  IF v_b.expires_at IS NOT NULL AND v_b.expires_at < now() THEN
    RAISE EXCEPTION 'مهلت پرداخت این رزرو تمام شده است؛ دوباره صندلی انتخاب کنید';
  END IF;
  -- close any earlier unfinished attempt for this booking
  UPDATE public.payments SET status = 'cancelled', updated_at = now()
   WHERE booking_id = p_booking_id AND status = 'pending';
  INSERT INTO public.payments (booking_id, user_id, amount, provider, status, reference, mode)
  VALUES (p_booking_id, v_user, v_b.total_price, p_provider, 'pending', '', p_mode)
  RETURNING id INTO v_id;
  RETURN json_build_object('paymentId', v_id, 'amount', v_b.total_price);
END $$;
REVOKE EXECUTE ON FUNCTION public.start_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_payment(uuid, text, text) TO authenticated;

-- Server only: record the gateway authority token for a pending payment.
CREATE OR REPLACE FUNCTION public.attach_payment_authority(p_payment_id uuid, p_authority text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.payments SET authority = p_authority, updated_at = now()
   WHERE id = p_payment_id AND status = 'pending';
$$;
REVOKE EXECUTE ON FUNCTION public.attach_payment_authority(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_payment_authority(uuid, text) TO service_role;

-- Step 2 (server only, after the gateway VERIFY call): settle the payment. Idempotent.
CREATE OR REPLACE FUNCTION public.finalize_payment(p_payment_id uuid, p_outcome text, p_gateway_ref text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p public.payments%ROWTYPE; v_b public.bookings%ROWTYPE; v_item record; v_code text;
BEGIN
  IF p_outcome NOT IN ('success','failed','cancelled') THEN RAISE EXCEPTION 'invalid outcome'; END IF;
  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_p.status <> 'pending' THEN
    RETURN json_build_object('paymentId', v_p.id, 'status', v_p.status, 'reference', v_p.reference, 'mode', v_p.mode);
  END IF;
  SELECT * INTO v_b FROM public.bookings WHERE id = v_p.booking_id FOR UPDATE;

  UPDATE public.payments
     SET status = p_outcome, gateway_ref = p_gateway_ref,
         reference = COALESCE(NULLIF(p_gateway_ref, ''), reference),
         verified_at = now(), updated_at = now()
   WHERE id = v_p.id;

  IF p_outcome = 'success' THEN
    IF v_b.status <> 'awaiting_payment' THEN
      -- Money was taken but the booking is no longer payable (expired/cancelled): flag for manual refund.
      UPDATE public.payments SET needs_refund = true WHERE id = v_p.id;
      INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
      VALUES (NULL, 'payment_orphaned', 'payments', v_p.id,
              jsonb_build_object('booking_id', v_b.id, 'booking_status', v_b.status, 'amount', v_p.amount, 'mode', v_p.mode));
      RETURN json_build_object('paymentId', v_p.id, 'status', 'success', 'reference', p_gateway_ref, 'mode', v_p.mode, 'orphaned', true);
    END IF;
    UPDATE public.bookings SET status = 'confirmed' WHERE id = v_b.id;
    FOR v_item IN
      SELECT bi.id AS item_id, s.row_label || s.seat_number::text AS label
      FROM public.booking_items bi JOIN public.show_seats ss ON ss.id = bi.show_seat_id
      JOIN public.seats s ON s.id = ss.seat_id
      WHERE bi.booking_id = v_b.id ORDER BY s.row_label, s.seat_number
    LOOP
      v_code := 'TKT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      INSERT INTO public.tickets (booking_id, booking_item_id, user_id, ticket_code, qr_payload, seat_label, status)
      VALUES (v_b.id, v_item.item_id, v_b.user_id, v_code,
              'CURTAINCALL|' || v_b.id::text || '|' || v_code, v_item.label, 'valid');
    END LOOP;
  ELSIF v_b.status = 'awaiting_payment' THEN
    PERFORM public._release_bookings(ARRAY[v_b.id]);
  END IF;
  RETURN json_build_object('paymentId', v_p.id, 'status', p_outcome, 'reference', p_gateway_ref, 'mode', v_p.mode);
END $$;
REVOKE EXECUTE ON FUNCTION public.finalize_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment(uuid, text, text) TO service_role;

-- The old client-callable RPC let a user declare their own payment outcome. Retired.
REVOKE EXECUTE ON FUNCTION public.process_payment(uuid, text) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.process_payment(uuid, text) IS 'DEPRECATED: replaced by start_payment + server-only finalize_payment';