REVOKE ALL ON FUNCTION public.create_session_seats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
REVOKE ALL ON FUNCTION public.regenerate_hall_seats(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_hall_seats(uuid, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.create_booking(text, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(text, uuid, text[]) TO authenticated;