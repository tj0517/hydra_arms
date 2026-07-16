import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "formularz@hydra-arms.com";
const TO_DEFAULT = "office@hydra-arms.com";

const DEPT_EMAILS: Record<string, string> = {
  "R&D":   process.env.EMAIL_RD     ?? "office@hydra-arms.com",
  "B2G":   process.env.EMAIL_B2G    ?? "office@hydra-arms.com",
  "HANDEL": process.env.EMAIL_HANDEL ?? "office@hydra-arms.com",
  "BIURO": process.env.EMAIL_BIURO  ?? "office@hydra-arms.com",
};

export async function POST(req: NextRequest) {
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

    const to = dept ? (DEPT_EMAILS[dept] ?? TO_DEFAULT) : TO_DEFAULT;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#1a1a1a">
        <h2 style="color:#0a0a0a;border-bottom:2px solid #13ff15;padding-bottom:8px">
          Nowe zgłoszenie kontaktowe — HYDRA ARMS
        </h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#555;width:120px">Imię i nazwisko</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:6px 0;color:#555">Telefon</td><td style="padding:6px 0">${phone}</td></tr>` : ""}
          ${dept ? `<tr><td style="padding:6px 0;color:#555">Dział</td><td style="padding:6px 0">${dept}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#555">Temat</td><td style="padding:6px 0;font-weight:600">${subject}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/>
        <p style="white-space:pre-wrap;line-height:1.7">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        ${segments?.length ? `
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/>
          <p style="color:#555;font-size:12px">Newsletter: ${segments.join(", ")}</p>
        ` : ""}
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: email,
      subject: `[Formularz] ${subject}`,
      html,
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
