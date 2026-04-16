import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.infomaniak.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { coachName, clientEmail, inviteLink } = await req.json()

  if (!clientEmail || !inviteLink) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[invite-client] No SMTP credentials, skipping email to', clientEmail)
    return NextResponse.json({ success: true, method: 'skipped' })
  }

  try {
    await transporter.sendMail({
      from: '"MoovX" <noreply@moovx.ch>',
      to: clientEmail,
      subject: `${coachName || 'Ton coach'} t'invite sur MoovX`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 32px;background:#0D0B08;color:#F5EDD8;border-radius:16px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#D4A843;font-size:28px;letter-spacing:4px;margin:0;font-weight:700;">MOOVX</h1>
            <p style="color:#8A8070;font-size:12px;letter-spacing:2px;margin:4px 0 0;text-transform:uppercase;">Coaching Fitness · Genève</p>
          </div>
          <div style="background:#141209;border:1px solid rgba(212,168,67,0.2);border-radius:12px;padding:24px;margin-bottom:24px;">
            <p style="font-size:17px;line-height:1.6;margin:0 0 16px;color:#F5EDD8;">
              <strong style="color:#D4A843;">${coachName || 'Ton coach'}</strong> t'invite à rejoindre MoovX pour ton coaching personnalisé.
            </p>
            <p style="font-size:14px;line-height:1.6;color:#8A8070;margin:0;">
              Programme d'entraînement sur mesure, plan nutrition IA, suivi de progression et bien plus.
            </p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${inviteLink}" style="display:inline-block;padding:16px 40px;background:#D4A843;color:#0D0B08;font-weight:700;text-decoration:none;border-radius:12px;font-size:16px;letter-spacing:1px;">
              Rejoindre MoovX
            </a>
          </div>
          <p style="font-size:12px;color:#3A3528;text-align:center;margin:0;">
            100% Swiss Made · Genève, Suisse
          </p>
        </div>
      `,
    })

    console.log('[invite-client] Email sent to', clientEmail)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[invite-client] SMTP error:', error.message, error.code, error.response)
    return NextResponse.json({
      error: error.message,
      code: error.code,
      hint: 'Vérifie SMTP_USER et SMTP_PASS dans Vercel env vars',
    }, { status: 500 })
  }
}
