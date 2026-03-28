import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendNotificationEmail(Subject : string, Email : string, Content : string) {
   try {
    console.log(Email);
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: [Email],
      subject: Subject,
      html: Content,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}