import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Segment → Audience mapping (3 audiences, Resend free plan limit)
// aktualnosci + blog  → RESEND_AUDIENCE_AKTUALNOSCI
// b2g                 → RESEND_AUDIENCE_B2G
// b2b + sklep         → RESEND_AUDIENCE_B2B
const SEGMENT_AUDIENCE: Record<string, string> = {
  aktualnosci: "RESEND_AUDIENCE_AKTUALNOSCI",
  blog:        "RESEND_AUDIENCE_AKTUALNOSCI",
  b2g:         "RESEND_AUDIENCE_B2G",
  b2b:         "RESEND_AUDIENCE_B2B",
  sklep:       "RESEND_AUDIENCE_B2B",
};

export async function POST(req: NextRequest) {
  const limit = rateLimit(`newsletter:${getClientIp(req)}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zbyt wiele prób. Spróbuj ponownie później." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — newsletter signup skipped");
    return NextResponse.json({ ok: true });
  }
  const resend = new Resend(apiKey);

  try {
    const { email, segments: rawSegments }: { email: string; segments?: string[] } = await req.json();

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Nieprawidłowy adres email" }, { status: 400 });
    }

    // Only known segment keys make it into audiences and the confirmation email
    const segments = (rawSegments ?? ["aktualnosci"]).filter((s) => s in SEGMENT_AUDIENCE);

    // Resolve unique audience IDs for the selected segments
    const audienceEnvKeys = new Set(segments.map((s) => SEGMENT_AUDIENCE[s]));

    if (audienceEnvKeys.size === 0) {
      return NextResponse.json({ error: "No valid segments" }, { status: 400 });
    }

    const audienceIds = [...audienceEnvKeys]
      .map((key) => process.env[key])
      .filter((id): id is string => Boolean(id));

    if (audienceIds.length === 0) {
      console.warn("Audience IDs not configured in env");
      return NextResponse.json({ ok: true });
    }

    // Add contact to each relevant audience
    await Promise.all(
      audienceIds.map((audienceId) =>
        resend.contacts.create({ audienceId, email, unsubscribed: false })
          .catch((err) => console.error(`Failed to add to audience ${audienceId}:`, err))
      )
    );

    // Send confirmation email (non-fatal)
    const from = process.env.RESEND_FROM_EMAIL ?? "newsletter@hydra-arms.com";
    const mono = `'Courier New', Courier, monospace`;
    const green = `#13ff15`;
    const dim = `rgba(19,255,21,0.45)`;
    const bg = `#060806`;
    const border = `rgba(19,255,21,0.18)`;
    const segList = segments.length
      ? segments.map((s) => s.toUpperCase()).join(",&nbsp; ")
      : "AKTUALNOŚCI";

    const confirmHtml = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid ${border};background:${bg};">

      <!-- Title bar -->
      <tr>
        <td style="padding:10px 20px;border-bottom:1px solid ${border};background:rgba(19,255,21,0.03);">
          <span style="color:${dim};font-size:10px;font-family:${mono};letter-spacing:0.15em;text-transform:uppercase;">
            &#9679; &#9679; &#9679;&nbsp;&nbsp;&nbsp;hydra-arms@terminal:~/newsletter — KANAŁ INFORMACYJNY v1.0
          </span>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:36px 28px;">

        <!-- Boot lines -->
        <p style="margin:0 0 20px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.3);line-height:1.9;letter-spacing:0.04em;">
          Inicjalizacja subskrypcji... <span style="color:${dim}">OK</span><br>
          Weryfikacja adresu... <span style="color:${dim}">POTWIERDZONO</span><br>
          Dodawanie do kanału informacyjnego...&nbsp;<span style="color:${green};font-weight:bold;">ZAPIS AKTYWNY</span>
        </p>

        <!-- Divider -->
        <p style="margin:0 0 20px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        <!-- Logo -->
        <p style="margin:0 0 28px;font-family:${mono};font-size:26px;font-weight:bold;color:#fff;letter-spacing:0.2em;">
          HYDRA<span style="color:${green};">.</span>ARMS
        </p>

        <p style="margin:0 0 8px;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">$ hydra --status-subskrypcji</p>

        <!-- Status block -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid ${border};background:rgba(19,255,21,0.02);margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;width:110px;padding:4px 0;vertical-align:top;">STATUS</td>
                  <td style="font-family:${mono};font-size:12px;color:${green};letter-spacing:0.06em;padding:4px 0;">&#9646; AKTYWNY</td>
                </tr>
                <tr>
                  <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;padding:4px 0;vertical-align:top;">EMAIL</td>
                  <td style="font-family:${mono};font-size:12px;color:#e8ffe8;padding:4px 0;">${escapeHtml(email)}</td>
                </tr>
                <tr>
                  <td style="font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;padding:4px 0;vertical-align:top;">SEGMENTY</td>
                  <td style="font-family:${mono};font-size:12px;color:${green};padding:4px 0;letter-spacing:0.06em;">${segList}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 24px;font-family:${mono};font-size:12px;color:rgba(19,255,21,0.5);line-height:1.8;letter-spacing:0.03em;">
          Będziesz otrzymywać powiadomienia z wybranych sekcji kanału informacyjnego HYDRA ARMS — aktualności z sektora obronnego, materiały B2G i B2B oraz informacje o sklepie.
        </p>

        <!-- Divider -->
        <p style="margin:0 0 12px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        <p style="margin:0;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.25);line-height:1.8;letter-spacing:0.04em;">
          // Aby zrezygnować z subskrypcji odpowiedz na ten email<br>
          // z tytułem &ldquo;REZYGNACJA&rdquo;<br>
          // HYDRA ARMS SP. Z O.O. &mdash; ul. Cechowa 44B, 30-614 Kraków
        </p>

      </td></tr>

      <!-- Footer bar -->
      <tr>
        <td style="padding:12px 28px;border-top:1px solid ${border};">
          <span style="font-family:${mono};font-size:10px;color:rgba(19,255,21,0.2);letter-spacing:0.12em;text-transform:uppercase;">
            HYDRA<span style="color:${dim};">.</span>ARMS &mdash; KANAŁ INFORMACYJNY
          </span>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await resend.emails.send({
      from,
      to: email,
      subject: "[ HYDRA ARMS // NEWSLETTER ] Zapis potwierdzony",
      html: confirmHtml,
    }).catch(() => { /* confirmation email is non-fatal */ });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Newsletter route error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
