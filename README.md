# Grant's Sails

Seattle sailing experience landing page for Captain Grant — animated sunset canvas hero, Puget Sound & Lake Union experiences, photo gallery with lightbox, reviews, and Airbnb booking links.

**Live site:** https://grants-sails.vercel.app

## Deployment

Auto-deploys on every push to `main` via Vercel Git integration.

### Update the site

```bash
# Make changes to app/page.tsx, then from any directory:
deploy-grants "your commit message here"
```

If no message is provided, defaults to `update: site content`.

### Manual deploy (fallback)

```bash
cd ~/Projects/grants-sails && vercel --prod
```

## Local development

```bash
cd ~/Projects/grants-sails
npm run dev
```

Open http://localhost:3000 to preview. The page is in `app/page.tsx` — all content, styles, and canvas animation are in that single file.

