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

// The dataset advertises a $schema. That pointer is a lie unless something checks it, so this
// walks fees.json against data/schema.json. Deliberately hand-rolled: the package promises zero
// dependencies, and pulling in ajv to validate ten rows would break that promise for nothing.
const schema = require("../data/schema.json");

function resolve(node, root) {
  if (!node || !node.$ref) return node;
  const path = node.$ref.replace(/^#\//, "").split("/");
  return path.reduce((acc, key) => acc[key], root);
}

function validate(node, value, root, where) {
  const s = resolve(node, root);
  const at = where || "$";

  if (s.type === "object") {
    assert.ok(value && typeof value === "object" && !Array.isArray(value), `${at}: expected object`);
    for (const key of s.required || []) {
      assert.ok(Object.prototype.hasOwnProperty.call(value, key), `${at}: missing required "${key}"`);
    }
    if (s.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(s.properties[key], `${at}: unexpected property "${key}" not in schema`);
      }
    }
    for (const [key, sub] of Object.entries(s.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validate(sub, value[key], root, `${at}.${key}`);
      }
    }
    return;
  }

  if (s.type === "array") {
    assert.ok(Array.isArray(value), `${at}: expected array`);
    if (s.minItems != null) assert.ok(value.length >= s.minItems, `${at}: needs >= ${s.minItems} items`);
    value.forEach((item, i) => validate(s.items, item, root, `${at}[${i}]`));
    return;
  }

  if (s.type === "string") {
    assert.strictEqual(typeof value, "string", `${at}: expected string`);
    if (s.minLength != null) assert.ok(value.length >= s.minLength, `${at}: shorter than ${s.minLength}`);
    if (s.pattern) assert.ok(new RegExp(s.pattern).test(value), `${at}: "${value}" fails /${s.pattern}/`);
    return;
  }

  if (s.type === "number") {
    assert.strictEqual(typeof value, "number", `${at}: expected number`);
    assert.ok(Number.isFinite(value), `${at}: not finite`);
    if (s.minimum != null) assert.ok(value >= s.minimum, `${at}: below minimum ${s.minimum}`);
    if (s.maximum != null) assert.ok(value <= s.maximum, `${at}: above maximum ${s.maximum}`);
  }
}

t("fees.json validates against the schema it points at", () => {
  validate(schema, fees, schema);
});

t("the schema actually rejects bad data", () => {
  // A validator that never fails is worse than none — prove each rule bites.
  const bad = (mutate) => {
    const copy = JSON.parse(JSON.stringify(fees));
    mutate(copy);
    return () => validate(schema, copy, schema);
  };
  assert.throws(bad((d) => delete d.platforms[0].source), /missing required "source"/);
  assert.throws(bad((d) => (d.platforms[0].percent = 150)), /above maximum/);
  assert.throws(bad((d) => (d.platforms[0].fixed = -1)), /below minimum/);
  assert.throws(bad((d) => (d.platforms[0].id = "Etsy Shop")), /fails/);
  assert.throws(bad((d) => (d.platforms[0].typo = true)), /unexpected property "typo"/);
  assert.throws(bad((d) => (d.currency = "dollars")), /fails/);
});

t("every platform cites an https source", () => {
  for (const p of platforms) {
    assert.ok(/^https:\/\//.test(p.source), `${p.id}: source must be an https URL`);
    if (p.calculator) assert.ok(/^https:\/\//.test(p.calculator), `${p.id}: calculator must be https`);
  }
});

console.log(`\n${run} tests passed`);
