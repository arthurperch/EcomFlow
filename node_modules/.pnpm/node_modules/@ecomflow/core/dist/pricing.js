"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeLaunchPrice = computeLaunchPrice;
exports.computeSustainPrice = computeSustainPrice;
function computeLaunchPrice(amazonPrice, launchMarginPct = 100) {
    return amazonPrice * (1 + launchMarginPct / 100);
}
function computeSustainPrice(amazonPrice, sustainMarginPct = 100, protective = []) {
    for (const r of protective) {
        if (amazonPrice >= r.price_trigger)
            return r.protective_price;
    }
    return amazonPrice * (1 + sustainMarginPct / 100);
}
//# sourceMappingURL=pricing.js.map