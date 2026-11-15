import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { PORT = 3000, ORGANIZER_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, DRY_RUN } = process.env;
if (!ORGANIZER_PASSWORD) {
  console.error("ORGANIZER_PASSWORD manquant (voir .env.example)");
  process.exit(1);
}
const live = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) && DRY_RUN !== "1";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "public")));

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

// Limite : 60 requêtes / minute / IP (protège aussi contre les essais de mot de passe)
const hits = new Map();
function guard(req, res, next) {
  const now = Date.now();
  const h = (hits.get(req.ip) || []).filter((t) => now - t < 60000);
  h.push(now);
  hits.set(req.ip, h);
  if (h.length > 60) return res.status(429).json({ error: "Trop de requêtes" });
  if (!same(req.get("x-organizer-password") || "", ORGANIZER_PASSWORD)) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  next();
}

// 06 12 34 56 78 -> +33612345678
function toE164(raw) {
  let n = String(raw || "").replace(/[\s.\-()]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (/^0\d{9}$/.test(n)) n = "+33" + n.slice(1);
  return /^\+\d{8,15}$/.test(n) ? n : null;
}

async function sendOne(to, body) {
  if (!live) return;
  const form = new URLSearchParams({ To: to, Body: body });
  if (TWILIO_FROM.startsWith("MG")) form.set("MessagingServiceSid", TWILIO_FROM);
  else form.set("From", TWILIO_FROM);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || `HTTP ${r.status}`);
  }
}

app.get("/api/status", guard, (req, res) => res.json({ live }));

app.post("/api/sms", guard, async (req, res) => {
  const list = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!list.length || list.length > 100) return res.status(400).json({ error: "1 à 100 messages attendus" });
  const failed = [];
  let sent = 0;
  for (let i = 0; i < list.length; i += 5) {
    await Promise.all(
      list.slice(i, i + 5).map(async (m) => {
        const to = toE164(m?.to);
        const body = String(m?.body || "").slice(0, 480);
        if (!to || !body) return failed.push({ to: String(m?.to || ""), error: "numéro ou message invalide" });
        try {
          await sendOne(to, body);
          sent++;
        } catch (e) {
          failed.push({ to: String(m.to), error: e.message });
        }
      })
    );
  }
  // Volontairement : aucun numéro ni texte dans les logs (données de personnes vulnérables)
  console.log(`[sms] ${sent} envoyé(s), ${failed.length} échec(s)${live ? "" : " (mode test)"}`);
  res.json({ sent, failed, dry: !live });
});

app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT} — ${live ? "envoi réel (Twilio)" : "MODE TEST (aucun SMS réel)"}`));
