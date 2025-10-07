export type ProtectiveRule = { price_trigger: number; protective_price: number };

export function computeLaunchPrice(amazonPrice: number, launchMarginPct = 100) {
  return amazonPrice * (1 + launchMarginPct / 100);
}

export function computeSustainPrice(
  amazonPrice: number,
  sustainMarginPct = 100,
  protective: ProtectiveRule[] = []
) {
  for (const r of protective) {
    if (amazonPrice >= r.price_trigger) return r.protective_price;
  }
  return amazonPrice * (1 + sustainMarginPct / 100);
}
