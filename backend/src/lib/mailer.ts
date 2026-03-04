import nodemailer from 'nodemailer'

const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER)

export const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    })
  : null

const FROM = process.env.SMTP_FROM ?? 'CRM <noreply@crm.local>'

export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[MAIL] ${subject} → ${to}\n${html.replace(/<[^>]+>/g, '')}`)
    return
  }
  await transporter.sendMail({ from: FROM, to, subject, html })
}
