const correoInstitucional = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@pcpuma\.acatlan\.unam\.mx$/;

export function normalizarCorreoInstitucional(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const correo = value.trim().toLowerCase();
  return correo.length <= 150 && correoInstitucional.test(correo) ? correo : null;
}
