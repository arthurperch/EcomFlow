"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  computeLaunchPrice: () => computeLaunchPrice,
  computeSustainPrice: () => computeSustainPrice
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeLaunchPrice,
  computeSustainPrice
});
