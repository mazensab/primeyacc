/* ============================================================
   📂 whatsapp_session_gateway/src/server.mjs
   💬 PrimeyAcc — Persistent WhatsApp Session Gateway
   ------------------------------------------------------------
   ✅ Express gateway for Django system WhatsApp APIs
   ✅ Persistent Baileys auth storage
   ✅ QR + Pairing Code
   ✅ Reconnects from saved auth files after restart
   ✅ Disconnect endpoint logs out and removes the saved session
============================================================ */
import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import QRCode from "qrcode";
import * as baileys from "@whiskeysockets/baileys";
const makeWASocket = baileys.default || baileys.makeWASocket;
const {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = baileys;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gatewayRoot = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || "127.0.0.1";
const TOKEN = String(process.env.WHATSAPP_SESSION_GATEWAY_TOKEN || "").trim();
const STORAGE_ROOT = path.resolve(
  gatewayRoot,
  process.env.WHATSAPP_SESSION_STORAGE_DIR || "./storage/sessions",
);
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});
const app = express();
const sessions = new Map();
app.use(cors({ origin: false }));
app.use(express.json({ limit: "2mb" }));
function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}
function sanitizeSessionName(value) {
  const text = safeText(value, "primeyacc-system-session");
  return text.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "primeyacc-system-session";
}
function sessionDir(sessionName) {
  return path.join(STORAGE_ROOT, sanitizeSessionName(sessionName));
}
function credsPath(sessionName) {
  return path.join(sessionDir(sessionName), "creds.json");
}
function hasSavedAuth(sessionName) {
  return fs.existsSync(credsPath(sessionName));
}
function nowIso() {
  return new Date().toISOString();
}
function normalizePhone(value) {
  const raw = safeText(value);
  const beforeAt = raw.split("@")[0] || raw;
  const beforeDevice = beforeAt.split(":")[0] || beforeAt;
  return beforeDevice.replace(/[^\d]/g, "");
}
function jidFromPhone(value) {
  const digits = normalizePhone(value);
  if (!digits) return "";
  return `${digits}@s.whatsapp.net`;
}
function normalizeWhatsAppSendResult(result) {
  return {
    external_message_id: result?.key?.id || "",
    message_id: result?.key?.id || "",
    remote_jid: result?.key?.remoteJid || "",
    from_me: Boolean(result?.key?.fromMe),
    timestamp: result?.messageTimestamp || "",
  };
}
async function resolveRecipientJid(sock, toPhone) {
  const cleanPhone = normalizePhone(toPhone);
  const fallbackJid = jidFromPhone(cleanPhone);
  if (!cleanPhone || !fallbackJid) {
    return {
      exists: false,
      jid: "",
      phone: cleanPhone,
      reason: "Invalid recipient phone.",
    };
  }
  if (typeof sock?.onWhatsApp !== "function") {
    return {
      exists: true,
      jid: fallbackJid,
      phone: cleanPhone,
      reason: "",
      unchecked: true,
    };
  }
  const candidates = [cleanPhone, fallbackJid];
  for (const candidate of candidates) {
    try {
      const lookup = await sock.onWhatsApp(candidate);
      const rows = Array.isArray(lookup) ? lookup : [];
      const found = rows.find((item) => item?.exists);
      if (found?.jid) {
        return {
          exists: true,
          jid: found.jid,
          phone: cleanPhone,
          reason: "",
          lookup,
        };
      }
    } catch (error) {
      logger.warn({ error: String(error), candidate }, "Recipient WhatsApp lookup failed");
    }
  }
  return {
    exists: false,
    jid: fallbackJid,
    phone: cleanPhone,
    reason: "Recipient phone is not registered on WhatsApp or lookup failed.",
  };
}
function getSession(sessionName) {
  const name = sanitizeSessionName(sessionName);
  if (!sessions.has(name)) {
    sessions.set(name, {
      session_name: name,
      status: hasSavedAuth(name) ? "reconnecting" : "disconnected",
      connected: false,
      connected_phone: "",
      device_label: "PrimeyAcc WhatsApp Gateway",
      qr: "",
      qr_code: "",
      pairing_code: "",
      error_message: "",
      last_update_at: nowIso(),
      manual_disconnect: false,
      sock: null,
      starting: null,
    });
  }
  return sessions.get(name);
}
function publicState(state, extra = {}) {
  return {
    success: extra.success ?? true,
    message: extra.message ?? "OK",
    provider_status: extra.provider_status || "ok",
    gateway_configured: true,
    session_name: state.session_name,
    session_status: state.status,
    status: state.status,
    connected: Boolean(state.connected),
    connected_phone: state.connected_phone || "",
    phone_number: state.connected_phone || "",
    device_label: state.device_label || "PrimeyAcc WhatsApp Gateway",
    browser: state.device_label || "PrimeyAcc WhatsApp Gateway",
    qr: state.qr || "",
    qr_code: state.qr_code || "",
    qrDataUrl: state.qr_code || "",
    pairing_code: state.pairing_code || "",
    pairingCode: state.pairing_code || "",
    error_message: extra.error_message ?? state.error_message ?? "",
    last_update_at: state.last_update_at,
    ...extra,
  };
}
function requireGatewayToken(req, res, next) {
  if (!TOKEN) {
    next();
    return;
  }
  const header = safeText(req.headers.authorization);
  if (header === `Bearer ${TOKEN}`) {
    next();
    return;
  }
  res.status(401).json({
    success: false,
    message: "Unauthorized gateway request.",
    error_message: "Unauthorized gateway request.",
    session_status: "failed",
    connected: false,
    gateway_configured: true,
  });
}
app.use((req, res, next) => {
  if (req.path === "/health") {
    next();
    return;
  }
  requireGatewayToken(req, res, next);
});
function extractDisconnectCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode || 0;
}
async function ensureSocket(sessionName, options = {}) {
  const state = getSession(sessionName);
  if (state.connected && state.sock && !options.force) {
    return state;
  }
  if (state.starting) {
    return state.starting;
  }
  state.starting = startSocket(state, options).finally(() => {
    state.starting = null;
  });
  return state.starting;
}
async function startSocket(state, options = {}) {
  const dir = sessionDir(state.session_name);
  await fsp.mkdir(dir, { recursive: true });
  state.manual_disconnect = false;
  state.error_message = "";
  state.status = state.status === "connected" ? "connected" : "connecting";
  state.last_update_at = nowIso();
  const { state: authState, saveCreds } = await useMultiFileAuthState(dir);
  let versionPayload = {};
  try {
    versionPayload = await fetchLatestBaileysVersion();
  } catch (error) {
    logger.warn({ error: String(error) }, "Could not fetch latest Baileys version, using library default");
  }
  const socketOptions = {
    auth: authState,
    logger,
    browser: Browsers?.ubuntu ? Browsers.ubuntu("PrimeyAcc") : ["PrimeyAcc", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    printQRInTerminal: false,
  };
  if (Array.isArray(versionPayload.version)) {
    socketOptions.version = versionPayload.version;
  }
  const sock = makeWASocket(socketOptions);
  state.sock = sock;
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      state.qr = qr;
      state.qr_code = await QRCode.toDataURL(qr);
      state.pairing_code = "";
      state.status = "qr_pending";
      state.connected = false;
      state.last_update_at = nowIso();
    }
    if (connection === "open") {
      state.status = "connected";
      state.connected = true;
      state.qr = "";
      state.qr_code = "";
      state.pairing_code = "";
      state.error_message = "";
      state.connected_phone = normalizePhone(sock.user?.id || sock.user?.jid || "");
      state.device_label = sock.user?.name || sock.user?.verifiedName || "PrimeyAcc WhatsApp Gateway";
      state.last_update_at = nowIso();
      logger.info({ session: state.session_name }, "WhatsApp session connected");
    }
    if (connection === "close") {
      const statusCode = extractDisconnectCode(lastDisconnect);
      const loggedOut = statusCode === DisconnectReason?.loggedOut;
      state.connected = false;
      state.sock = null;
      state.last_update_at = nowIso();
      if (state.manual_disconnect || loggedOut) {
        state.status = "disconnected";
        state.qr = "";
        state.qr_code = "";
        state.pairing_code = "";
        logger.warn({ session: state.session_name }, "WhatsApp session logged out");
        return;
      }
      state.status = "reconnecting";
      state.error_message = safeText(lastDisconnect?.error?.message, "Connection closed; reconnecting.");
      logger.warn({ session: state.session_name, statusCode }, "WhatsApp connection closed; reconnecting");
      setTimeout(() => {
        void ensureSocket(state.session_name).catch((error) => {
          state.status = "failed";
          state.error_message = String(error?.message || error);
          state.last_update_at = nowIso();
          logger.error({ error }, "WhatsApp reconnect failed");
        });
      }, 3500);
    }
  });
  if (options.pairingPhone) {
    const phone = normalizePhone(options.pairingPhone);
    if (phone) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const code = await sock.requestPairingCode(phone);
        state.pairing_code = safeText(code);
        state.qr = "";
        state.qr_code = "";
        state.status = state.connected ? "connected" : "pair_pending";
        state.last_update_at = nowIso();
      } catch (error) {
        state.status = "failed";
        state.error_message = String(error?.message || error);
        state.last_update_at = nowIso();
      }
    }
  }
  return state;
}
async function waitForState(state, predicate, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return state;
}
async function removeSessionFiles(sessionName) {
  await fsp.rm(sessionDir(sessionName), { recursive: true, force: true });
}
async function warmStartSavedSessions() {
  await fsp.mkdir(STORAGE_ROOT, { recursive: true });
  const entries = await fsp.readdir(STORAGE_ROOT, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = sanitizeSessionName(entry.name);
    if (!hasSavedAuth(name)) continue;
    void ensureSocket(name).catch((error) => {
      const state = getSession(name);
      state.status = "failed";
      state.error_message = String(error?.message || error);
      state.last_update_at = nowIso();
      logger.error({ session: name, error }, "Warm start failed");
    });
  }
}
app.get("/health", async (_req, res) => {
  res.json({
    success: true,
    message: "PrimeyAcc WhatsApp Session Gateway is running.",
    gateway_configured: true,
    storage_root: STORAGE_ROOT,
    sessions: Array.from(sessions.values()).map((state) => publicState(state)),
  });
});
app.post("/session/status", async (req, res) => {
  const sessionName = req.body?.session_name;
  const state = getSession(sessionName);
  if (!state.sock && hasSavedAuth(state.session_name)) {
    await ensureSocket(state.session_name);
    await waitForState(state, (item) => ["connected", "qr_pending", "failed", "reconnecting"].includes(item.status), 8000);
  }
  res.json(publicState(state, { message: "Session status loaded." }));
});
app.post("/session/create-qr", async (req, res) => {
  const sessionName = req.body?.session_name;
  const state = await ensureSocket(sessionName, { force: true });
  await waitForState(state, (item) => Boolean(item.qr_code || item.connected || item.error_message), 20000);
  res.json(publicState(state, {
    message: state.connected ? "Session already connected." : "QR requested.",
  }));
});
app.post("/session/create-pairing-code", async (req, res) => {
  const sessionName = req.body?.session_name;
  const phoneNumber = req.body?.phone_number;
  const state = await ensureSocket(sessionName, {
    force: true,
    pairingPhone: phoneNumber,
  });
  await waitForState(state, (item) => Boolean(item.pairing_code || item.connected || item.error_message), 20000);
  res.json(publicState(state, {
    message: state.connected ? "Session already connected." : "Pairing code requested.",
  }));
});
app.post("/session/disconnect", async (req, res) => {
  const state = getSession(req.body?.session_name);
  state.manual_disconnect = true;
  try {
    if (state.sock) {
      await state.sock.logout().catch(() => {});
      try {
        state.sock.end?.();
      } catch {
        // ignore
      }
    }
  } finally {
    await removeSessionFiles(state.session_name);
    state.sock = null;
    state.connected = false;
    state.connected_phone = "";
    state.status = "disconnected";
    state.qr = "";
    state.qr_code = "";
    state.pairing_code = "";
    state.error_message = "";
    state.last_update_at = nowIso();
  }
  res.json(publicState(state, { message: "Session disconnected and saved auth files removed." }));
});
app.post("/messages/send-text", async (req, res) => {
  const state = getSession(req.body?.session_name);
  const toPhone = normalizePhone(req.body?.to_phone || req.body?.phone_number || req.body?.to);
  const body = safeText(req.body?.body || req.body?.message || req.body?.text, "PrimeyAcc system WhatsApp test message.");
  if (!toPhone) {
    res.json(publicState(state, {
      success: false,
      message: "Recipient phone is required.",
      error_message: "Recipient phone is required.",
    }));
    return;
  }
  if (!state.sock && hasSavedAuth(state.session_name)) {
    await ensureSocket(state.session_name);
    await waitForState(state, (item) => item.connected || item.error_message, 12000);
  }
  if (!state.connected || !state.sock) {
    res.json(publicState(state, {
      success: false,
      message: "WhatsApp session is not connected.",
      error_message: "WhatsApp session is not connected.",
    }));
    return;
  }
  const recipient = await resolveRecipientJid(state.sock, toPhone);
  if (!recipient.exists || !recipient.jid) {
    res.json(publicState(state, {
      success: false,
      provider_status: "recipient_not_on_whatsapp",
      message: recipient.reason || "Recipient phone is not available on WhatsApp.",
      error_message: recipient.reason || "Recipient phone is not available on WhatsApp.",
      to_phone: recipient.phone || toPhone,
      recipient_jid: recipient.jid || "",
    }));
    return;
  }
  const result = await state.sock.sendMessage(recipient.jid, { text: body });
  const normalizedResult = normalizeWhatsAppSendResult(result);
  res.json(publicState(state, {
    success: true,
    provider_status: "sent_to_whatsapp_server",
    message: "Message accepted by WhatsApp server.",
    ...normalizedResult,
    to_phone: recipient.phone,
    recipient_jid: recipient.jid,
  }));
});
app.use((error, _req, res, _next) => {
  logger.error({ error }, "Unhandled gateway error");
  res.status(500).json({
    success: false,
    message: String(error?.message || error),
    error_message: String(error?.message || error),
    session_status: "failed",
    connected: false,
    gateway_configured: true,
  });
});
await fsp.mkdir(STORAGE_ROOT, { recursive: true });
await warmStartSavedSessions();
app.listen(PORT, HOST, () => {
  logger.info(
    {
      host: HOST,
      port: PORT,
      storage_root: STORAGE_ROOT,
      token_enabled: Boolean(TOKEN),
    },
    "PrimeyAcc WhatsApp Session Gateway started",
  );
});
