#!/usr/bin/env node
import { registerFido, webauthnPath } from "./fido.mjs";

const cred = await registerFido();
console.log({
  ok: true,
  saved: webauthnPath,
  credentialID: cred.credentialID,
});
process.exit(0);
