# Frontend - Sistema de Seguimiento a la Mejora Continua (FES Acatlán)

Interfaz web desarrollada con Next.js (App Router), TypeScript y Tailwind CSS.

## Ejecución rápida en VS Code

1. Abrir una terminal dentro de la carpeta `frontend/`.
2. Instalar dependencias (solo la primera vez):
   npm install
3. Iniciar el servidor integrado de desarrollo:
   npm run dev
4. Abrir en el navegador: `http://localhost:3000`.

## Compartir vista previa con el equipo desde VS Code

Para mostrar el sistema en tiempo real sin configurar servidores web externos:
1. Abrir la pestaña **Puertos** en el panel inferior de VS Code.
2. Reenviar el puerto `3000`.
3. Cambiar la visibilidad del puerto a **Pública** y compartir la URL generada.

## Despliegue en servidor de producción (FES Acatlán)

1. Crear el archivo `.env.local` tomando como base `.env.example` y asignar la dirección real de la API en `NEXT_PUBLIC_API_URL`.
2. Compilar e iniciar en modo producción:
   npm run build
   npm run start
