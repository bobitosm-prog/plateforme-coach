import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { coachName, clientEmail, inviteLink } = await req.json()
  if (!clientEmail || !inviteLink) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('[invite-client] No RESEND_API_KEY, skipping email to', clientEmail)
    return NextResponse.json({ success: true, method: 'skipped' })
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'MoovX <noreply@moovx.ch>',
    to: clientEmail,
    subject: `${coachName || 'Ton coach'} t'invite sur MoovX`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0D0B08;color:#F5EDD8;border-radius:12px;">
        <h1 style="color:#D4A843;font-size:24px;margin:0 0 16px">MoovX</h1>
        <p style="font-size:16px;line-height:1.6">
          <strong>${coachName || 'Ton coach'}</strong> t'invite à rejoindre MoovX pour ton coaching personnalisé.
        </p>
        <a href="${inviteLink}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#D4A843;color:#0D0B08;font-weight:bold;text-decoration:none;border-radius:12px;font-size:16px;">
          Rejoindre MoovX
        </a>
        <p style="font-size:13px;color:#8A8070;margin-top:20px">
          Tu recevras un programme d'entraînement et un plan nutrition personnalisés.
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
