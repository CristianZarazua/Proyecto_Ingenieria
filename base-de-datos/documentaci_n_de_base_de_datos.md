# Gestión de Base de Datos - MariaDB

Directorio reservado para la gestión del esquema relacional, migraciones, scripts de carga inicial y respaldo de información del Sistema de Seguimiento a la Mejora Continua en la FES Acatlán.

---

## Contenido del directorio

* `esquema_produccion.sql`: Script SQL idéntico e idempotente que crea la base de datos, las 6 tablas principales, las restricciones de clave foránea, el sembrado inicial de las 19 licenciaturas y los usuarios base de prueba.

---

## Pasos para la instalación en Debian Server

1. **Acceder al cliente de MariaDB con privilegios de administrador:**
   ```bash
   sudo mariadb -u root -p
   ```

2. **Ejecutar el script directamente desde la terminal:**
   ```bash
   sudo mariadb -u root -p < base-de-datos/esquema_produccion.sql
   ```

3. **Verificar la correcta creación de tablas:**
   ```sql
   USE orvant_mejora_continua;
   SHOW TABLES;
   ```

---

## Estructura de Tablas y Reglas de Negocio

* **`licenciaturas`**: Almacena el catálogo de carreras. Se puede ampliar dinámicamente mediante el sistema sin necesidad de alterar esta tabla.
* **`usuarios`**: Registra cuentas del dominio `@pcpuma.acatlan.unam.mx`. 
  * `intentos_fallidos`: Contador numérico incrementable hasta 3.
  * `estatus`: Cambia a `BLOQUEADA_SEGURIDAD` cuando los intentos llegan a 3. El Administrador puede restablecer este valor a `ACTIVO` e `intentos_fallidos` a 0.
  * `codigo_otp` y `expiracion_otp`: Código numérico temporal de 6 dígitos enviado por correo para acceso en dos pasos.
* **`planes_mejora`**: Guarda recomendaciones, avances y los nombres de los archivos PDF de evidencia adjuntos.
* **`historial_fechas_cumplimiento`**: Bitácora inmutable que registra cada prórroga o modificación de fecha autorizada por Planeación, indicando la fecha previa, la nueva fecha y el motivo acordado.
* **`tickets_proceso`**: Modulo de atención de dudas sobre procedimientos y solicitudes de ajuste de fechas.

---

## Respaldo y Restauración de Producción

### Generar respaldo completo en archivo comprimido:
```bash
mysqldump -u orvant_user -p orvant_mejora_continua | gzip > respaldo_orvant_$(date +%Y%m%d).sql.gz
```

### Restaurar respaldo existente:
```bash
gunzip < respaldo_orvant_20261112.sql.gz | mysql -u orvant_user -p orvant_mejora_continua
```