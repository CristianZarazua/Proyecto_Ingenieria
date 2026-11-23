USE mejora_continua_acatlan;

INSERT INTO usuarios (nombre, email, rol, tipo_cuenta, licenciatura_id, activo)
SELECT 'Planeador de pruebas',
       'planeador.planeacion@pcpuma.acatlan.unam.mx',
       'PLANEADOR',
       'ADMIN',
       NULL,
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM usuarios
  WHERE email = 'planeador.planeacion@pcpuma.acatlan.unam.mx'
);
