'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiSistema } from '@/servicios/apiSistema';

export default function InicioPage() {
  const router = useRouter();

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (sesion) {
      router.replace('/tablero');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B2545] text-sm text-slate-200">
      Verificando credenciales institucionales...
    </div>
  );
}
