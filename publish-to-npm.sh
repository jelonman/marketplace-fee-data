#!/usr/bin/env bash
# Publish marketplace-fee-data to npm, then (and only then) correct the README.
#
# Prerequisite, and the ONLY thing blocking this today: an npm login on this box.
#   npm adduser --auth-type=web          # existing account
#   or create one first at https://www.npmjs.com/signup
# The registry has DISABLED account creation over the CLI. Verified 2026-08-03:
#   PUT /-/user/org.couchdb.user:jelonman  ->  403
#   {"ok":false,"message":"Account creation via legacy auth is unavailable.
#    Please set your auth-type to \"web\" or visit https://www.npmjs.com/signup"}
#
# Everything else is already verified ready: 9/9 tests pass, the packed tarball
# installs from a clean dir and feeOn('etsy',30) === 3.3.

set -euo pipefail
cd "$(dirname "$0")"

PKG=marketplace-fee-data

echo "==> auth check"
if ! npm whoami >/dev/null 2>&1; then
  echo "NOT LOGGED IN. Run:  npm adduser --auth-type=web" >&2
  echo "(no npm account exists for this owner yet - create at https://www.npmjs.com/signup)" >&2
  exit 1
fi
echo "logged in as: $(npm whoami)"

echo "==> tests"
npm test

echo "==> publish"
npm publish --access public

echo "==> verifying the package is really live"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://registry.npmjs.org/$PKG")
  [ "$code" = "200" ] && break
  echo "   registry not live yet ($code), retry $i"; sleep 6
done
[ "$code" = "200" ] || { echo "registry never returned 200 - NOT touching the README" >&2; exit 1; }
echo "registry: 200"

echo "==> clean-room install from the public registry"
tmp=$(mktemp -d)
( cd "$tmp" && npm init -y >/dev/null 2>&1 && npm install "$PKG" >/dev/null 2>&1 \
  && node -e "const m=require('$PKG'); if(m.feeOn('etsy',30)!==3.3) throw new Error('feeOn wrong: '+m.feeOn('etsy',30)); console.log('clean install OK, feeOn(etsy,30)=',m.feeOn('etsy',30));" )
rm -rf "$tmp"

echo "==> README: it IS on npm now, so say so"
python3 - <<'PY'
import io,sys
p="README.md"
s=io.open(p,encoding="utf-8").read()
old = """Not on npm yet. Install from the repo:

```bash
npm install github:jelonman/marketplace-fee-data
```
"""
new = """```bash
npm install marketplace-fee-data
```

Or straight from the repo:

```bash
npm install github:jelonman/marketplace-fee-data
```
"""
if old not in s:
    if "npm install marketplace-fee-data" in s:
        print("README already updated - nothing to do"); sys.exit(0)
    print("ANCHOR NOT FOUND - update the Install section by hand", file=sys.stderr); sys.exit(1)
io.open(p,"w",encoding="utf-8").write(s.replace(old,new,1))
print("README Install section updated")
PY

git add README.md
git commit -m "README: marketplace-fee-data is on npm now" || echo "(nothing to commit)"
git push || echo "(push failed - do it by hand)"

echo
echo "DONE. https://www.npmjs.com/package/$PKG"
