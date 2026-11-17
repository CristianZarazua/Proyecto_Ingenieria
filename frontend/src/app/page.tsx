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
    <div className="fondo-unam-animado flex min-h-screen items-center justify-center text-sm font-medium text-white">
      Verificando credenciales institucionales...
    </div>
  );
}
