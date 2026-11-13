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

Plataforma web desarrollada para la Unidad de Planeación y las Coordinaciones de Programa de la Facultad de Estudios Superiores Acatlán (UNAM). Centraliza la captura, revisión, validación y consulta histórica de los Planes de Mejora Continua y los Informes de Seguimiento derivados de los procesos de acreditación.

---

## Stack Tecnológico

* **Frontend:** Next.js (App Router), React, TypeScript y Tailwind CSS.
* **Backend:** NestJS, Node.js y TypeORM.
* **Base de Datos:** MariaDB.
* **Servidor / Entorno de Pruebas:** Debian Linux Server + SSH.

---

## Estructura General del Repositorio

El proyecto está dividido en tres carpetas principales para separar la base de datos, la lógica del servidor y la interfaz de usuario:

```text
sistema-mejora-continua/
├── README.md                      # Documentación general del repositorio
├── base-de-datos/
│   ├── README.md                  # Guía de creación, migración y respaldo en MariaDB
│   └── esquema_produccion.sql     # Script SQL completo para despliegue limpio o actualización
├── backend/
│   ├── README.md                  # Instrucciones de configuración de API, SMTP y variables de entorno
│   ├── .env.example               # Plantilla de variables de entorno para el servidor
│   ├── package.json
│   └── src/
│       ├── main.ts                # Punto de entrada del servidor NestJS y configuración de puertos
│       ├── app.module.ts          # Conexión principal con MariaDB y registro de módulos
│       ├── autenticacion/         # Validación de dominio @pcpuma, generación de OTP (6 dígitos) y JWT
│       ├── usuarios/              # Gestión de cuentas, roles, límite de 2 usuarios por carrera y bloqueos
│       ├── licenciaturas/         # Catálogo dinámico de programas académicos (ampliable sin tocar código)
│       ├── planeacion/            # Planes de mejora, informes, validación PDF y bitácora de ajuste de fechas
│       └── tickets/               # Gestión de solicitudes de prórroga y dudas del procedimiento
└── frontend/
    ├── README.md                  # Guía de ejecución en VS Code y compilación para producción
    ├── .env.example               # Plantilla de conexión hacia la API del backend
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx         # Configuración global de estilos y tipografía institucional
        │   ├── page.tsx           # Redirección inicial al acceso del sistema
        │   ├── login/
        │   │   └── page.tsx       # Acceso institucional en 2 pasos (correo @pcpuma + código OTP)
        │   └── tablero/
        │       ├── layout.tsx     # Navegación lateral, barra superior y control de sesión por rol
        │       ├── page.tsx       # Resumen de avances, estatus de documentos y alertas activas
        │       ├── planes/
        │       │   └── page.tsx   # Captura, carga de evidencias PDF, visor interno y ajuste de plazos
        │       ├── tickets/
        │       │   └── page.tsx   # Apertura y seguimiento de tickets de proceso (prórrogas y dudas)
        │       └── administracion/
        │           └── page.tsx   # Alta de nuevas licenciaturas, gestión de usuarios y desbloqueos
        ├── componentes/
        │   ├── VisorPdfModal.tsx    # Previsualización de archivos PDF dentro de la misma plataforma
        │   └── ModalAjusteFecha.tsx # Formulario para alargar o acortar fechas límite con historial
        ├── datos/
        │   └── datosIniciales.ts    # Catálogo inicial de licenciaturas y datos base para pruebas locales
        ├── servicios/
        │   └── apiSistema.ts        # Cliente HTTP con respaldo local para pruebas sin servidor activo
        └── tipos/
            └── sistema.ts           # Definición de interfaces y tipos de datos del proyecto
