import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seguimiento a la Mejora Continua | FES Acatlán',
  description: 'Plataforma institucional de la Unidad de Planeación - UNAM FES Acatlán',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#F1F5F9] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
