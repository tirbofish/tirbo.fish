## blogs.tirbo.fish

Static Markdown blog deployed to Cloudflare Workers Static Assets. Reads are public; local writes require a FIDO touch or OpenPGP signature.

### Develop

```sh
npm install
npm run dev
```

### Publish with FIDO

Register once, then publish a draft:

```sh
npm run register-fido
npm run publish-post -- ./drafts/hello.md
npm run deploy
```

The publish command writes the signed post and its assets into `public/posts`; deployment remains a separate reviewable step.

### Publish with OpenPGP

Set `OWNER_PUBLIC_KEY_FILE` and `PRIVATE_KEY_FILE` as shown in `.env.example`, then:

```sh
npm run publish-post -- ./drafts/hello.md --pgp
npm run deploy
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
