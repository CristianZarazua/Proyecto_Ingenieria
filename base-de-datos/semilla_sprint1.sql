USE mejora_continua_acatlan;

INSERT INTO licenciaturas (id, nombre) VALUES
  (1, 'Matemáticas Aplicadas y Computación'),
  (2, 'Actuaría'),
  (3, 'Ingeniería Civil'),
  (4, 'Derecho'),
  (5, 'Arquitectura');

INSERT INTO usuarios (nombre, email, rol, tipo_cuenta, licenciatura_id) VALUES
  ('Administrador Planeación', 'admin.planeacion@pcpuma.acatlan.unam.mx', 'ADMINISTRADOR', 'ADMIN', NULL),
  ('Planeador de pruebas', 'planeador.planeacion@pcpuma.acatlan.unam.mx', 'PLANEADOR', 'ADMIN', NULL),
  ('Jefatura MAC', 'jefatura.mac@pcpuma.acatlan.unam.mx', 'JEFATURA', 'TITULAR', 1),
  ('Auxiliar MAC', 'auxiliar.mac@pcpuma.acatlan.unam.mx', 'JEFATURA', 'AUXILIAR', 1),
  ('Jefatura Derecho', 'jefatura.derecho@pcpuma.acatlan.unam.mx', 'JEFATURA', 'TITULAR', 4);

INSERT INTO cat_categorias (id, nombre) VALUES
  (1, 'Plan de Estudios'),
  (2, 'Personal Académico'),
  (3, 'Trayectoria Escolar');

INSERT INTO cat_indicadores (id, categoria_id, nombre) VALUES
  (1, 1, 'Actualización de programas de asignatura'),
  (2, 2, 'Formación y actualización docente'),
  (3, 3, 'Eficiencia terminal y titulación');

INSERT INTO cat_areas_responsables (id, nombre) VALUES
  (1, 'Jefatura de Programa / Licenciatura'),
  (2, 'Secretaría Académica'),
  (3, 'Coordinación de Planeación'),
  (4, 'Comité de Carrera');

INSERT INTO cat_porcentajes_avance (id, valor, etiqueta) VALUES
  (1, 0, '0% - Sin iniciar'),
  (2, 25, '25% - Inicial'),
  (3, 50, '50% - En desarrollo'),
  (4, 75, '75% - Avanzado'),
  (5, 100, '100% - Concluido');

INSERT INTO cat_organismos (id, siglas, nombre) VALUES
  (1, 'CONAIC', 'Consejo Nacional de Acreditación en Informática y Computación'),
  (2, 'CIEES', 'Comités Interinstitucionales para la Evaluación de la Educación Superior'),
  (3, 'CACEI', 'Consejo de Acreditación de la Enseñanza de la Ingeniería'),
  (4, 'CONFEDE', 'Consejo Nacional para la Acreditación de la Educación Superior en Derecho');

INSERT INTO ciclos_acreditacion (id, licenciatura_id, organismo_id, fecha_acreditacion, fecha_fin_acreditacion) VALUES
  (1, 1, 1, '2026-05-15', '2031-05-15'),
  (2, 4, 4, '2026-06-20', '2031-06-20');

INSERT INTO recomendaciones_plan
  (ciclo_id, licenciatura_id, categoria_id, indicador_id, area_responsable_id, porcentaje_id, recomendacion, acciones, meta, fecha_cumplimiento, creado_por)
VALUES
  (1, 1, 1, 1, 1, 1,
   'Actualizar las bibliografías básicas de las asignaturas de programación y bases de datos.',
   'Convocar a las academias de computación para revisar temarios y emitir dictamen.',
   'Actualizar al menos el 85% de los programas de asignatura del área de computación.',
   '2026-11-30', 2);
