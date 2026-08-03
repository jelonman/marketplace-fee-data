/**
 * marketplace-fee-data — seller fee models for online marketplaces, as plain JSON.
 * Zero dependencies. Works in Node and in the browser.
 */
const dataset = require("./data/fees.json");

/** The whole dataset: { version, updated, currency, disclaimer, platforms[] } */
const fees = dataset;

/** Array of platform fee models. */
const platforms = dataset.platforms;

/** Look up one platform by id, e.g. getPlatform("etsy"). Returns undefined if unknown. */
function getPlatform(id) {
  if (typeof id !== "string") return undefined;
  const key = id.trim().toLowerCase();
  return platforms.find((p) => p.id === key);
}

/**
 * What the platform keeps on a sale.
 * @param {string|{percent:number,fixed:number}} platform  platform id, or a custom {percent, fixed}
 * @param {number} amount  the amount the fee applies to (item + any shipping you charge)
 * @returns {number} the fee, rounded to cents
 */
function feeOn(platform, amount) {
  const model = typeof platform === "string" ? getPlatform(platform) : platform;
  if (!model) throw new Error(`Unknown platform: ${platform}`);
  const gross = Math.max(0, Number(amount) || 0);
  const fee = (gross * (model.percent || 0)) / 100 + (model.fixed || 0);
  return Math.round(fee * 100) / 100;
}

/**
 * Full breakdown of one sale.
 * @returns {{gross:number, fee:number, costBasis:number, net:number, marginPct:number}}
 */
function breakdown(platform, { salePrice = 0, shippingCharged = 0, cost = 0, shipCost = 0, otherCost = 0 } = {}) {
  const gross = round2(Math.max(0, salePrice) + Math.max(0, shippingCharged));
  const fee = feeOn(platform, gross);
  const costBasis = round2(Math.max(0, cost) + Math.max(0, shipCost) + Math.max(0, otherCost));
  const net = round2(gross - fee - costBasis);
  return { gross, fee, costBasis, net, marginPct: gross > 0 ? round2((net / gross) * 100) : 0 };
}

/**
 * What to charge so that, after fees, you keep `targetNet` on top of `costBasis`.
 * @returns {number} the price to list at, rounded up to cents
 */
function priceForNet(platform, costBasis, targetNet) {
  const model = typeof platform === "string" ? getPlatform(platform) : platform;
  if (!model) throw new Error(`Unknown platform: ${platform}`);
  const denom = 1 - (model.percent || 0) / 100;
  if (denom <= 0) return Infinity;
  return Math.ceil(((Number(targetNet) + Number(costBasis) + (model.fixed || 0)) / denom) * 100) / 100;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { fees, platforms, getPlatform, feeOn, breakdown, priceForNet };
