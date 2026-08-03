const assert = require("assert");
const { fees, platforms, getPlatform, feeOn, breakdown, priceForNet } = require("../index.js");

let run = 0;
function t(name, fn) { fn(); run++; console.log("  ok  " + name); }

t("dataset has the expected shape", () => {
  assert.ok(fees.version && fees.updated && fees.currency);
  assert.ok(Array.isArray(platforms) && platforms.length >= 10);
  for (const p of platforms) {
    assert.ok(p.id && p.name, "id and name required");
    assert.strictEqual(typeof p.percent, "number");
    assert.strictEqual(typeof p.fixed, "number");
    assert.ok(p.percent >= 0 && p.percent <= 100, p.id + " percent out of range");
    assert.ok(p.fixed >= 0, p.id + " fixed out of range");
    assert.ok(p.summary && p.notes, p.id + " needs a summary and notes");
  }
});

t("every platform id is unique", () => {
  const ids = platforms.map((p) => p.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

t("getPlatform is case and whitespace tolerant", () => {
  assert.strictEqual(getPlatform(" Etsy ").id, "etsy");
  assert.strictEqual(getPlatform("nope"), undefined);
});

t("Etsy: $30 sale costs 9.5% + $0.45", () => {
  // 30 * 0.095 = 2.85, + 0.45 = 3.30
  assert.strictEqual(feeOn("etsy", 30), 3.3);
});

t("Vinted takes nothing from the seller", () => {
  assert.strictEqual(feeOn("vinted", 100), 0);
});

t("breakdown nets out cost basis", () => {
  const b = breakdown("depop", { salePrice: 40, shippingCharged: 5, cost: 12 });
  assert.strictEqual(b.gross, 45);
  assert.strictEqual(b.fee, 1.94); // 45 * 0.033 = 1.485 + 0.45 = 1.935 -> 1.94
  assert.strictEqual(b.costBasis, 12);
  assert.strictEqual(b.net, 31.06);
});

t("priceForNet round-trips: charging that price really leaves the target", () => {
  for (const p of platforms) {
    const price = priceForNet(p.id, 10, 20);
    if (!isFinite(price)) continue;
    const b = breakdown(p.id, { salePrice: price, cost: 10 });
    assert.ok(b.net >= 20 - 0.02, `${p.id}: netted ${b.net} at price ${price}`);
  }
});

t("a custom fee model works without being in the dataset", () => {
  assert.strictEqual(feeOn({ percent: 10, fixed: 1 }, 100), 11);
});

t("unknown platform throws instead of silently returning 0", () => {
  assert.throws(() => feeOn("not-a-marketplace", 10), /Unknown platform/);
});

console.log(`\n${run} tests passed`);
