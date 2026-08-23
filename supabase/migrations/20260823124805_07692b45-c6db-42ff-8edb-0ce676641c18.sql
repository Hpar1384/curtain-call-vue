
-- THEATERS
CREATE TABLE public.theaters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT 'تهران',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theaters TO anon;
GRANT SELECT ON public.theaters TO authenticated;
GRANT ALL ON public.theaters TO service_role;
ALTER TABLE public.theaters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theaters are public" ON public.theaters FOR SELECT USING (true);

-- HALLS
CREATE TABLE public.halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theater_id uuid NOT NULL REFERENCES public.theaters(id) ON DELETE CASCADE,
  name text NOT NULL,
  rows_count int NOT NULL DEFAULT 8,
  seats_per_row int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.halls TO anon;
GRANT SELECT ON public.halls TO authenticated;
GRANT ALL ON public.halls TO service_role;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "halls are public" ON public.halls FOR SELECT USING (true);

-- SEATS
CREATE TABLE public.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES public.halls(id) ON DELETE CASCADE,
  row_label text NOT NULL,
  seat_number int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hall_id, row_label, seat_number)
);
GRANT SELECT ON public.seats TO anon;
GRANT SELECT ON public.seats TO authenticated;
GRANT ALL ON public.seats TO service_role;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seats are public" ON public.seats FOR SELECT USING (true);

-- SHOWS
CREATE TABLE public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES public.halls(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  poster_key text NOT NULL,
  director text,
  genre text,
  duration_minutes int NOT NULL DEFAULT 90,
  age_rating text,
  price int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shows TO anon;
GRANT SELECT ON public.shows TO authenticated;
GRANT ALL ON public.shows TO service_role;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shows are public" ON public.shows FOR SELECT USING (true);

-- SHOW SESSIONS
CREATE TABLE public.show_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  date_label text NOT NULL,
  weekday_label text NOT NULL,
  time_label text NOT NULL,
  starts_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.show_sessions TO anon;
GRANT SELECT ON public.show_sessions TO authenticated;
GRANT ALL ON public.show_sessions TO service_role;
ALTER TABLE public.show_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "show sessions are public" ON public.show_sessions FOR SELECT USING (true);

-- SHOW SEATS
CREATE TABLE public.show_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.show_sessions(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available',
  price int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, seat_id)
);
GRANT SELECT ON public.show_seats TO anon;
GRANT SELECT ON public.show_seats TO authenticated;
GRANT ALL ON public.show_seats TO service_role;
ALTER TABLE public.show_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "show seats are public" ON public.show_seats FOR SELECT USING (true);

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.show_sessions(id) ON DELETE CASCADE,
  guest_name text,
  guest_phone text,
  seat_count int NOT NULL DEFAULT 0,
  total_price int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can create a booking" ON public.bookings FOR INSERT WITH CHECK (true);

-- BOOKING ITEMS
CREATE TABLE public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  show_seat_id uuid NOT NULL REFERENCES public.show_seats(id) ON DELETE CASCADE,
  unit_price int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, show_seat_id)
);
GRANT SELECT, INSERT ON public.booking_items TO anon;
GRANT SELECT, INSERT ON public.booking_items TO authenticated;
GRANT ALL ON public.booking_items TO service_role;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can create booking items" ON public.booking_items FOR INSERT WITH CHECK (true);

-- ============ SEED ============
INSERT INTO public.theaters (id, name, city) VALUES
  ('11111111-1111-1111-1111-111111111111', 'تئاتر شهر', 'تهران'),
  ('11111111-1111-1111-1111-111111111112', 'فرهنگسرا نیاوران', 'تهران'),
  ('11111111-1111-1111-1111-111111111113', 'تالار وحدت', 'تهران');

INSERT INTO public.halls (id, theater_id, name) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'سالن اصلی'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'سالن قشقایی'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111112', 'سالن سایه'),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111113', 'سالن استاد سهراب');

INSERT INTO public.seats (hall_id, row_label, seat_number)
SELECT h.id, r.label, n
FROM public.halls h
CROSS JOIN (VALUES ('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H')) AS r(label)
CROSS JOIN generate_series(1, 10) AS n;

INSERT INTO public.shows (id, hall_id, slug, title, description, poster_key, director, genre, duration_minutes, age_rating, price, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'hamlet', 'هملت', 'اجرایی مدرن از تراژدی جاودانهٔ شکسپیر؛ روایتی از انتقام، جنون و سرنوشت.', 'hamlet', 'داریوش مهرجویی', 'تراژدی', 145, '+۱۵', 350000, 1),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'seller', 'مرگ فروشنده', 'بر اساس نمایشنامهٔ آرتور میلر؛ حکایتی تکان‌دهنده از رؤیاها، خانواده و خیانت.', 'seller', 'علی رفیعی', 'درام', 120, '+۱۲', 280000, 2),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223', 'rhinoceros', 'کرگدن‌ها', 'از نمایشنامهٔ اژن یونسکو؛ طنزی تاریک دربارهٔ هم‌رنگی با جماعت و فروپاشی فردیت.', 'rhinoceros', 'محمدعلی باسطی', 'آبسورد', 100, '+۱۵', 220000, 3),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222224', 'veil', 'پرده‌نشین‌ها', 'روایتی تاریخی از پشت پرده‌های دربار؛ نمایشی پرشور از قدرت، راز و عشق.', 'veil', 'کیومرث پوراحمد', 'تاریخی', 130, '+۱۸', 400000, 4);

INSERT INTO public.show_sessions (id, show_id, date_label, weekday_label, time_label, sort_order) VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333331', '۲۸ مرداد', 'چهارشنبه', '۲۰:۳۰', 1),
  ('44444444-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333331', '۲۹ مرداد', 'پنجشنبه', '۱۸:۰۰', 2),
  ('44444444-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333331', '۲۹ مرداد', 'پنجشنبه', '۲۱:۰۰', 3),
  ('44444444-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333331', '۳۰ مرداد', 'جمعه', '۲۰:۳۰', 4),
  ('44444444-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333332', '۳ شهریور', 'شنبه', '۱۹:۰۰', 1),
  ('44444444-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333332', '۴ شهریور', 'یکشنبه', '۱۹:۰۰', 2),
  ('44444444-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333332', '۵ شهریور', 'دوشنبه', '۲۱:۰۰', 3),
  ('44444444-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', '۱۱ شهریور', 'یکشنبه', '۱۸:۰۰', 1),
  ('44444444-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', '۱۲ شهریور', 'دوشنبه', '۱۸:۰۰', 2),
  ('44444444-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333334', '۱۹ شهریور', 'دوشنبه', '۲۱:۰۰', 1),
  ('44444444-0000-0000-0000-000000000011', '33333333-3333-3333-3333-333333333334', '۲۰ شهریور', 'سه‌شنبه', '۲۱:۰۰', 2),
  ('44444444-0000-0000-0000-000000000012', '33333333-3333-3333-3333-333333333334', '۲۲ شهریور', 'پنجشنبه', '۱۹:۰۰', 3);

INSERT INTO public.show_seats (session_id, seat_id, status, price)
SELECT ss.id,
       s.id,
       CASE
         WHEN sh.slug = 'rhinoceros' THEN 'reserved'
         WHEN (abs(hashtext(ss.id::text || s.id::text)) % 100) < 28 THEN 'reserved'
         ELSE 'available'
       END,
       sh.price
FROM public.show_sessions ss
JOIN public.shows sh ON sh.id = ss.show_id
JOIN public.seats s ON s.hall_id = sh.hall_id;
