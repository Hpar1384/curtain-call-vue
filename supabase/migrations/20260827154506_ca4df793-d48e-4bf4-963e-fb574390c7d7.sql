-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- write grants for catalog tables (admin-only through RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theaters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.halls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_items TO authenticated;

CREATE POLICY "admins manage theaters" ON public.theaters FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage halls" ON public.halls FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage seats" ON public.seats FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage shows" ON public.shows FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage sessions" ON public.show_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage show seats" ON public.show_seats FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view all bookings" ON public.bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update bookings" ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete bookings" ON public.bookings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view all booking items" ON public.booking_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- auto-create show_seats for a new session
CREATE OR REPLACE FUNCTION public.create_session_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.show_seats (session_id, seat_id, status)
  SELECT NEW.id, s.id, 'available'
  FROM public.seats s
  JOIN public.shows sh ON sh.hall_id = s.hall_id
  WHERE sh.id = NEW.show_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER show_sessions_create_seats
AFTER INSERT ON public.show_sessions
FOR EACH ROW EXECUTE FUNCTION public.create_session_seats();

-- rebuild hall seat layout (admin only)
CREATE OR REPLACE FUNCTION public.regenerate_hall_seats(_hall_id uuid, _rows integer, _seats_per_row integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'دسترسی مجاز نیست';
  END IF;
  IF _rows < 1 OR _rows > 20 OR _seats_per_row < 1 OR _seats_per_row > 30 THEN
    RAISE EXCEPTION 'ابعاد سالن نامعتبر است';
  END IF;

  UPDATE public.halls SET rows_count = _rows, seats_per_row = _seats_per_row WHERE id = _hall_id;

  DELETE FROM public.seats WHERE hall_id = _hall_id;

  INSERT INTO public.seats (hall_id, row_label, seat_number)
  SELECT _hall_id, chr(64 + r), n
  FROM generate_series(1, _rows) r, generate_series(1, _seats_per_row) n;

  INSERT INTO public.show_seats (session_id, seat_id, status)
  SELECT ses.id, s.id, 'available'
  FROM public.show_sessions ses
  JOIN public.shows sh ON sh.id = ses.show_id AND sh.hall_id = _hall_id
  JOIN public.seats s ON s.hall_id = _hall_id;
END;
$$;

-- admin dashboard stats
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'دسترسی مجاز نیست';
  END IF;

  SELECT json_build_object(
    'shows', (SELECT count(*) FROM public.shows),
    'sessions', (SELECT count(*) FROM public.show_sessions),
    'bookings', (SELECT count(*) FROM public.bookings),
    'users', (SELECT count(*) FROM auth.users)
  ) INTO result;

  RETURN result;
END;
$$;