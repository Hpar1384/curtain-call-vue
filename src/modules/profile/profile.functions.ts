import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfileDTO = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  refundHolder: string;
  refundIban: string;
  refundCard: string;
};

export type ProfileInput = Omit<ProfileDTO, "email">;

const toEnDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[\s-]/g, "");

function validate(input: ProfileInput): ProfileInput {
  const firstName = input.firstName.trim().slice(0, 60);
  const lastName = input.lastName.trim().slice(0, 60);
  const refundHolder = input.refundHolder.trim().slice(0, 120);
  const phone = toEnDigits(input.phone);
  const refundIban = toEnDigits(input.refundIban).toUpperCase();
  const refundCard = toEnDigits(input.refundCard);
  if (phone && !/^09\d{9}$/.test(phone)) throw new Error("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
  if (refundIban && !/^IR\d{24}$/.test(refundIban)) throw new Error("شماره شبا باید با IR و ۲۴ رقم باشد.");
  if (refundCard && !/^\d{16}$/.test(refundCard)) throw new Error("شماره کارت باید ۱۶ رقم باشد.");
  return { firstName, lastName, phone, refundHolder, refundIban, refundCard };
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileDTO> => {
    const { supabase, userId, claims } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error("دریافت پروفایل ناموفق بود");
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : "";
    return {
      firstName: data?.first_name ?? "",
      lastName: data?.last_name ?? "",
      phone: data?.phone ?? "",
      email,
      refundHolder: data?.refund_account_holder ?? "",
      refundIban: data?.refund_iban ?? "",
      refundCard: data?.refund_card_number ?? "",
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProfileInput) => validate(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      refund_account_holder: data.refundHolder,
      refund_iban: data.refundIban || null,
      refund_card_number: data.refundCard || null,
    });
    if (error) {
      if (error.code === "23505") throw new Error("این شماره موبایل قبلاً برای حساب دیگری ثبت شده است.");
      throw new Error("ذخیرهٔ پروفایل ناموفق بود");
    }
    return { ok: true };
  });
