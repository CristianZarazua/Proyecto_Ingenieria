-- ============================================================================
-- SISTEMA DE SEGUIMIENTO A LA MEJORA CONTINUA - FES ACATLAN (UNAM)
-- Esquema de Produccion para MariaDB
-- ============================================================================

CREATE DATABASE IF NOT EXISTS mejora_continua_acatlan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mejora_continua_acatlan;

CREATE TABLE IF NOT EXISTS programas_carrera (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS licenciaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  programa_id INT NOT NULL,
  nombre VARCHAR(180) NOT NULL UNIQUE,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lic_programa FOREIGN KEY (programa_id) REFERENCES programas_carrera(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  rol ENUM('ADMINISTRADOR', 'PLANEADOR', 'JEFATURA') NOT NULL,
  programa_id INT NULL,
  codigo_otp VARCHAR(6) NULL,
  otp_expira_en DATETIME NULL,
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usr_programa FOREIGN KEY (programa_id) REFERENCES programas_carrera(id)
) ENGINE=InnoDB;

DELIMITER //
CREATE TRIGGER trg_validar_max_usuarios_programa
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  DECLARE total_cuentas INT;
  IF NEW.rol = 'JEFATURA' THEN
    IF NEW.programa_id IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Toda cuenta de Jefatura debe pertenecer a un Programa de Carrera.';
    END IF;
    SELECT COUNT(*) INTO total_cuentas
      FROM usuarios
      WHERE rol = 'JEFATURA' AND programa_id = NEW.programa_id;
    IF total_cuentas >= 2 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Limite alcanzado: maximo 2 cuentas por Programa de Carrera.';
    END IF;
  END IF;
END//
DELIMITER ;

CREATE TABLE IF NOT EXISTS ciclos_acreditacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  anio YEAR NOT NULL,
  etiqueta VARCHAR(80) NOT NULL,
  estatus ENUM('ACTIVO', 'HISTORICO') NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS indicadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nombre VARCHAR(220) NOT NULL,
  CONSTRAINT fk_ind_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recomendaciones_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciclo_id INT NOT NULL,
  licenciatura_id INT NOT NULL,
  categoria_id INT NOT NULL,
  indicador_id INT NOT NULL,
  recomendacion TEXT NOT NULL,
  acciones TEXT NULL,
  meta_medible VARCHAR(255) NULL,
  fecha_cumplimiento DATE NOT NULL,
  porcentaje_avance TINYINT UNSIGNED NOT NULL DEFAULT 0,
  estatus ENUM('BORRADOR', 'ENVIADO', 'DEVUELTO', 'VALIDADO') NOT NULL DEFAULT 'BORRADOR',
  observaciones_planeacion TEXT NULL,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_plan_ciclo FOREIGN KEY (ciclo_id) REFERENCES ciclos_acreditacion(id),
  CONSTRAINT fk_plan_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id),
  CONSTRAINT fk_plan_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT fk_plan_ind FOREIGN KEY (indicador_id) REFERENCES indicadores(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidencias_drive (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recomendacion_id INT NOT NULL,
  titulo_documento VARCHAR(200) NOT NULL,
  url_drive VARCHAR(500) NOT NULL,
  registrado_por INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ev_plan FOREIGN KEY (recomendacion_id) REFERENCES recomendaciones_plan(id) ON DELETE CASCADE,
  CONSTRAINT fk_ev_usr FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_fechas_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recomendacion_id INT NOT NULL,
  fecha_anterior DATE NOT NULL,
  fecha_nueva DATE NOT NULL,
  motivo TEXT NOT NULL,
  autor_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hf_plan FOREIGN KEY (recomendacion_id) REFERENCES recomendaciones_plan(id) ON DELETE CASCADE,
  CONSTRAINT fk_hf_usr FOREIGN KEY (autor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tickets_proceso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  licenciatura_id INT NOT NULL,
  creado_por INT NOT NULL,
  tipo ENUM('PRORROGA_FECHA', 'DUDA_PROCEDIMIENTO', 'ACLARACION_OBSERVACION') NOT NULL,
  asunto VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  respuesta_planeacion TEXT NULL,
  estatus ENUM('ABIERTO', 'RESUELTO') NOT NULL DEFAULT 'ABIERTO',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tk_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id),
  CONSTRAINT fk_tk_usr FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;
