# marketplace-fee-data

Seller fees for ten online marketplaces, as a plain JSON file, plus a zero-dependency helper for
the three questions everyone actually asks: *what does the platform take, what do I keep, and what
do I have to charge to keep $X?*

No dependencies. No build step. The JSON is usable on its own — `data/fees.json` is the product;
`index.js` is a convenience.

## Install

Not on npm yet. Install from the repo:

```bash
npm install github:jelonman/marketplace-fee-data
```

Or just take the file — the JSON is the whole point and it stands alone:

```bash
curl -O https://raw.githubusercontent.com/jelonman/marketplace-fee-data/main/data/fees.json
```

## Use

```js
const { feeOn, breakdown, priceForNet, getPlatform } = require("marketplace-fee-data");

feeOn("etsy", 30);
// 3.3   — 9.5% of $30 plus the $0.45 fixed

breakdown("depop", { salePrice: 40, shippingCharged: 5, cost: 12 });
// { gross: 45, fee: 1.94, costBasis: 12, net: 31.06, marginPct: 69.02 }

priceForNet("poshmark", 18, 25);
// 53.75 — list at this and you clear $25 after Poshmark's 20% and your $18 cost

getPlatform("mercari").notes;
// "Mercari reintroduced a seller fee in January 2025: a flat 10% of the item price..."
```

A platform that is not in the dataset still works — pass the model directly:

```js
feeOn({ percent: 8.5, fixed: 0.35 }, 120); // 10.55
```

## The data

| [Vinted](https://www.vinted.com/help/79-what-are-the-fees) | `vinted` | 0.0% | Vinted charges sellers $0 — buyers pay the protection fee | [calculator](https://vinted-fee-calculator-tan.vercel.app) |
| [Depop](https://depophelp.zendesk.com/hc/en-gb/articles/360001019508-Depop-fees) | `depop` | 3.3% + $0.45 | 3.3% payment processing + $0.45 fixed per sale | [calculator](https://depop-fee-calculator-gules.vercel.app) |
| [Whatnot](https://help.whatnot.com/hc/en-us/articles/4405219819419-Seller-Fees) | `whatnot` | 10.9% + $0.30 | 8.0% seller fee + 2.9% payment processing + $0.30 fixed | [calculator](https://whatnot-fee-calculator-pink.vercel.app) |
| [Patreon](https://support.patreon.com/hc/en-us/articles/204606315-Patreon-s-fees) | `patreon` | 12.9% + $0.30 | 10% platform fee (new creators, Aug 2025+) + 2.9% + $0.30 | [calculator](https://patreon-fee-calculator-blush.vercel.app) |
| [Gumroad](https://help.gumroad.com/article/66-gumroads-fees) | `gumroad` | 12.9% + $0.30 | 10.0% seller fee + 2.9% payment processing + $0.30 fixed | [calculator](https://gumroad-fee-calculator.vercel.app) |
| [DoorDash](https://help.doordash.com/merchants/s/article/what-are-the-fees) | `doordash` | 0.0% | No cut taken from what DoorDash pays you — your costs are gas/vehicle | [calculator](https://doordash-earnings-calculator.vercel.app) |
| [Etsy](https://www.etsy.com/legal/fees/) | `etsy` | 9.5% + $0.45 | 6.5% transaction + 3% + $0.25 processing + $0.20 listing fee | [calculator](https://etsy-fee-calculator-chi.vercel.app) |
| [eBay](https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees) | `ebay` | 13.6% + $0.40 | 13.6% final value fee + $0.40 per order |  |
| [Poshmark](https://support.poshmark.com/s/article/What-are-the-selling-fees) | `poshmark` | 20.0% | 20% on sales of $15+ — a flat $2.95 below that |  |
| [Mercari](https://www.mercari.com/help_center/article/803/) | `mercari` | 10.0% | Flat 10% of the item price — no separate processing fee |  |

Percentages apply to the gross (item plus any shipping you charge the buyer), which is how every
one of these platforms actually bills. Each entry carries a `notes` field with the caveats that
break naive math — Poshmark's flat $2.95 under $15, eBay's category variance and the 2.35% band
above $7,500, Patreon's legacy plans, Etsy's Offsite Ads.

## Why this exists

Every "what will I clear on this?" tool re-hardcodes the same numbers, and they rot. Depop dropped
its 10% seller fee in 2024. Mercari brought one back in January 2025. Patreon changed platform fees
for creators onboarded from August 2025. Nobody is maintaining a shared, machine-readable copy, so
everybody maintains a private, stale one.

This is that shared copy. Each row links to the platform's own fee page so you can check it rather
than trust it.

## Accuracy and scope

These are the common default seller cases in USD. Category, country, subscription tier and legacy
plans all change them, and platforms change them without notice. **Check the linked source before
you price anything on these numbers.** If a rate here is wrong, open an issue with a link to the
platform's fee page and it gets fixed — that is the entire point of the repo.

## Tests

```bash
npm test
```

Nine tests, no framework. The interesting one is the round-trip: for every platform in the dataset
it computes `priceForNet`, then runs that price back through `breakdown` and asserts the seller
really does clear the target. That catches an inverted fee formula, which a "fee > 0" assertion
never will.

## Licence

MIT. The fee figures are facts about public pricing pages; use them however you like.
