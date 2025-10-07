// src/pricing.ts
function computeLaunchPrice(amazonPrice, launchMarginPct = 100) {
  return amazonPrice * (1 + launchMarginPct / 100);
}
function computeSustainPrice(amazonPrice, sustainMarginPct = 100, protective = []) {
  for (const r of protective) {
    if (amazonPrice >= r.price_trigger) return r.protective_price;
  }
  return amazonPrice * (1 + sustainMarginPct / 100);
}
export {
  computeLaunchPrice,
  computeSustainPrice
};
