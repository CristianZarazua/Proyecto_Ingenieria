USE mejora_continua_acatlan;

ALTER TABLE ciclos_acreditacion
  ADD COLUMN IF NOT EXISTS fecha_fin_acreditacion DATE NULL;

UPDATE ciclos_acreditacion
SET fecha_fin_acreditacion = DATE_ADD(fecha_acreditacion, INTERVAL 5 YEAR)
WHERE fecha_fin_acreditacion IS NULL;

ALTER TABLE ciclos_acreditacion
  MODIFY COLUMN fecha_fin_acreditacion DATE NOT NULL;

ALTER TABLE recomendaciones_plan
  ADD COLUMN IF NOT EXISTS estatus ENUM('BORRADOR', 'ENVIADO', 'DEVUELTO', 'VALIDADO')
    NOT NULL DEFAULT 'BORRADOR',
  ADD COLUMN IF NOT EXISTS observaciones_planeacion TEXT NULL;

CREATE TABLE IF NOT EXISTS borradores_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creado_por INT NOT NULL,
  licenciatura_id INT NULL,
  datos_json JSON NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_borrador_creador (creado_por),
  CONSTRAINT fk_borrador_usr FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_borrador_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seguimiento_recomendaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recomendacion_id INT NOT NULL UNIQUE,
  porcentaje_id INT NULL,
  observaciones TEXT NULL,
  estatus ENUM('BORRADOR', 'ENVIADO', 'DEVUELTO', 'VALIDADO') NOT NULL DEFAULT 'BORRADOR',
  observaciones_planeacion TEXT NULL,
  actualizado_por INT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_seg_recomendacion FOREIGN KEY (recomendacion_id) REFERENCES recomendaciones_plan(id) ON DELETE CASCADE,
  CONSTRAINT fk_seg_porcentaje FOREIGN KEY (porcentaje_id) REFERENCES cat_porcentajes_avance(id),
  CONSTRAINT fk_seg_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidencias_recomendacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recomendacion_id INT NOT NULL,
  tipo ENUM('PDF', 'ENLACE') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  nombre_archivo VARCHAR(255) NULL,
  ruta_archivo VARCHAR(500) NULL,
  url_externa VARCHAR(2048) NULL,
  tamano_bytes INT UNSIGNED NULL,
  creado_por INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_evidencia_recomendacion (recomendacion_id),
  CONSTRAINT fk_evidencia_recomendacion FOREIGN KEY (recomendacion_id) REFERENCES recomendaciones_plan(id) ON DELETE CASCADE,
  CONSTRAINT fk_evidencia_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;
