# Frontend - Sistema de Seguimiento a la Mejora Continua (FES Acatlán)

Interfaz web desarrollada con Next.js (App Router), TypeScript y Tailwind CSS.

## Funciones

- `tablero/planes`: captura y revisión del Plan, borradores privados por creador y descarga de reportes Word/PDF.
- `tablero/informe`: avance por recomendación, observaciones, evidencias PDF o ligas, revisión y descarga del reporte Word/PDF.
- `tablero/administracion`: el Administrador crea cuentas de Jefatura y Planeador individualmente o por lotes de hasta 100 correos, y gestiona licenciaturas, catálogos y ciclos; Planeador gestiona catálogos y ciclos sin acceso a cuentas.
- Planeador consulta todas las licenciaturas y puede validar o devolver Planes e Informes. Jefatura captura y consulta únicamente su licenciatura.
- En producción todas las cuentas requieren OTP enviado por SMTP. En desarrollo, Administrador entra sin OTP para pruebas y las demás cuentas usan un código simulado si SMTP no está configurado. No hay autorregistro público: las cuentas solo las da de alta el Administrador.
- Las cuentas rápidas de prueba aparecen solo en modo de desarrollo. El correo de Planeador requiere existir en la base de datos de pruebas.

La interfaz presenta los nombres completos de las funciones; los identificadores de planificación se mantienen únicamente en la documentación general.

## Ejecución rápida en VS Code

1. Abrir una terminal dentro de la carpeta `frontend/`.
2. Instalar dependencias (solo la primera vez):
   ```bash
   npm install
   ```
3. Iniciar el servidor integrado de desarrollo:
   ```bash
   npm run dev
   ```
4. Abrir en el navegador: `http://localhost:3000`.

## Compartir vista previa con el equipo desde VS Code

Para mostrar el sistema en tiempo real sin configurar servidores web externos:
1. Abrir la pestaña **Puertos** en el panel inferior de VS Code.
2. Reenviar el puerto `3000`.
3. Cambiar la visibilidad del puerto a **Pública** y compartir la URL generada.

## Despliegue en HTTPS

El navegador usa rutas relativas (`/api`) y Next.js las reenvía al backend por
`127.0.0.1:3001`. En producción, el TLS se termina en el proxy inverso y los
servicios Next.js y Express quedan ligados a loopback, sin exponer sus puertos.

1. Configurar `backend/.env` con `HOST=127.0.0.1` y `FRONTEND_URL=https://<dominio>`.
2. Iniciar el backend y Next.js en los puertos locales `3001` y `3000`.
3. Configurar Nginx con `deploy/nginx/orvant.conf.example`, sustituyendo el
   dominio y las rutas de certificado.
4. Abrir únicamente los puertos `80` y `443` hacia Internet.

El certificado TLS debe ser válido y confiable para el dominio. No guardar claves
privadas ni certificados en el repositorio. Para la vista previa de VS Code, el
reenvío del puerto `3000` ya proporciona HTTPS externo; el proxy local sigue
hablando con Express por loopback.

## Despliegue en servidor (FES Acatlán)

1. Crear el archivo `backend/.env` desde `backend/.env.example` y configurar
   credenciales de MariaDB, SMTP, `JWT_SECRET` y `FRONTEND_URL`. No guardar ese
   archivo ni las credenciales en el repositorio.
2. Compilar e iniciar en modo producción:
   ```bash
   npm run build
   npm run start
   ```
