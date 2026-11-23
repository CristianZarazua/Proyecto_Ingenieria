# Base de datos MariaDB

Este directorio contiene el esquema y los datos de ejemplo del Sistema de Seguimiento a la Mejora Continua. La aplicación se conecta a la base `mejora_continua_acatlan`.

## Archivos

- `esquema_sprint1.sql`: crea desde cero las tablas, relaciones y reglas de cuentas. **Elimina primero la base con el mismo nombre**; solo usar para una instalación nueva y vacía.
- `semilla_sprint1.sql`: carga licenciaturas, cuentas de demostración, catálogos y ciclos de ejemplo. Usar después del esquema inicial.
- `migracion_informes_borradores_evidencias.sql`: actualiza una base existente de forma aditiva, agrega fechas finales de acreditación y las tablas para borradores, seguimiento y evidencias. No elimina datos.
- `migracion_rol_planeador.sql`: agrega el rol `PLANEADOR` al catálogo de roles sin modificar las cuentas existentes.
- `provisionar_cuenta_prueba_planeador.sql`: crea la cuenta `planeador.planeacion@pcpuma.acatlan.unam.mx` si no existe. Usar únicamente en desarrollo o pruebas, después de agregar el rol Planeador.

## Actualizar una base existente

Haz un respaldo antes de cualquier migración. Desde la raíz del repositorio:

```bash
sudo mariadb < base-de-datos/migracion_informes_borradores_evidencias.sql
sudo mariadb < base-de-datos/migracion_rol_planeador.sql
```

La migración completa las fechas finales existentes con un periodo de cinco años desde la fecha de acreditación. No vuelvas a ejecutar el esquema inicial sobre una base que contenga información.

Para habilitar la cuenta de Planeador de pruebas en una base local existente:

```bash
sudo mariadb < base-de-datos/provisionar_cuenta_prueba_planeador.sql
```

No ejecutes este último script en producción. La cuenta de prueba inicia sesión con OTP igual que las demás y solo puede recibir el código simulado en desarrollo sin SMTP.

## Entidades principales

- `licenciaturas` y `usuarios`: programas educativos y cuentas con rol de Administrador, Planeador o Jefatura.
- `ciclos_acreditacion`: licenciatura, organismo acreditador y periodo de vigencia.
- `recomendaciones_plan`: categoría, indicador, recomendación, acciones, meta, área responsable, fecha y estado del Plan.
- `borradores_plan`: captura incompleta asociada al usuario creador; las consultas y cambios se restringen a ese creador.
- `seguimiento_recomendaciones`: avance, observaciones y estado del Informe para cada recomendación.
- `evidencias_recomendacion`: archivos PDF guardados fuera de la base y ligas externas asociadas a recomendaciones.
- `cat_*`: catálogos administrables de categorías, indicadores, áreas, porcentajes y organismos.

El Administrador registra cuentas de Jefatura y Planeador individualmente o por
lotes de hasta 100 correos institucionales. No hay autorregistro público. Todas
las cuentas, incluido Administrador, requieren OTP. Planeador puede consultar
todas las licenciaturas, validar o devolver Planes e Informes y administrar
ciclos y catálogos. Jefatura captura únicamente para su licenciatura.

## Estados

El Plan y el Informe tienen estados independientes. En ambos flujos, la Coordinación envía un borrador; Planeación lo valida o lo devuelve con observaciones. Una devolución permite corregir y reenviar. Las observaciones de Planeación se guardan por recomendación.

## Evidencias

Los PDF se almacenan en el directorio indicado por `EVIDENCE_STORAGE_DIR` (por omisión, `storage/evidencias` fuera de `backend/`). La base guarda la relación, el nombre original y el tamaño, no el contenido del archivo. Configura respaldos del directorio de evidencias además de los respaldos de MariaDB.