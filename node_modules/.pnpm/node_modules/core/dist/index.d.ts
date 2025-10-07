type ProtectiveRule = {
    price_trigger: number;
    protective_price: number;
};
declare function computeLaunchPrice(amazonPrice: number, launchMarginPct?: number): number;
declare function computeSustainPrice(amazonPrice: number, sustainMarginPct?: number, protective?: ProtectiveRule[]): number;

export { computeLaunchPrice, computeSustainPrice };
