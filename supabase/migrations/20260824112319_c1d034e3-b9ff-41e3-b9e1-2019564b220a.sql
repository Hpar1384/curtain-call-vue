-- 1. bookings: add owner + status constraint
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS user_id uuid;

DELETE FROM public.booking_items;
DELETE FROM public.bookings;

ALTER TABLE public.bookings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending','confirmed','cancelled'));

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings(user_id);

-- 2. hard guarantee: one booking item per show seat
ALTER TABLE public.booking_items
  ADD CONSTRAINT booking_items_show_seat_unique UNIQUE (show_seat_id);

-- 3. policies
DROP POLICY IF EXISTS "anyone can create a booking" ON public.bookings;
DROP POLICY IF EXISTS "anyone can create booking items" ON public.booking_items;

CREATE POLICY "users can view their own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users can view their own booking items"
  ON public.booking_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_items.booking_id AND b.user_id = auth.uid()
  ));

GRANT SELECT ON public.bookings TO authenticated;
GRANT SELECT ON public.booking_items TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.booking_items TO service_role;

-- 4. atomic booking creation
CREATE OR REPLACE FUNCTION public.create_booking(
  p_slug text,
  p_session_id uuid,
  p_seat_labels text[]
)
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

  SELECT id, price INTO v_show_id, v_price
  FROM public.shows WHERE slug = p_slug;
  IF v_show_id IS NULL THEN
    RAISE EXCEPTION 'نمایش یافت نشد';
  END IF;

  -- lock the requested seats for this session
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
  VALUES (v_show_id, p_session_id, v_user, v_count, v_total, 'confirmed')
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, show_seat_id, unit_price)
  SELECT v_booking_id, id, unit_price FROM _picked;

  UPDATE public.show_seats SET status = 'reserved'
  WHERE id IN (SELECT id FROM _picked);

  RETURN v_booking_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'بعضی از صندلی‌های انتخابی همین حالا رزرو شدند';
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(text, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(text, uuid, text[]) TO authenticated;