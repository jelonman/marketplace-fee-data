export interface PlatformFee {
  id: string;
  name: string;
  kind: "resale" | "creator" | "gig" | string;
  /** Percentage fee taken from the gross amount, e.g. 9.5 for 9.5%. */
  percent: number;
  /** Fixed per-order fee in the dataset currency. */
  fixed: number;
  summary: string;
  notes: string;
  source?: string;
  calculator?: string;
}

export interface FeeDataset {
  version: string;
  updated: string;
  currency: string;
  disclaimer: string;
  platforms: PlatformFee[];
}

export interface SaleInput {
  salePrice?: number;
  shippingCharged?: number;
  cost?: number;
  shipCost?: number;
  otherCost?: number;
}

export interface Breakdown {
  gross: number;
  fee: number;
  costBasis: number;
  net: number;
  marginPct: number;
}

export declare const fees: FeeDataset;
export declare const platforms: PlatformFee[];
export declare function getPlatform(id: string): PlatformFee | undefined;
export declare function feeOn(platform: string | Pick<PlatformFee, "percent" | "fixed">, amount: number): number;
export declare function breakdown(platform: string | Pick<PlatformFee, "percent" | "fixed">, input: SaleInput): Breakdown;
export declare function priceForNet(platform: string | Pick<PlatformFee, "percent" | "fixed">, costBasis: number, targetNet: number): number;
