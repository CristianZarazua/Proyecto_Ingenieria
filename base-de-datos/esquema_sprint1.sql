DROP DATABASE IF EXISTS mejora_continua_acatlan;
CREATE DATABASE mejora_continua_acatlan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mejora_continua_acatlan;

-- Catalogo de licenciaturas
CREATE TABLE licenciaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cuentas institucionales y roles
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  rol ENUM('ADMINISTRADOR', 'PLANEADOR', 'JEFATURA') NOT NULL,
  tipo_cuenta ENUM('ADMIN', 'TITULAR', 'AUXILIAR') NOT NULL DEFAULT 'TITULAR',
  licenciatura_id INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  codigo_otp VARCHAR(6) NULL,
  otp_expira_en DATETIME NULL,
  intentos_fallidos TINYINT NOT NULL DEFAULT 0,
  bloqueado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id)
);

CREATE TABLE cambios_correo_admin (
  usuario_id INT PRIMARY KEY,
  email_nuevo VARCHAR(150) NOT NULL UNIQUE,
  codigo_otp VARCHAR(6) NOT NULL,
  expira_en DATETIME NOT NULL,
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cambio_correo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE recordatorios_semanales (
  usuario_id INT NOT NULL,
  semana DATE NOT NULL,
  enviado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, semana),
  CONSTRAINT fk_recordatorio_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Catalogos administrables
CREATE TABLE cat_categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE cat_indicadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uk_cat_ind (categoria_id, nombre),
  CONSTRAINT fk_ind_cat FOREIGN KEY (categoria_id) REFERENCES cat_categorias(id)
);

CREATE TABLE cat_areas_responsables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE cat_porcentajes_avance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor TINYINT UNSIGNED NOT NULL UNIQUE,
  etiqueta VARCHAR(50) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE cat_organismos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  siglas VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
);

-- Ciclos de acreditacion (licenciatura, organismo y periodo de vigencia)
CREATE TABLE ciclos_acreditacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  licenciatura_id INT NOT NULL,
  organismo_id INT NOT NULL,
  fecha_acreditacion DATE NOT NULL,
  fecha_fin_acreditacion DATE NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ciclo_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id),
  CONSTRAINT fk_ciclo_org FOREIGN KEY (organismo_id) REFERENCES cat_organismos(id)
);

-- Recomendaciones del Plan de Mejora Continua
CREATE TABLE recomendaciones_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciclo_id INT NOT NULL,
  licenciatura_id INT NOT NULL,
  categoria_id INT NOT NULL,
  indicador_id INT NOT NULL,
  area_responsable_id INT NOT NULL,
  porcentaje_id INT NULL,
  recomendacion TEXT NOT NULL,
  acciones TEXT NOT NULL,
  meta TEXT NOT NULL,
  fecha_cumplimiento DATE NOT NULL,
  estatus ENUM('BORRADOR', 'ENVIADO', 'DEVUELTO', 'VALIDADO') NOT NULL DEFAULT 'BORRADOR',
  observaciones_planeacion TEXT NULL,
  creado_por INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plan_ciclo FOREIGN KEY (ciclo_id) REFERENCES ciclos_acreditacion(id),
  CONSTRAINT fk_plan_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id),
  CONSTRAINT fk_plan_cat FOREIGN KEY (categoria_id) REFERENCES cat_categorias(id),
  CONSTRAINT fk_plan_ind FOREIGN KEY (indicador_id) REFERENCES cat_indicadores(id),
  CONSTRAINT fk_plan_area FOREIGN KEY (area_responsable_id) REFERENCES cat_areas_responsables(id),
  CONSTRAINT fk_plan_porc FOREIGN KEY (porcentaje_id) REFERENCES cat_porcentajes_avance(id),
  CONSTRAINT fk_plan_usr FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE borradores_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creado_por INT NOT NULL,
  licenciatura_id INT NULL,
  datos_json JSON NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_borrador_creador (creado_por),
  CONSTRAINT fk_borrador_usr FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_borrador_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id)
);

CREATE TABLE seguimiento_recomendaciones (
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
);

CREATE TABLE evidencias_recomendacion (
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
);

-- Regla de negocio: maximo dos cuentas activas de Jefatura por licenciatura.
DELIMITER //
CREATE TRIGGER trg_max_cuentas_licenciatura_ins
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  DECLARE total_activas INT;
  IF NEW.rol = 'JEFATURA' AND NEW.activo = 1 THEN
    IF NEW.licenciatura_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Toda cuenta de Jefatura debe estar asignada a una licenciatura.';
    END IF;
    SELECT COUNT(*) INTO total_activas
    FROM usuarios
    WHERE licenciatura_id = NEW.licenciatura_id AND rol = 'JEFATURA' AND activo = 1;
    IF total_activas >= 2 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Limite alcanzado: maximo 2 cuentas activas (Jefatura y Auxiliar) por licenciatura.';
    END IF;
  END IF;
END//

CREATE TRIGGER trg_max_cuentas_licenciatura_upd
BEFORE UPDATE ON usuarios
FOR EACH ROW
BEGIN
  DECLARE total_activas INT;
  IF NEW.rol = 'JEFATURA' AND NEW.activo = 1 THEN
    SELECT COUNT(*) INTO total_activas
    FROM usuarios
    WHERE licenciatura_id = NEW.licenciatura_id AND rol = 'JEFATURA' AND activo = 1 AND id <> OLD.id;
    IF total_activas >= 2 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Limite alcanzado: maximo 2 cuentas activas (Jefatura y Auxiliar) por licenciatura.';
    END IF;
  END IF;
END//
DELIMITER ;
