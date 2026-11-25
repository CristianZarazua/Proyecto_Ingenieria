<p align="center">
  <img src="assets/Logotipo_corporativo_Orvant_Technologies.png" alt="Orvant Technologies" width="420" />
</p>

<h1 align="center">Proyecto de Ingeniería de Software</h1>

<p align="center">
  <em>«Innovación que transforma»</em>
</p>

<p align="center">
  <strong>Orvant Technologies</strong><br />
  Repositorio de uso académico
</p>

---

## Sobre el proyecto

Este repositorio corresponde al **Proyecto de Ingeniería de Software** desarrollado por **Orvant Technologies** como parte de la asignatura homónima. Su propósito es **exclusivo** para el alojamiento, las pruebas y el despliegue del proyecto académico.

El contenido aquí presente —código, scripts, documentación y recursos— debe utilizarse de forma **ética y adecuada**, respetando las normas de la institución y la propiedad intelectual de la empresa.

---

## Sobre Orvant Technologies

**Orvant Technologies** es una empresa orientada al desarrollo de soluciones tecnológicas con un enfoque en la innovación aplicada. Su lema, *"Innovación que transforma"*, resume la filosofía con la que aborda cada proyecto: llevar ideas a implementaciones concretas que generen valor real.

Este repositorio forma parte de su línea de formación académica de los integrantes.

---

## Alcance del repositorio

- **Alojamiento** del código fuente del proyecto.
- **Pruebas** y validación de funcionalidades.
- **Despliegue** de versiones para revisión académica.

---

<p align="center">
  <img src="assets/Logotipo_tecnológico_azul_ORVANT.png" alt="Orvant Technologies Official Logo" width="420" />
</p>

### Acceso restringido

Aunque el repositorio es **público**, el acceso y los cambios están limitados a los integrantes del equipo y a los evaluadores autorizados.

---

# Sistema de Seguimiento a la Mejora Continua (FES Acatlán)

Plataforma web desarrollada para la **Unidad de Planeación** y las **Jefaturas de Programa** de la Facultad de Estudios Superiores Acatlán (UNAM). Centraliza la administración de cuentas y catálogos, los ciclos de acreditación y la captura, revisión y consulta de los Planes de Mejora Continua y sus Informes de Seguimiento.

---

## Stack Tecnológico

- **Frontend:** Next.js (App Router), React, TypeScript y Tailwind CSS.
- **Backend:** Node.js, Express, TypeScript, JWT y `mysql2`.
- **Base de Datos:** MariaDB.
- **Servidor / Entorno de Pruebas:** Debian Linux Server + SSH / VS Code Port Forwarding; HTTPS en producción mediante proxy inverso.

---

## Funcionalidades disponibles

- **Acceso institucional y seguridad:** Validación estricta de dominio `@pcpuma.acatlan.unam.mx`, OTP de 6 dígitos por correo en producción para todos los roles, vigencia de 10 minutos y bloqueo automático tras 3 intentos fallidos. En desarrollo, Administrador entra sin OTP para facilitar las pruebas y las demás cuentas reciben un código simulado si no hay SMTP configurado.
- **Gestión de cuentas y roles:** El Administrador da de alta cuentas de `JEFATURA` (`TITULAR` / `AUXILIAR`) y `PLANEADOR`, individualmente o por lotes de hasta 100 correos. No hay autorregistro público ni creación de nuevos Administradores desde esta función. Se conserva el máximo de **2 cuentas activas por licenciatura** y la activación/desactivación sin pérdida de historial. Planeador consulta y revisa globalmente y administra ciclos/catálogos, pero no cuentas.
- **Catálogos y acreditaciones:** Administración de licenciaturas, organismos, categorías, indicadores, áreas responsables y porcentajes; cada ciclo incluye fecha inicial y final de acreditación.
- **Plan de Mejora Continua:** Captura de recomendaciones y acciones, guardado de borradores privados por creador, envío, devolución con observaciones por recomendación y validación administrativa o de Planeador.
- **Informe de Seguimiento:** Captura de porcentaje de avance y observaciones, envío y revisión por recomendación a cargo de Administrador o Planeador.
- **Evidencias:** Carga de archivos PDF validados por contenido (hasta 20 MB) y registro de ligas HTTP/HTTPS; consulta y eliminación con aislamiento por licenciatura.
- **Reportes:** Descarga del Plan y del Informe en Word editable o PDF. Los documentos incluyen el periodo de acreditación y los logotipos institucionales.
- **Control de acceso:** Las Jefaturas consultan únicamente la información de su licenciatura; Planeador consulta globalmente sin administrar usuarios ni editar avances/evidencias; los borradores solo son visibles para su creador.

