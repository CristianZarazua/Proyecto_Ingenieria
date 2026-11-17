USE mejora_continua_acatlan;

-- 1. Los 16 Programas de Carrera oficiales
INSERT IGNORE INTO programas_carrera (id, nombre) VALUES
  (1, 'Programa de Actuaría'),
  (2, 'Programa de Arquitectura'),
  (3, 'Programa Político'),
  (4, 'Programa de Comunicación'),
  (5, 'Programa de Derecho'),
  (6, 'Programa de Diseño Gráfico'),
  (7, 'Programa de Economía'),
  (8, 'Programa de Enseñanza de Inglés'),
  (9, 'Programa de Enseñanza de Español como Lengua Extranjera'),
  (10, 'Programa de Humanidades'),
  (11, 'Programa de Ingeniería Civil'),
  (12, 'Programa de Matemáticas Aplicadas y Computación'),
  (13, 'Programa de Pedagogía'),
  (14, 'Programa de Sociología'),
  (15, 'Programa de Enseñanza de Alemán como Lengua Extranjera'),
  (16, 'Programa de Enseñanza de Francés como Lengua Extranjera');

-- 2. Las 19 Licenciaturas vinculadas a su Programa de Carrera
INSERT IGNORE INTO licenciaturas (id, programa_id, nombre) VALUES
  (1, 1, 'Actuaría'),
  (2, 2, 'Arquitectura'),
  (3, 3, 'Ciencias Políticas y Administración Pública'),
  (4, 3, 'Relaciones Internacionales'),
  (5, 4, 'Comunicación'),
  (6, 5, 'Derecho'),
  (7, 6, 'Diseño Gráfico'),
  (8, 7, 'Economía'),
  (9, 8, 'Enseñanza de Inglés'),
  (10, 9, 'Enseñanza de Español como Lengua Extranjera'),
  (11, 10, 'Filosofía'),
  (12, 10, 'Historia'),
  (13, 10, 'Lengua y Literaturas Hispánicas'),
  (14, 11, 'Ingeniería Civil'),
  (15, 12, 'Matemáticas Aplicadas y Computación'),
  (16, 13, 'Pedagogía'),
  (17, 14, 'Sociología'),
  (18, 15, 'Enseñanza de Alemán como Lengua Extranjera'),
  (19, 16, 'Enseñanza de Francés como Lengua Extranjera');

-- 3. Usuarios base (Administrador, Planeador y 2 Coordinaciones de ejemplo)
INSERT IGNORE INTO usuarios (id, nombre, email, rol, programa_id) VALUES
  (1, 'Administrador General Planeación', 'admin.planeacion@pcpuma.acatlan.unam.mx', 'ADMINISTRADOR', NULL),
  (2, 'Revisor Unidad de Planeación', 'revisor.acreditacion@pcpuma.acatlan.unam.mx', 'PLANEADOR', NULL),
  (3, 'Coordinación Programa MAC', 'jefatura.mac@pcpuma.acatlan.unam.mx', 'JEFATURA', 12),
  (4, 'Coordinación Programa de Humanidades', 'coord.humanidades@pcpuma.acatlan.unam.mx', 'JEFATURA', 10);

-- 4. Ciclos, Categorias e Indicadores base
INSERT IGNORE INTO ciclos_acreditacion (id, anio, etiqueta, estatus) VALUES
  (1, 2025, 'Seguimiento Histórico 2025', 'HISTORICO'),
  (2, 2026, 'Ciclo Ordinario 2026', 'ACTIVO');

INSERT IGNORE INTO categorias (id, nombre) VALUES
  (1, 'Plan de Estudios'),
  (2, 'Personal Académico'),
  (3, 'Trayectoria Escolar');

INSERT IGNORE INTO indicadores (id, categoria_id, nombre) VALUES
  (1, 1, 'Actualización de programas de asignatura'),
  (2, 2, 'Formación y actualización docente'),
  (3, 3, 'Eficiencia terminal y titulación');

-- 5. Recomendacion inicial de muestra con liga de Google Drive
INSERT IGNORE INTO recomendaciones_plan
  (id, ciclo_id, licenciatura_id, categoria_id, indicador_id, recomendacion, acciones, meta_medible, fecha_cumplimiento, porcentaje_avance, estatus)
VALUES
  (1, 2, 15, 1, 1, 'Actualizar al menos el 80% de las bibliografías básicas de los semestres 5 al 8.', 'Convocar a las academias por área de conocimiento.', '16 programas actualizados', '2026-12-15', 75, 'ENVIADO');

INSERT IGNORE INTO evidencias_drive (id, recomendacion_id, titulo_documento, url_drive, registrado_por) VALUES
  (1, 1, 'Minuta_Academia_MAC_2026.pdf', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view', 3);
