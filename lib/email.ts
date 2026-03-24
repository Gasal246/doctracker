import nodemailer from "nodemailer";

import { getEnv } from "@/lib/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: getEnv("SMTP_HOST"),
    port: Number(getEnv("SMTP_PORT")),
    secure: getEnv("SMTP_SECURE") === "true",
    auth: {
      user: getEnv("SMTP_USER"),
      pass: getEnv("SMTP_PASS"),
    },
  });

  return transporter;
}

export async function sendReminderEmail({
  companyEmail,
  companyName,
  documentName,
  expiryDate,
  reminderAt,
}: {
  companyEmail: string;
  companyName: string;
  documentName: string;
  expiryDate: string;
  reminderAt: string;
}) {
  const fromName = getEnv("SMTP_FROM_NAME");
  const fromEmail = getEnv("SMTP_FROM_EMAIL");

  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: companyEmail,
    subject: `Reminder: ${documentName} is due soon`,
    text: [
      `Hello ${companyName || "there"},`,
      "",
      `This is a reminder for the document "${documentName}".`,
      `Reminder time: ${reminderAt}`,
      `Expiry date: ${expiryDate}`,
      "",
      "Please review and renew it if needed.",
      "",
      "Doc Tracker",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #221f1c; line-height: 1.6;">
        <p>Hello ${companyName || "there"},</p>
        <p>This is a reminder for the document <strong>${documentName}</strong>.</p>
        <p><strong>Reminder time:</strong> ${reminderAt}<br /><strong>Expiry date:</strong> ${expiryDate}</p>
        <p>Please review and renew it if needed.</p>
        <p>Doc Tracker</p>
      </div>
    `,
  });
}
