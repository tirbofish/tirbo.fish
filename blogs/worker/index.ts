import { AwsClient } from "aws4fetch";
import * as openpgp from "openpgp";
import { canonicalize } from "../shared/canon.mjs";

/**
 * @typedef {{
 *   OWNER_PUBLIC_KEY: string
 *   S3_ENDPOINT: string
 *   S3_REGION?: string
 *   S3_BUCKET: string
 *   S3_ACCESS_KEY_ID: string
 *   S3_SECRET_ACCESS_KEY: string
 *   S3_PUBLIC_BASE_URL?: string
 *   MAX_SKEW_MS?: string
 * }} Env
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function s3(env) {
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION || "us-east-1",
    service: "s3",
  });
}

function objectUrl(env, key) {
  const base = env.S3_ENDPOINT.replace(/\/$/, "");
  return `${base}/${env.S3_BUCKET}/${key}`;
}

async function putObject(env, key, body, contentType) {
  const client = s3(env);
  const res = await client.fetch(objectUrl(env, key), {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-acl": "public-read",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`s3 put ${key}: ${res.status} ${text}`);
  }
}

async function getObjectText(env, key) {
  const client = s3(env);
  const res = await client.fetch(objectUrl(env, key), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`s3 get ${key}: ${res.status}`);
  return res.text();
}

async function deleteObject(env, key) {
  const client = s3(env);
  const res = await client.fetch(objectUrl(env, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`s3 delete ${key}: ${res.status}`);
  }
}

async function verifySignature(env, canonical, signatureArmored) {
  const publicKey = await openpgp.readKey({
    armoredKey: env.OWNER_PUBLIC_KEY,
  });
  const message = await openpgp.createMessage({ text: canonical });
  const signature = await openpgp.readSignature({
    armoredSignature: signatureArmored,
  });
  const result = await openpgp.verify({
    message,
    signature,
    verificationKeys: publicKey,
  });
  const verified = await result.signatures[0]?.verified;
  if (!verified) throw new Error("bad signature");
}

function assertFresh(timestamp, maxSkew) {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) throw new Error("bad timestamp");
  if (Math.abs(Date.now() - t) > maxSkew) throw new Error("stale timestamp");
}

function assertSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("invalid slug");
  }
}

async function sha256Hex(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handlePublish(env, body) {
  const { payload, signature } = body;
  if (!payload || !signature) throw new Error("payload and signature required");

  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  const canonical = canonicalize(data);
  if (typeof payload === "string" && payload !== canonical) {
    throw new Error("payload must be canonical JSON");
  }

  await verifySignature(env, canonical, signature);

  const maxSkew = Number(env.MAX_SKEW_MS || 300_000);
  assertFresh(data.timestamp, maxSkew);
  assertSlug(data.slug);

  if (data.action === "delete") {
    await deleteObject(env, `posts/${data.slug}/post.md`);
    const indexRaw = await getObjectText(env, "posts/index.json");
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    const next = index.filter((p) => p.slug !== data.slug);
    await putObject(
      env,
      "posts/index.json",
      JSON.stringify(next, null, 2),
      "application/json",
    );
    return { ok: true, deleted: data.slug };
  }

  if (data.action !== "upsert") throw new Error("unknown action");

  for (const asset of data.assets || []) {
    const bytes = Uint8Array.from(atob(asset.dataBase64), (c) => c.charCodeAt(0));
    const digest = await sha256Hex(bytes);
    if (digest !== asset.sha256) throw new Error(`hash mismatch: ${asset.path}`);
    if (asset.path.includes("..") || asset.path.startsWith("/")) {
      throw new Error(`bad asset path: ${asset.path}`);
    }
    await putObject(
      env,
      `posts/${data.slug}/${asset.path}`,
      bytes,
      asset.contentType || "application/octet-stream",
    );
  }

  const md = `---\ntitle: ${JSON.stringify(data.title)}\nslug: ${data.slug}\npublishedAt: ${data.publishedAt}\n---\n\n${data.markdown}`;
  await putObject(
    env,
    `posts/${data.slug}/post.md`,
    md,
    "text/markdown; charset=utf-8",
  );

  const indexRaw = await getObjectText(env, "posts/index.json");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  const entry = {
    slug: data.slug,
    title: data.title,
    publishedAt: data.publishedAt,
    summary: data.summary || "",
  };
  const next = [
    entry,
    ...index.filter((p) => p.slug !== data.slug),
  ];
  await putObject(
    env,
    "posts/index.json",
    JSON.stringify(next, null, 2),
    "application/json",
  );

  return { ok: true, slug: data.slug };
}

export default {
  /** @param {Request} request @param {Env} env */
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/health")) {
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname.endsWith("/publish")) {
      try {
        const body = await request.json();
        const result = await handlePublish(env, body);
        return json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "error";
        const status =
          message.includes("signature") || message.includes("stale")
            ? 401
            : 400;
        return json({ ok: false, error: message }, status);
      }
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