## Referencia de requisitos

Los siguientes identificadores se conservan únicamente como referencia académica; no se muestran en la interfaz ni se usan como etiquetas funcionales del código.

| Identificador | Función | Estado |
|---|---|---|
| PB-07 | Reporte del Plan de Mejora Continua en Word y PDF | Implementado |
| PB-08 | Estados y validación administrativa del Plan | Implementado |
| PB-09 | Captura del avance y observaciones del Informe | Implementado |
| PB-10 | Evidencias PDF y ligas por recomendación | Implementado |
| PB-11 | Reporte del Informe en Word y PDF | Implementado |
| PB-12 | Revisión y devolución del Informe | Implementado |
| PB-13 | Borradores editables y privados por creador | Implementado |
| PB-14 | Envío parcial o completo con resumen de pendientes | Pendiente |
| PB-15 | Corrección de capturas por el Administrador | Pendiente |
| PB-16 | Recordatorios programados por correo | Pendiente |
| PB-17 | Aviso por correo a Planeación al enviar | Pendiente |

---

## Estructura General del Repositorio

El proyecto está organizado en tres módulos principales para separar la capa de datos, la API REST y la interfaz web:

```text
Proyecto_Ingenieria/
├── README.md                                  # Documentación general del repositorio
├── .gitignore                                 # Exclusión de dependencias, builds y archivos .env
├── assets/                                    # Logotipos institucionales y corporativos
│   ├── Logotipo_corporativo_Orvant_Technologies.png
│   ├── Logotipo_tecnológico_azul_ORVANT.png
│   ├── FES_blanco.png                         # Logotipo institucional para encabezados oscuros
│   └── escudo-unam-blanco.png                 # Escudo institucional para encabezados oscuros
├── base-de-datos/
│   ├── README.md                              # Modelo de datos, instalación y migración segura
│   ├── esquema_sprint1.sql                    # Esquema completo para una instalación nueva
│   ├── semilla_sprint1.sql                    # Datos iniciales de ejemplo
│   ├── migracion_informes_borradores_evidencias.sql # Migración aditiva para una base existente
│   ├── migracion_rol_planeador.sql            # Agrega el rol Planeador a una base existente
│   ├── migracion_notificaciones_correo.sql    # Verificación de correo y recordatorios semanales
│   └── provisionar_cuenta_prueba_planeador.sql # Cuenta de prueba, solo para desarrollo
├── backend/
│   ├── .env.example                           # Plantilla de variables de entorno (BD, SMTP, puerto y JWT)
│   ├── package.json
│   └── src/
│       ├── index.ts                           # Servidor Express, CORS, endpoint /api/health y montaje de rutas
│       ├── config/
│       │   ├── db.ts                          # Pool de conexiones hacia MariaDB
│       │   └── mailer.ts                      # Envío SMTP de OTP y notificaciones
│       ├── middlewares/
│       │   └── auth.ts                        # Verificación de tokens JWT y control de acceso por rol
│       ├── utils/
│       │   └── correoInstitucional.ts         # Normalización y validación del dominio institucional
│       ├── routes/
│       │   ├── auth.routes.ts                 # Solicitud de acceso, generación y validación de OTP
│       │   ├── admin.routes.ts                # Usuarios, licenciaturas, ciclos y catálogos
│       │   ├── planes.routes.ts               # Captura, consulta y revisión de recomendaciones
│       │   ├── borradores.routes.ts           # Borradores privados por creador
│       │   ├── seguimiento.routes.ts          # Avance, estados y evidencias del Informe
│       │   └── reportes.routes.ts             # Descarga de reportes por ciclo
│       └── services/
│           ├── notificacionesEmail.ts         # Avisos de envío/revisión y recordatorios semanales
│           └── reportes.ts                    # Generación de Word y PDF desde los mismos datos
├── frontend/
│   ├── next.config.ts                         # Proxy local de /api/* hacia el backend
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── globals.css                    # Estilos globales y configuración de Tailwind CSS
│       │   ├── layout.tsx                     # Estructura raíz y tipografía de la aplicación
│       │   ├── page.tsx                       # Redirección inicial hacia el inicio de sesión
│       │   ├── login/
│       │   │   └── page.tsx                   # Acceso institucional y verificación OTP
│       │   └── tablero/
│       │       ├── layout.tsx                 # Barra lateral, encabezado y control de sesión
│       │       ├── page.tsx                   # Panel de resumen
│       │       ├── planes/
│       │       │   └── page.tsx               # Plan, borradores y descarga del reporte
│       │       ├── informe/
│       │       │   └── page.tsx               # Avance, observaciones, evidencias y reporte
│       │       └── administracion/
│       │           └── page.tsx               # Gestión de cuentas, ciclos y catálogos
│       ├── servicios/
│       │   └── apiSistema.ts                  # Cliente HTTP centralizado con sesión JWT
│       └── tipos/
│           └── sistema.ts                     # Interfaces y contratos de datos TypeScript
└── deploy/
    └── nginx/
        └── orvant.conf.example                # Proxy HTTPS de ejemplo para producción
```

