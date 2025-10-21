QRLocal v4 — Activation + Backend

1) Déployez le Worker (voir /worker/README.md). Notez son URL, ex: https://qrlocal.example.workers.dev
2) Dans studio.html et profile.html, remplacez WORKER_ORIGIN par l’URL du Worker.
3) Publiez une page via le Studio avec un code d’activation (Stripe) ou un code dev.
4) Ouvrez la page publique: profile.html?slug=VOTRE-SLUG
