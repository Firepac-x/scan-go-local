# QRLocal Worker

Endpoints:
- GET /api/claim?session_id=...   # Stripe verifies, returns activation code
- GET /api/dev/newcode?key=ADMIN_KEY
- POST /api/validate {code}
- POST /api/page/save {code, slug?, data}
- GET /api/page/get?slug=...

Deploy:
1) npm i -g wrangler && wrangler login
2) wrangler kv:namespace create ACTIVATION
3) wrangler kv:namespace create PAGES
4) Put IDs in wrangler.toml
5) wrangler secret put STRIPE_SECRET_KEY
6) (optional) wrangler secret put ADMIN_KEY
7) wrangler deploy
