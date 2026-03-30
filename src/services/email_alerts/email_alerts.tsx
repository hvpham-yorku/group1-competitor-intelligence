import { ReactNode } from "react";
import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

export async function sendNotificationEmail(Subject : string, Email : string, Content : ReactNode) {
   try {
    const resend = getResendClient();
    if (!resend) {
      console.warn("Skipping notification email because RESEND_API_KEY is not configured.");
      return null;
    }

    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: [Email],
      subject: Subject,
      react: Content,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
