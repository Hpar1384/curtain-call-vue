const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianNumber(value: number | string): string {
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)]!);
}

export function formatPrice(toman: number): string {
  return toPersianNumber(toman.toLocaleString("en-US"));
}
