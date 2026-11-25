import nodemailer from 'nodemailer';

export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function enviarCorreo(destinatario: string, asunto: string, texto: string): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!smtpConfigurado()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP debe estar configurado para enviar correos en producción.');
    }
    console.log(`[CORREO LOCAL] No enviado a ${destinatario}: ${asunto}`);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: destinatario,
    subject: asunto,
    text: texto,
  });
  return true;
}

export async function enviarCorreoOtp(destinatario: string, codigo: string): Promise<boolean> {
  return enviarCorreo(
    destinatario,
    'Código de acceso - Seguimiento a la Mejora Continua (FES Acatlán)',
    `Su código de verificación es: ${codigo}. Expira en 10 minutos.`
  );
}
