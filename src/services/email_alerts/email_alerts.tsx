import { ReactNode } from "react";
import { Resend } from "resend";

export type SendNotificationEmailResult =
  | { ok: true }
  | { ok: false; error: string };

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function getSenderAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Acme <onboarding@resend.dev>";
}

export async function sendNotificationEmail(
  subject: string,
  email: string,
  content: ReactNode
): Promise<SendNotificationEmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn("Skipping notification email because RESEND_API_KEY is not configured.");
      return { ok: true };
    }

    const { error } = await resend.emails.send({
      from: getSenderAddress(),
      to: [email],
      subject,
      react: content,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
