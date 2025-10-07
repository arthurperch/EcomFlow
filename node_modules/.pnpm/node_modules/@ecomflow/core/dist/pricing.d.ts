export type ProtectiveRule = {
    price_trigger: number;
    protective_price: number;
};
export declare function computeLaunchPrice(amazonPrice: number, launchMarginPct?: number): number;
export declare function computeSustainPrice(amazonPrice: number, sustainMarginPct?: number, protective?: ProtectiveRule[]): number;
//# sourceMappingURL=pricing.d.ts.map