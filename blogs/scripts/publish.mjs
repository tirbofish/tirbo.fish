#!/usr/bin/env node
/**
 * Publish a markdown post. Prefer FIDO (PicoKey) if keys/webauthn.json exists;
 * otherwise OpenPGP (file key or USE_GPG=1).
 *
 * Local (default): writes into blogs/public/posts after verifying.
 * Remote: set BLOGS_PUBLISH_URL=https://blogs.tirbo.fish/api/publish
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, unlink, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as openpgp from "openpgp";
import { canonicalize, parseFrontmatter } from "../shared/canon.mjs";
import { assertFido, loadWebAuthnCred } from "./fido.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicPosts = path.join(root, "public", "posts");

async function resolveExisting(filePath) {
  const fromCwd = path.resolve(filePath);
  try {
    await access(fromCwd);
    return fromCwd;
  } catch {
    /* try blogs/ root */
  }
  const fromBlogs = path.resolve(root, filePath);
  try {
    await access(fromBlogs);
    return fromBlogs;
  } catch {
    throw new Error(`file not found: ${filePath}`);
  }
}

function usage() {
  console.error(`usage:
  npm run publish-post -- <file.md> [--delete]
  npm run publish-post -- --delete <slug>
  npm run register-fido
`);
  process.exit(1);
}

async function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function guessContentType(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    }[ext] || "application/octet-stream"
  );
}

async function collectAssets(markdown, mdDir) {
  const assets = [];
  const re = /!\[[^\]]*\]\((?!https?:|\/|data:)([^)]+)\)/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(markdown))) {
    const rel = m[1].replace(/^\.\//, "");
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.resolve(mdDir, rel);
    const buf = await readFile(abs);
    assets.push({
      path: rel.replace(/\\/g, "/"),
      contentType: guessContentType(abs),
      sha256: await sha256Hex(buf),
      dataBase64: buf.toString("base64"),
    });
  }
  return assets;
}

async function signPgp(canonical) {
  if (process.env.USE_GPG === "1") {
    const result = spawnSync(
      "gpg",
      ["--detach-sign", "--armor", "--output", "-", "--"],
      {
        input: canonical,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    if (result.status !== 0) {
      throw new Error(result.stderr || "gpg failed");
    }
    return result.stdout;
  }

  const keyFile = await resolveExisting(
    process.env.PRIVATE_KEY_FILE || "keys/private.asc",
  );
  const armoredKey = await readFile(keyFile, "utf8");
  const privateKey = await openpgp
    .decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey }),
      passphrase: process.env.PRIVATE_KEY_PASSPHRASE || "",
    })
    .catch(async () => openpgp.readPrivateKey({ armoredKey }));

  const message = await openpgp.createMessage({ text: canonical });
  return openpgp.sign({
    message,
    signingKeys: privateKey,
    detached: true,
  });
}

async function verifyPgp(canonical, signature) {
  const pubFile = await resolveExisting(
    process.env.OWNER_PUBLIC_KEY_FILE || "keys/public.asc",
  );
  const publicKey = await openpgp.readKey({
    armoredKey: await readFile(pubFile, "utf8"),
  });
  const message = await openpgp.createMessage({ text: canonical });
  const sig = await openpgp.readSignature({ armoredSignature: signature });
  const result = await openpgp.verify({
    message,
    signature: sig,
    verificationKeys: publicKey,
  });
  await result.signatures[0].verified;
}

async function writeLocal(data) {
  const dir = path.join(publicPosts, data.slug);
  if (data.action === "delete") {
    try {
      await unlink(path.join(dir, "post.md"));
    } catch {
      /* missing */
    }
  } else {
    await mkdir(dir, { recursive: true });
    for (const asset of data.assets || []) {
      const dest = path.join(dir, asset.path);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(asset.dataBase64, "base64"));
    }
    const md = `---\ntitle: ${JSON.stringify(data.title)}\nslug: ${data.slug}\npublishedAt: ${data.publishedAt}\n---\n\n${data.markdown}`;
    await writeFile(path.join(dir, "post.md"), md, "utf8");
  }

  const indexPath = path.join(publicPosts, "index.json");
  let index = [];
  try {
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    index = [];
  }
  if (data.action === "delete") {
    index = index.filter((p) => p.slug !== data.slug);
  } else {
    const entry = {
      slug: data.slug,
      title: data.title,
      publishedAt: data.publishedAt,
      summary: data.summary || "",
    };
    index = [entry, ...index.filter((p) => p.slug !== data.slug)];
  }
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  const deleteMode = args.includes("--delete");
  const forcePgp = args.includes("--pgp");
  const positional = args.filter((a) => a !== "--delete" && a !== "--pgp");
  if (positional.length !== 1) usage();

  let data;
  if (deleteMode && !positional[0].endsWith(".md")) {
    data = {
      action: "delete",
      slug: positional[0],
      timestamp: new Date().toISOString(),
    };
  } else {
    const mdPath = await resolveExisting(positional[0]);
    const raw = await readFile(mdPath, "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug;
    if (!slug) throw new Error("frontmatter slug required");
    if (deleteMode) {
      data = {
        action: "delete",
        slug,
        timestamp: new Date().toISOString(),
      };
    } else {
      const assets = await collectAssets(body, path.dirname(mdPath));
      data = {
        action: "upsert",
        slug,
        title: meta.title || slug,
        publishedAt: meta.publishedAt || new Date().toISOString(),
        summary: meta.summary || "",
        timestamp: new Date().toISOString(),
        markdown: body.trimStart(),
        assets,
      };
    }
  }

  const canonical = canonicalize(data);
  const fidoCred = forcePgp ? null : await loadWebAuthnCred();

  let auth;
  if (fidoCred) {
    console.error("Using FIDO key — browser will open for touch…");
    const assertion = await assertFido(canonical);
    auth = { kind: "webauthn", assertion };
  } else {
    const signature = await signPgp(canonical);
    await verifyPgp(canonical, signature);
    auth = { kind: "pgp", signature };
  }

  const url = process.env.BLOGS_PUBLISH_URL;
  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: canonical, ...auth }),
    });
    const out = await res.json();
    if (!res.ok) {
      console.error(out);
      process.exit(1);
    }
    console.log(out);
    return;
  }

  await writeLocal(JSON.parse(canonical));
  console.log({
    ok: true,
    mode: "local",
    auth: auth.kind,
    slug: data.slug,
    action: data.action,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
