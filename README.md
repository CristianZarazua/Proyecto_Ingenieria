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

Plataforma web desarrollada para la **Unidad de Planeación** y las **Jefaturas de Programa** de la Facultad de Estudios Superiores Acatlán (UNAM). En su **Sprint 1**, centraliza el control de acceso institucional, la administración de cuentas y catálogos dinámicos, la configuración de ciclos de acreditación y la captura estructurada de los Planes de Mejora Continua por licenciatura.

---

## Stack Tecnológico

- **Frontend:** Next.js (App Router), React, TypeScript y Tailwind CSS.
- **Backend:** Node.js, Express, TypeScript, JWT y `mysql2`.
- **Base de Datos:** MariaDB.
- **Servidor / Entorno de Pruebas:** Debian Linux Server + SSH / VS Code Port Forwarding.

---

## Alcance Funcional (Sprint 1)

- **Acceso institucional y seguridad:** Validación estricta de dominio `@pcpuma.acatlan.unam.mx`, acceso directo para Administrador, verificación en dos pasos mediante código OTP de 6 dígitos (vigencia de 10 minutos) para Jefaturas y bloqueo automático tras 3 intentos fallidos.
- **Gestión de cuentas y roles:** Control de cuentas `ADMINISTRADOR` y `JEFATURA` (`TITULAR` / `AUXILIAR`), con regla de negocio de máximo **2 cuentas activas por licenciatura** y activación/desactivación sin pérdida de historial.
- **Catálogos dinámicos y ciclos de acreditación:** Administración de licenciaturas, organismos acreditadores (CIEES, CONAIC, CACEI, etc.), fechas de acreditación, categorías, indicadores, áreas responsables y porcentajes de avance.
- **Captura y consulta del Plan de Mejora Continua:** Registro transaccional de múltiples recomendaciones por indicador (recomendación, acciones, meta, área responsable y fecha compromiso) con aislamiento de datos por licenciatura para Jefaturas y vista global/filtrada para Planeación.

---

## Estructura General del Repositorio

El proyecto está organizado en tres módulos principales para separar la capa de datos, la API REST y la interfaz web:

```text
Proyecto_Ingenieria/
├── README.md                                  # Documentación general del repositorio
├── .gitignore                                 # Exclusión de dependencias, builds y archivos .env
├── assets/                                    # Logotipos institucionales y corporativos
│   ├── Logotipo_corporativo_Orvant_Technologies.png
│   └── Logotipo_tecnológico_azul_ORVANT.png
├── base-de-datos/
│   ├── esquema_sprint1.sql                    # DDL de tablas relacionales, llaves foráneas e índices
│   └── semilla_sprint1.sql                    # Datos iniciales: usuarios, licenciaturas, ciclos y catálogos
├── backend/
│   ├── .env.example                           # Plantilla de variables de entorno (BD, puerto y JWT)
│   ├── package.json
│   └── src/
│       ├── index.ts                           # Servidor Express, CORS, endpoint /api/health y montaje de rutas
│       ├── config/
│       │   ├── db.ts                          # Pool de conexiones hacia MariaDB
│       │   └── mailer.ts                      # Envío de códigos OTP por correo SMTP (con respaldo en consola)
│       ├── middlewares/
│       │   └── auth.ts                        # Verificación de tokens JWT y control de acceso por rol
│       └── routes/
│           ├── auth.routes.ts                 # Solicitud de acceso, generación y validación de OTP
│           ├── admin.routes.ts                # CRUD de usuarios, licenciaturas, ciclos y catálogos
│           └── planes.routes.ts               # Consulta filtrada y captura transaccional de recomendaciones
└── frontend/
    ├── next.config.ts                         # Proxy reverso (/api/* -> [http://127.0.0.1:3001/api/](http://127.0.0.1:3001/api/)*)
    ├── package.json
    └── src/
        ├── app/
        │   ├── globals.css                    # Estilos globales y configuración de Tailwind CSS
        │   ├── layout.tsx                     # Estructura raíz y tipografía de la aplicación
        │   ├── page.tsx                       # Redirección inicial hacia el inicio de sesión
        │   ├── login/
        │   │   └── page.tsx                   # Acceso institucional (correo @pcpuma y verificación OTP)
        │   └── tablero/
        │       ├── layout.tsx                 # Barra lateral, encabezado institucional y control de sesión
        │       ├── page.tsx                   # Panel resumen con indicadores clave del Sprint 1
        │       ├── planes/
        │       │   └── page.tsx               # Formulario de captura múltiple y consulta de recomendaciones
        │       └── administracion/
        │           └── page.tsx               # Gestión de usuarios, ciclos de acreditación y catálogos
        ├── servicios/
        │   └── apiSistema.ts                  # Cliente HTTP centralizado con manejo de sesión JWT
        └── tipos/
            └── sistema.ts                     # Interfaces y contratos de datos TypeScript
```

---

## Guía Rápida de Ejecución Local

1. **Base de datos (MariaDB):**
   ```bash
   sudo mariadb < base-de-datos/esquema_sprint1.sql
   sudo mariadb < base-de-datos/semilla_sprint1.sql
   ```
2. **Backend (Puerto 3001):**
   ```bash
   cd backend
   cp .env.example .env   # Configurar credenciales de MariaDB
   npm install
   npm run dev
   ```
3. **Frontend (Puerto 3000):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
