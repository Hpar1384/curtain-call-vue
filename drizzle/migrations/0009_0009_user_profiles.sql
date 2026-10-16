CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text,
  refund_account_holder text NOT NULL DEFAULT '',
  refund_iban text,
  refund_card_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_first_name_len CHECK (char_length(first_name) <= 60),
  CONSTRAINT profiles_last_name_len CHECK (char_length(last_name) <= 60),
  CONSTRAINT profiles_holder_len CHECK (char_length(refund_account_holder) <= 120),
  CONSTRAINT profiles_phone_fmt CHECK (phone IS NULL OR phone ~ '^09[0-9]{9}$'),
  CONSTRAINT profiles_iban_fmt CHECK (refund_iban IS NULL OR refund_iban ~ '^IR[0-9]{24}$'),
  CONSTRAINT profiles_card_fmt CHECK (refund_card_number IS NULL OR refund_card_number ~ '^[0-9]{16}$')
);
CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles(phone) WHERE phone IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.profiles (id) SELECT id FROM auth.users ON CONFLICT (id) DO NOTHING;