---

## Guía Rápida de Ejecución Local

1. **Base de datos (MariaDB):** Solo para crear una instalación nueva y vacía:
   ```bash
   sudo mariadb < base-de-datos/esquema_sprint1.sql
   sudo mariadb < base-de-datos/semilla_sprint1.sql
   ```
   Para una base existente, no ejecutes el esquema inicial porque elimina y vuelve a crear la base. Aplica la migración aditiva:
   ```bash
   sudo mariadb < base-de-datos/migracion_informes_borradores_evidencias.sql
   sudo mariadb < base-de-datos/migracion_rol_planeador.sql
   sudo mariadb < base-de-datos/migracion_notificaciones_correo.sql
   ```
2. **Backend (Puerto 3001):**
   ```bash
   cd backend
   cp .env.example .env   # Configurar MariaDB y SMTP (requerido para OTP por correo)
   npm install
   npm run dev
   ```
   Para probar correo con Google Workspace, configura `SMTP_HOST=smtp.gmail.com`,
   `SMTP_PORT=587`, `SMTP_USER` y `SMTP_FROM` con la cuenta institucional, y
   `SMTP_PASS` con una contraseña de aplicación autorizada por la organización.
   No uses la contraseña normal ni la compartas por chat. En desarrollo,
   `FORCE_ADMIN_OTP=true` habilita OTP para Administrador; sin SMTP se muestra
   un código simulado y no se envía correo real.
3. **Frontend (Puerto 3000):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Para validar el backend, ejecuta `npm run build` desde `backend/`. El frontend tiene errores de TypeScript preexistentes en `ModalAjusteFecha.tsx` y `datosIniciales.ts`; están fuera de las funcionalidades descritas arriba.

Al enviar o revisar una recomendación del Plan o del Informe, el sistema avisa
por correo a Planeación o a las Jefaturas activas de la licenciatura. Los
recordatorios de pendientes se procesan los lunes a las 9:00 (hora de Ciudad
de México) mientras el backend está en ejecución; SMTP debe estar configurado.
El Administrador puede cambiar su correo desde Administración, verificando el
nuevo correo mediante OTP, y enviar un correo de prueba a su dirección actual.

### HTTPS en producción

El navegador se conecta por HTTPS al proxy inverso, y Next.js reenvía `/api/*`
al backend mediante loopback HTTP. Ese tráfico no sale del servidor. Consulta
`frontend/README.md` y `deploy/nginx/orvant.conf.example`; el dominio y los
certificados deben configurarse en el servidor, no en el código ni en Git.
