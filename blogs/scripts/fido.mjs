/**
 * Localhost WebAuthn ceremonies for FIDO security keys (PicoKey, etc.).
 * Opens the system browser; you touch the key when prompted.
 */
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const blogsRoot = path.resolve(__dirname, "..");
export const webauthnPath = path.join(blogsRoot, "keys", "webauthn.json");

export const RP_ID = "localhost";
export const RP_NAME = "tirbo blogs";
export const CEREMONY_PORT = 8765;
export const ORIGIN = `http://localhost:${CEREMONY_PORT}`;

export async function loadWebAuthnCred() {
  try {
    await access(webauthnPath);
    return JSON.parse(await readFile(webauthnPath, "utf8"));
  } catch {
    return null;
  }
}

export async function saveWebAuthnCred(cred) {
  await mkdir(path.dirname(webauthnPath), { recursive: true });
  await writeFile(webauthnPath, JSON.stringify(cred, null, 2) + "\n", "utf8");
}

export function payloadChallenge(canonical) {
  return new Uint8Array(createHash("sha256").update(canonical, "utf8").digest());
}

function openBrowser(url) {
  if (process.platform === "win32") {
    exec(`cmd /c start "" "${url}"`);
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function pageHtml(title, bodyScript) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: ui-monospace, monospace; background:#fff4e6; color:#3c2f2f;
      min-height:100vh; display:grid; place-items:center; margin:0; }
    main { max-width:28rem; padding:2rem; }
    button { font:inherit; background:#3c2f2f; color:#fff4e6; border:0; padding:.7rem 1.1rem;
      cursor:pointer; border-radius:.15em; }
    .ok { color:#4b3832; }
    .err { color:#854442; }
  </style>
</head>
<body>
  <main>
    <p><span style="color:#be9b7b">::</span>&lt;tirbofish&gt; / blogs</p>
    <h1>${title}</h1>
    <p id="status">waiting for security key…</p>
    <p><button type="button" id="go">touch key</button></p>
  </main>
  <script>
  const b64url = {
    fromBuf(buf) {
      const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
      let s = '';
      bytes.forEach((b) => { s += String.fromCharCode(b); });
      return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
    },
    toBuf(s) {
      const pad = '='.repeat((4 - (s.length % 4)) % 4);
      const b64 = (s + pad).replace(/-/g,'+').replace(/_/g,'/');
      const raw = atob(b64);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out.buffer;
    }
  };
  ${bodyScript}
  </script>
</body>
</html>`;
}

function shutdown(server) {
  return new Promise((resolve) => {
    try {
      server.closeAllConnections?.();
    } catch {
      /* ignore */
    }
    server.close(() => resolve());
    // don't hang if close stalls
    setTimeout(resolve, 500).unref?.();
  });
}

function runCeremony({ path: routePath, html, onResult }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = async (fn, value) => {
      if (settled) return;
      settled = true;
      await shutdown(server);
      fn(value);
    };

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || "/", ORIGIN);
        if (req.method === "GET") {
          // serve ceremony page on /, /assert, /register — avoids 404 if a stale tab refreshes
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }
        if (req.method === "POST" && url.pathname === "/result") {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          res.writeHead(200, {
            "Content-Type": "application/json",
            Connection: "close",
          });
          res.end(JSON.stringify({ ok: true }));
          try {
            const out = await onResult(body);
            await finish(resolve, out);
          } catch (err) {
            await finish(reject, err);
          }
          return;
        }
        res.writeHead(404);
        res.end("not found");
      } catch (err) {
        try {
          res.writeHead(500);
          res.end(String(err));
        } catch {
          /* ignore */
        }
        await finish(reject, err);
      }
    });

    server.on("error", async (err) => {
      if (err && err.code === "EADDRINUSE") {
        await finish(
          reject,
          new Error(
            `port ${CEREMONY_PORT} busy — close the other ceremony tab/process and retry`,
          ),
        );
        return;
      }
      await finish(reject, err);
    });

    server.listen(CEREMONY_PORT, "127.0.0.1", () => {
      const url = `${ORIGIN}${routePath}`;
      console.error(`Open ${url} and touch your security key…`);
      // slight delay so the listen socket is fully ready before the browser hits it
      setTimeout(() => openBrowser(url), 150);
    });
  });
}

export async function registerFido() {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: "tirbofish",
    userDisplayName: "tirbofish",
    userID: randomBytes(16),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "discouraged",
      authenticatorAttachment: "cross-platform",
    },
  });

  const html = pageHtml(
    "register fido key",
    `
    const options = ${JSON.stringify(options)};
    async function run() {
      const status = document.getElementById('status');
      try {
        options.challenge = b64url.toBuf(options.challenge);
        options.user.id = b64url.toBuf(options.user.id);
        if (options.excludeCredentials) {
          options.excludeCredentials = options.excludeCredentials.map((c) => ({
            ...c, id: b64url.toBuf(c.id),
          }));
        }
        const cred = await navigator.credentials.create({ publicKey: options });
        const body = {
          id: cred.id,
          rawId: b64url.fromBuf(cred.rawId),
          type: cred.type,
          response: {
            clientDataJSON: b64url.fromBuf(cred.response.clientDataJSON),
            attestationObject: b64url.fromBuf(cred.response.attestationObject),
            transports: cred.response.getTransports?.() || [],
          },
        };
        await fetch('/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        status.className = 'ok';
        status.textContent = 'registered. you can close this tab.';
      } catch (e) {
        status.className = 'err';
        status.textContent = e.message || String(e);
      }
    }
    document.getElementById('go').onclick = run;
    run();
    `,
  );

  return runCeremony({
    path: "/register",
    html,
    onResult: async (body) => {
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: options.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        throw new Error("registration failed");
      }
      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;
      const record = {
        rpID: RP_ID,
        origin: ORIGIN,
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        transports: body.response.transports || [],
        credentialDeviceType,
        credentialBackedUp,
      };
      await saveWebAuthnCred(record);
      return record;
    },
  });
}

export async function assertFido(canonical) {
  const cred = await loadWebAuthnCred();
  if (!cred) {
    throw new Error(
      "no FIDO credential — run: npm run register-fido (from blogs/)",
    );
  }

  const challengeBytes = payloadChallenge(canonical);
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    challenge: challengeBytes,
    allowCredentials: [
      {
        id: cred.credentialID,
        transports: cred.transports,
      },
    ],
    userVerification: "discouraged",
  });

  const html = pageHtml(
    "sign publish",
    `
    const options = ${JSON.stringify(options)};
    async function run() {
      const status = document.getElementById('status');
      try {
        options.challenge = b64url.toBuf(options.challenge);
        if (options.allowCredentials) {
          options.allowCredentials = options.allowCredentials.map((c) => ({
            ...c, id: b64url.toBuf(c.id),
          }));
        }
        const assertion = await navigator.credentials.get({ publicKey: options });
        const body = {
          id: assertion.id,
          rawId: b64url.fromBuf(assertion.rawId),
          type: assertion.type,
          response: {
            clientDataJSON: b64url.fromBuf(assertion.response.clientDataJSON),
            authenticatorData: b64url.fromBuf(assertion.response.authenticatorData),
            signature: b64url.fromBuf(assertion.response.signature),
            userHandle: assertion.response.userHandle
              ? b64url.fromBuf(assertion.response.userHandle)
              : null,
          },
        };
        await fetch('/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        status.className = 'ok';
        status.textContent = 'signed. you can close this tab.';
      } catch (e) {
        status.className = 'err';
        status.textContent = e.message || String(e);
      }
    }
    document.getElementById('go').onclick = run;
    run();
    `,
  );

  return runCeremony({
    path: "/assert",
    html,
    onResult: async (body) => {
      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: options.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        credential: {
          id: cred.credentialID,
          publicKey: Buffer.from(cred.credentialPublicKey, "base64url"),
          counter: cred.counter,
          transports: cred.transports,
        },
      });
      if (!verification.verified) throw new Error("assertion failed");
      cred.counter = verification.authenticationInfo.newCounter;
      await saveWebAuthnCred(cred);
      return body;
    },
  });
}
