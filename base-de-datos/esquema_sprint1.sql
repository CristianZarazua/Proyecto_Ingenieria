DROP DATABASE IF EXISTS mejora_continua_acatlan;
CREATE DATABASE mejora_continua_acatlan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mejora_continua_acatlan;

-- PB-05: Licenciaturas
CREATE TABLE licenciaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PB-01, PB-02, PB-03: Usuarios (Roles: ADMINISTRADOR y JEFATURA; baja logica con activo = 0)
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  rol ENUM('ADMINISTRADOR', 'JEFATURA') NOT NULL,
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

-- PB-04: Catalogos administrables (crear, editar, desactivar)
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

-- PB-05: Ciclos de acreditacion (licenciatura, organismo y fecha)
CREATE TABLE ciclos_acreditacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  licenciatura_id INT NOT NULL,
  organismo_id INT NOT NULL,
  fecha_acreditacion DATE NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ciclo_lic FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id),
  CONSTRAINT fk_ciclo_org FOREIGN KEY (organismo_id) REFERENCES cat_organismos(id)
);

-- PB-06: Captura del Plan (multiples recomendaciones por categoria/indicador, meta texto libre, sin estatus)
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

-- PB-02: Regla de negocio: maximo 2 cuentas activas (Jefatura + Auxiliar) por licenciatura
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
