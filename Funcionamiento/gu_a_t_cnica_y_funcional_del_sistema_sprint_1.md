# Guía Técnica y Funcional: Sistema de Seguimiento a la Mejora Continua (FES Acatlán)

Este documento resume qué hace el sistema, cómo está construido por dentro y qué reglas de negocio y seguridad aplica, pensado para exponer y responder preguntas técnicas en clase.

---

## 1. ¿Cuál es el propósito del sistema?
Digitalizar y centralizar el **Plan de Mejora Continua** derivado de los procesos de acreditación de las licenciaturas de la **UNAM FES Acatlán**. 

Conecta a dos actores principales:
1. **Unidad de Planeación (Administrador):** Configura el sistema, da de alta las licenciaturas, los ciclos de acreditación, los catálogos institucionales y las cuentas de usuario.
2. **Jefaturas de Licenciatura (Titular y Auxiliar):** Capturan las recomendaciones emitidas por los organismos acreditadores (como CACEI, CONAIC, etc.), definiendo acciones, metas, áreas responsables y fechas compromiso.

---

## 2. Arquitectura Tecnológica (¿Cómo está construido?)

El sistema sigue una arquitectura **Cliente-Servidor desacoplada en 3 capas**:

```text
[ Navegador Web ] 
       │  (Puerto 3000 - HTTP / JSON)
       ▼
[ Frontend: Next.js + React + Tailwind CSS ]
       │  (Rewrites / Proxy interno "/api/*" -> 127.0.0.1:3001)
       ▼
[ Backend: Node.js + Express + TypeScript ]
       │  (Pool de conexiones mysql2 + JWT)
       ▼
[ Base de Datos: MariaDB (mejora_continua_acatlan) ]
```

### Detalle de cada capa:
* **Frontend (Puerto 3000):** Desarrollado con **Next.js (App Router)** y **Tailwind CSS**. Se encarga de la interfaz institucional (colores azul y oro UNAM), validaciones visuales de formularios y manejo de sesión.
  * *Detalle técnico clave:* Utiliza una regla `rewrites` en `next.config.ts` que redirige cualquier petición `/api/*` hacia el puerto `3001`. Esto evita problemas de **CORS** y permite compartir todo el sistema en internet usando un único túnel en el puerto `3000`.
* **Backend (Puerto 3001):** API REST construida con **Node.js, Express y TypeScript**. Contiene toda la lógica de negocio, validación de roles, generación de códigos OTP y seguridad.
* **Base de Datos (Puerto 3306):** Motor relacional **MariaDB** con 9 tablas normalizadas y vistas (`VIEW`) de auditoría. Se conecta mediante un usuario dedicado de aplicación (`acatlan_app`) con privilegios restringidos únicamente a esta base de datos (principio de mínimo privilegio).

---

## 3. Seguridad y Control de Acceso (Autenticación y Roles)

El sistema no utiliza contraseñas estáticas tradicionales para evitar el robo o reutilización de claves; en su lugar implementa **autenticación institucional basada en correo `@pcpuma.acatlan.unam.mx` y tokens JWT**:

1. **Validación de Dominio y Estado:** Solo se permite el acceso a correos `@pcpuma.acatlan.unam.mx` previamente registrados por el Administrador y cuyo estado sea `activo = 1` y `bloqueado = 0`.
2. **Flujo diferenciado por Rol:**
   * **Rol `ADMINISTRADOR`:** Ingresa directamente y recibe un **JSON Web Token (JWT)** con vigencia de 12 horas.
   * **Rol `JEFATURA` (Titular o Auxiliar):** Utiliza **autenticación de dos pasos mediante OTP (One-Time Password)**:
     1. El sistema genera un código aleatorio de **6 dígitos** con vigencia exacta de **10 minutos** (`DATE_ADD(NOW(), INTERVAL 10 MINUTE)` en MariaDB).
     2. El usuario tiene máximo **3 intentos** para ingresarlo. Si falla 3 veces, la cuenta cambia automáticamente a `bloqueado = 1` y solo el Administrador puede reactivarla.
