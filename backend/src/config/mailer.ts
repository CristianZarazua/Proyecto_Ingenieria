import nodemailer from 'nodemailer';

export async function enviarCorreoOtp(destinatario: string, codigo: string): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP debe estar configurado para enviar códigos OTP en producción.');
    }
    console.log(`[OTP LOCAL] Código para ${destinatario}: ${codigo}`);
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
    subject: 'Código de acceso - Seguimiento a la Mejora Continua (FES Acatlán)',
    text: `Su código de verificación es: ${codigo}. Expira en 10 minutos.`,
  });
  return true;
}
