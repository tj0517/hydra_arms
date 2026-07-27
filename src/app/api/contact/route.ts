import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const FROM = process.env.RESEND_FROM_EMAIL ?? "formularz@hydra-arms.com";
const TO_DEFAULT = "office@hydra-arms.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEPT_EMAILS: Record<string, string> = {
  "R&D":    process.env.EMAIL_RD      ?? "office@hydra-arms.com",
  "B2G":    process.env.EMAIL_B2G     ?? "office@hydra-arms.com",
  "HANDEL": process.env.EMAIL_HANDEL  ?? "office@hydra-arms.com",
  "BIURO":  process.env.EMAIL_BIURO   ?? "office@hydra-arms.com",
};

function buildContactEmail(opts: {
  name: string;
  email: string;
  phone?: string;
  dept?: string;
  subject: string;
  message: string;
  segments?: string[];
}) {
  const { name, email, phone, dept, subject, message, segments } = opts;
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const mono = `'Courier New', Courier, monospace`;
  const green = `#13ff15`;
  const dim = `rgba(19,255,21,0.45)`;
  const bg = `#060806`;
  const border = `rgba(19,255,21,0.18)`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:5px 0 5px 0;color:${dim};font-size:12px;font-family:${mono};width:130px;vertical-align:top;letter-spacing:0.08em;">${label}</td>
      <td style="padding:5px 0;color:#e8ffe8;font-size:13px;font-family:${mono};vertical-align:top;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
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
            &#9679; &#9679; &#9679;&nbsp;&nbsp;&nbsp;hydra-arms@terminal:~/kontakt — BEZPIECZNY KANAŁ ŁĄCZNOŚCI v2.4.1
          </span>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:32px 28px;">

        <!-- Boot lines -->
        <p style="margin:0 0 20px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.3);line-height:1.9;letter-spacing:0.04em;">
          HYDRA ARMS — BEZPIECZNY KANAŁ ŁĄCZNOŚCI v2.4.1<br>
          Inicjalizacja szyfrowanego kanału... <span style="color:${dim}">OK</span><br>
          Nowe zgłoszenie przychodzące. Weryfikacja nadawcy...<span style="color:${dim}"> RODO-COMPLIANT</span>
        </p>

        <!-- Divider -->
        <p style="margin:0 0 16px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);letter-spacing:0.1em;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        <!-- Command -->
        <p style="margin:0 0 12px;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">$ cat /var/log/hydra/incoming.conf</p>

        <!-- Data table -->
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
          ${row("NADAWCA", safe(name))}
          ${row("EMAIL", `<a href="mailto:${safe(email)}" style="color:${green};text-decoration:none;">${safe(email)}</a>`)}
          ${phone ? row("TELEFON", safe(phone)) : ""}
          ${dept ? row("DZIAŁ", safe(dept)) : ""}
          ${row("TEMAT", `<strong style="color:#fff;">${safe(subject)}</strong>`)}
        </table>

        <!-- Divider -->
        <p style="margin:0 0 16px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);letter-spacing:0.1em;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>

        <!-- Message -->
        <p style="margin:0 0 12px;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.1em;">$ cat /var/log/hydra/message.txt</p>
        <p style="margin:0 0 24px;font-family:${mono};font-size:13px;color:#c8ffc8;line-height:1.8;white-space:pre-wrap;">${safe(message)}</p>

        ${segments?.length ? `
        <!-- Divider -->
        <p style="margin:0 0 12px;font-family:${mono};font-size:10px;color:rgba(19,255,21,0.15);letter-spacing:0.1em;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</p>
        <p style="margin:0;font-family:${mono};font-size:11px;color:${dim};letter-spacing:0.08em;">
          // NEWSLETTER: <span style="color:${green};">${segments.map(s => safe(s.toUpperCase())).join(", ")}</span>
        </p>
        ` : ""}

      </td></tr>

      <!-- Footer bar -->
      <tr>
        <td style="padding:12px 28px;border-top:1px solid ${border};">
          <span style="font-family:${mono};font-size:10px;color:rgba(19,255,21,0.2);letter-spacing:0.12em;text-transform:uppercase;">
            HYDRA<span style="color:${dim};">.</span>ARMS &mdash; ODPOWIEDZ NA TEN EMAIL ABY SKONTAKTOWAĆ SIĘ Z NADAWCĄ
          </span>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`contact:${getClientIp(req)}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zbyt wiele wiadomości. Spróbuj ponownie później." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }
  const resend = new Resend(apiKey);

  try {
    const { name, email, phone, dept, subject, message, segments } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const to = dept ? (DEPT_EMAILS[dept] ?? TO_DEFAULT) : TO_DEFAULT;

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: email,
      subject: `[ HYDRA ARMS // FORMULARZ ] ${subject}`,
      html: buildContactEmail({ name, email, phone, dept, subject, message, segments }),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Wysyłka nieudana" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
