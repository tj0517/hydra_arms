import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — newsletter signup skipped");
    return NextResponse.json({ ok: true });
  }
  const resend = new Resend(apiKey);

  try {
    const { email, segments } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      console.warn("RESEND_AUDIENCE_ID not set — newsletter signup skipped");
      return NextResponse.json({ ok: true });
    }

    const { error } = await resend.contacts.create({
      audienceId,
      email,
      unsubscribed: false,
    });

    if (error) {
      // If contact already exists Resend returns an error — treat as success
      if ((error as { name?: string }).name === "validation_error") {
        return NextResponse.json({ ok: true });
      }
      console.error("Resend contacts error:", error);
      return NextResponse.json({ error: "Zapis nieudany" }, { status: 500 });
    }

    // Optionally send confirmation email
    const from = process.env.RESEND_FROM_EMAIL ?? "newsletter@hydra-arms.com";
    await resend.emails.send({
      from,
      to: email,
      subject: "Potwierdzenie zapisu — HYDRA ARMS",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;color:#1a1a1a">
          <h2 style="color:#0a0a0a;border-bottom:2px solid #13ff15;padding-bottom:8px">
            Zapisano do newslettera
          </h2>
          <p>Dziękujemy za zapis do kanału informacyjnego HYDRA ARMS.</p>
          ${segments?.length ? `<p style="color:#555;font-size:13px">Subskrybowane sekcje: <strong>${segments.join(", ")}</strong></p>` : ""}
          <p style="margin-top:24px;font-size:12px;color:#888">
            Aby zrezygnować z subskrypcji, odpowiedz na tę wiadomość z tytułem "REZYGNACJA".
          </p>
        </div>
      `,
    }).catch(() => { /* confirmation email is non-fatal */ });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Newsletter route error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
