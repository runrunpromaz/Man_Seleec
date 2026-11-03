# MAN SELEEC — Sky Escape

Lightweight, English-language, offline-capable PWA aircraft obstacle avoidance game for Microsoft Store.

## Five levels

1. Rookie Sky — FREE
2. Cloud Run — target US price $0.99 — Product ID `manseleec_level2`
3. Storm Rider — target US price $4.99 — Product ID `manseleec_level3`
4. Night Fury — target US price $6.99 — Product ID `manseleec_level4`
5. Ace of Skies — target US price $9.99 — Product ID `manseleec_level5`

## IMPORTANT — Microsoft Store setup BEFORE publishing

1. Create a new free app named **Man Seleec** in Microsoft Partner Center.
2. Under its Add-ons, create **four DURABLE (non-consumable)** add-ons. Each unlocks one level permanently. Do not create developer-managed consumables for these unlocks.
3. Set the exact **Product IDs / InAppOfferTokens** above when creating add-ons, or change the `sku` values in `app.js` to match the IDs actually created. **Store IDs (e.g. 9N...) are not Product IDs.**
4. Set each add-on's price in Partner Center: US $0.99, $4.99, $6.99, $9.99 (if those price tiers are available). **Prices cannot be set by JavaScript**; the game reads the localized real price from `getDetails()`.
5. Publish the add-ons and the app. Add-ons must be available to the app for Microsoft Store Billing to find them.
6. Upload all the files to a GitHub repository, enable GitHub Pages, and package the HTTPS PWA for Microsoft Store (e.g. using PWABuilder). Set the manifest start URL to the deployed GitHub Pages path.
7. Install the published Microsoft Store version on Windows. Open it and test `getDetails`, `listPurchases`, payment popup, ownership restore, and game access. **Do not pay until product IDs and published add-ons are confirmed.**

## Purchase integration (already in app.js)

- `getDigitalGoodsService('https://store.microsoft.com/billing')`
- `getDetails()` to retrieve four published add-ons and regional prices
- `PaymentRequest([{supportedMethods: BILLING, data:{sku:item.itemId}}]).show()` to open the real Microsoft checkout
- `response.complete('success')` after the payment UI returns
- `listPurchases()` to refresh owned levels after checkout and on launch
- `RESTORE PURCHASES` button for users returning on another device or after an interrupted checkout
- **NO `consume()`**: the four levels are durable permanent unlocks, not consumables
- No client-side fake unlock, no direct credit card form, no hard-coded success bypass

## Limits and testing

- Microsoft recommends independently verifying purchase entitlements server-side before granting them. This small PWA uses Microsoft Store's client-side ownership list for convenience; **it is not server-verified or tamper-proof**.
- On ordinary browser/GitHub Pages access, the free level works but Microsoft Billing is unavailable. Paid level purchase requires the Microsoft Store-installed Windows PWA.
- If checkout completes but ownership isn't visible immediately, use RESTORE PURCHASES. Never treat the mere opening/closing of the checkout as proof of ownership.
- Exact US prices are target price points and depend on Partner Center tiers, market and currency.
- For production, test add-on availability and licensing with an authorized Store account. Do not assume that a product being configured means it is published.

## Deployment

Place `index.html`, `app.js`, `style.css`, `manifest.webmanifest`, `icon.svg`, and `sw.js` at the root of your repository. Use GitHub Pages with branch main/root. Do not rename app.js unless updating the HTML reference. For a new release, increment the `CACHE` name in sw.js.

## Controls

Move: mouse, touch, Left/Right arrows, A/D. ESC: pause.