3. **Aislamiento estricto de datos (Seguridad en el Backend):**
   * El token JWT guarda cifrado el `rol` y el `licenciaturaId` del usuario.
   * Si una Jefatura de *MAC* intenta manipular la petición HTTP para ver o registrar datos de *Derecho*, el backend rechaza la operación con un error **`403 Forbidden`** y filtra todas las consultas SQL mediante `WHERE licenciatura_id = ?`.

---

## 4. Módulos Funcionales (Alcance del Sprint 1)

### A. Administración de Cuentas de Usuario
* Permite crear, editar y activar/desactivar cuentas.
* **Reglas de negocio programadas:**
  * Una licenciatura puede tener **máximo 2 cuentas activas** de Jefatura (1 Titular y 1 Auxiliar). Si se intenta registrar o reactivar una tercera, el backend lo bloquea.
  * El sistema impide desactivar al **único Administrador activo** para evitar que la plataforma quede sin gobierno.
  * Se utiliza **borrado lógico** (`activo = 0`) en lugar de `DELETE` para conservar el historial de quién capturó cada recomendación en el pasado.

### B. Licenciaturas y Ciclos de Acreditación
* Registro del catálogo de carreras y asociación con su **Organismo Acreditador** y **Fecha de Acreditación**.
* Las Jefaturas solo visualizan los ciclos activos correspondientes a su propia licenciatura.

### C. Catálogos Institucionales Dinámicos
* Administración centralizada de: **Categorías**, **Indicadores** (vinculados jerárquicamente a una Categoría), **Áreas Responsables**, **Porcentajes de Avance** y **Organismos Acreditadores**.
* Cuando el Administrador desactiva un elemento de catálogo (`activo = 0`), este deja de aparecer en los formularios de captura nueva, pero sigue siendo visible en los registros históricos ya guardados.

### D. Captura y Consulta del Plan de Mejora Continua
* **Filtrado en cascada:** Al elegir una Categoría, el selector de Indicadores filtra automáticamente solo los indicadores pertenecientes a esa categoría.
* **Captura múltiple con Transacción ACID:** Una Jefatura puede añadir varias recomendaciones bajo una misma Categoría e Indicador y guardarlas todas juntas. El backend envuelve la operación en una transacción SQL (`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`): si falla la inserción de la tercera recomendación, se revierten las dos anteriores para no dejar información a medias.

---

## 5. Respuestas Rápidas para Preguntas del Profesor

| Posible pregunta del profesor | Respuesta clara y técnica |
| :--- | :--- |
| **¿Cómo aseguran que una Jefatura no vea ni altere datos de otra carrera?** | No confiamos solo en ocultar botones en el frontend. Cada petición lleva un token **JWT** firmado; el backend extrae el `licenciaturaId` del token y lo fuerza en la cláusula `WHERE` de las consultas SQL, devolviendo `403 Forbidden` si intentan consultar otro ID. |
| **¿Qué pasa si ocurre un error de red al guardar varias recomendaciones a la vez?** | Usamos **transacciones SQL (`beginTransaction`, `commit`, `rollback`)** en MariaDB. O se guardan todas las recomendaciones del bloque correctamente, o no se guarda ninguna, garantizando la atomicidad de los datos. |
| **¿Por qué desactivan usuarios y catálogos en lugar de eliminarlos (`DELETE`)?** | Por **integridad referencial y auditoría**. Si elimináramos un usuario o una categoría que ya fue usada en un Plan de Mejora Continua, se perdería la trazabilidad histórica o fallarían las llaves foráneas (`FOREIGN KEY`). |
| **¿Cómo protegen el sistema contra ataques de fuerza bruta en el código OTP?** | Cada código OTP expira a los 10 minutos en base de datos y existe un contador `intentos_fallidos`. Al llegar a 3 errores, la cuenta se bloquea (`bloqueado = 1`) y el código se anula hasta que un Administrador la habilite. |
| **¿Por qué la base de datos no se conecta como `root`?** | Por seguridad (principio de mínimo privilegio). Creamos un usuario específico (`acatlan_app`) con permisos limitados exclusivamente a las tablas de `mejora_continua_acatlan`. |