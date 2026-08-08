## blogs.tirbo.fish

Personal markdown blog. Reads are public. Writes require a FIDO touch (PicoKey) or an OpenPGP signature; the CLI/API verifies against your registered credential / public key.

### Layout

- `src/` — reader site (cream/cocoa, JetBrains Mono, Markdown + KaTeX)
- `public/posts/` — local/dev content (`index.json` + `<slug>/post.md` + assets)
- `scripts/publish.mjs` — sign + publish
- `worker/` — Cloudflare Worker write API → DigitalOcean Spaces (S3)

### Dev reader

```bash
cd blogs
npm install
npm run dev
```

Open http://localhost:5174/

### Publish with FIDO (PicoKey)

Windows sees the key as a FIDO device. One-time register (browser opens; touch the key):

```bash
npm run register-fido
```

That saves `blogs/keys/webauthn.json`. After that, publish uses FIDO automatically:

```bash
npm run publish-post -- ./drafts/hello.md
```

A browser tab opens on `http://localhost:8765` — touch the key to sign. The challenge is `SHA-256` of the post payload, so the assertion is bound to that exact publish.

OpenPGP file keys still work if you pass `--pgp` or delete `keys/webauthn.json`.

### Publish with OpenPGP (file / gpg)

1. Export your keypair (or generate one for testing):

```bash
mkdir -p keys
gpg --armor --export YOUR_KEY_ID > keys/public.asc
gpg --armor --export-secret-keys YOUR_KEY_ID > keys/private.asc
```

2. Set env (or copy `.env.example`):

```bash
set OWNER_PUBLIC_KEY_FILE=./keys/public.asc
set PRIVATE_KEY_FILE=./keys/private.asc
```

On Unix: `export ...`. Or `USE_GPG=1` to sign with the gpg agent instead of a key file.

3. Write a draft with frontmatter (`drafts/hello.md`), then:

```bash
npm run publish-post -- ./drafts/hello.md --pgp
```

### Remote publish (Spaces + Worker)

1. Create a DO Spaces bucket (public read on `posts/`).
2. Deploy the worker:

```bash
npx wrangler secret put OWNER_WEBAUTHN_JSON  # paste contents of keys/webauthn.json
npx wrangler secret put OWNER_PUBLIC_KEY    # optional, if still using PGP
npx wrangler secret put S3_ACCESS_KEY_ID
npx wrangler secret put S3_SECRET_ACCESS_KEY
```

Set in `wrangler.toml` `[vars]` or dashboard: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`. Optional: `WEBAUTHN_ORIGIN=http://localhost:8765`.

```bash
npm run worker:deploy
```

3. DNS: `blogs.tirbo.fish` → static reader (DO App Platform). Route `/api/*` to the Worker in Cloudflare (or use the workers.dev URL as `BLOGS_PUBLISH_URL`).

4. Reader build with content base:

```bash
set VITE_CONTENT_BASE=https://your-bucket.region.cdn.digitaloceanspaces.com
npm run build
```

5. Publish remotely:

```bash
set BLOGS_PUBLISH_URL=https://blogs.tirbo.fish/api/publish
npm run publish-post -- ./drafts/hello.md
```

### Draft frontmatter

```yaml
---
title: my post
slug: my-post
publishedAt: 2026-08-08T00:00:00.000Z
summary: one line
---
```

Relative images in the markdown (`![alt](assets/x.png)`) are read from disk next to the draft, hashed, included in the signed payload, and stored under `posts/<slug>/`.
