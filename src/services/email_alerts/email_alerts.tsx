import { ReactNode } from "react";
import { Resend } from "resend";

const resend = new Resend("re_9cfZ87DX_QCyfPr2h2uhLUp8awZZtP4nk");

export async function sendNotificationEmail(Subject : string, Email : string, Content : ReactNode) {
   try {
    //console.log(Email);
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
