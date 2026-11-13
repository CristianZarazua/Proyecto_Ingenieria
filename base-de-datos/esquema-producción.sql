-- =============================================================================
-- SISTEMA DE SEGUIMIENTO A LA MEJORA CONTINUA (FES ACATLÁN - UNAM)
-- Script de Creación y Estructura de Base de Datos para Producción
-- Base de Datos: MariaDB 10.5+ / Debian Server
-- =============================================================================

-- 1. CREACIÓN DE LA BASE DE DATOS Y ASIGNACIÓN DE CARACTERES
CREATE DATABASE IF NOT EXISTS orvant_mejora_continua
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE orvant_mejora_continua;

-- 2. CREACIÓN DE USUARIO DE APLICACIÓN Y PERMISOS LOCALES
CREATE USER IF NOT EXISTS 'orvant_user'@'localhost' IDENTIFIED BY 'ORVANT_Pass_2026!';
GRANT ALL PRIVILEGES ON orvant_mejora_continua.* TO 'orvant_user'@'localhost';
FLUSH PRIVILEGES;

-- 3. TABLA DE LICENCIATURAS (Catálogo Dinámico Ampliable)
CREATE TABLE IF NOT EXISTS licenciaturas (
id INT AUTO_INCREMENT PRIMARY KEY,
nombre VARCHAR(150) NOT NULL UNIQUE,
activa BOOLEAN DEFAULT TRUE,
fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA DE USUARIOS (Con control de intentos, bloqueo y OTP)
CREATE TABLE IF NOT EXISTS usuarios (
id INT AUTO_INCREMENT PRIMARY KEY,
nombre VARCHAR(150) NOT NULL,
email VARCHAR(150) NOT NULL UNIQUE,
rol ENUM('ADMINISTRADOR', 'PLANEADOR', 'JEFATURA') NOT NULL,
licenciatura_id INT NULL,
intentos_fallidos INT DEFAULT 0,
estatus ENUM('ACTIVO', 'BLOQUEADA_SEGURIDAD') DEFAULT 'ACTIVO',
codigo_otp VARCHAR(6) NULL,
expiracion_otp DATETIME NULL,
fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_usuario_licenciatura FOREIGN KEY (licenciatura_id)
REFERENCES licenciaturas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA DE CICLOS DE ACREDITACIÓN
CREATE TABLE IF NOT EXISTS ciclos_acreditacion (
id INT AUTO_INCREMENT PRIMARY KEY,
nombre VARCHAR(100) NOT NULL,
anio_inicio INT NOT NULL,
anio_fin INT NOT NULL,
activo BOOLEAN DEFAULT TRUE,
fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA DE PLANES DE MEJORA CONTINUA E INFORMES
CREATE TABLE IF NOT EXISTS planes_mejora (
id INT AUTO_INCREMENT PRIMARY KEY,
licenciatura_id INT NOT NULL,
ciclo_id INT NOT NULL,
categoria VARCHAR(150) NOT NULL,
indicador VARCHAR(255) NOT NULL,
recomendacion TEXT NOT NULL,
acciones TEXT NOT NULL,
meta_medible TEXT NOT NULL,
fecha_cumplimiento DATE NOT NULL,
porcentaje_avance INT DEFAULT 0,
estatus ENUM('BORRADOR', 'ENVIADO', 'DEVUELTO', 'VALIDADO') DEFAULT 'BORRADOR',
observaciones_planeacion TEXT NULL,
archivo_pdf_nombre VARCHAR(255) NULL,
archivo_pdf_url VARCHAR(500) NULL,
fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT fk_plan_licenciatura FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id) ON DELETE CASCADE,
CONSTRAINT fk_plan_ciclo FOREIGN KEY (ciclo_id) REFERENCES ciclos_acreditacion(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA DE HISTORIAL Y BITÁCORA DE AJUSTE DE FECHAS (Prórrogas)
CREATE TABLE IF NOT EXISTS historial_fechas_cumplimiento (
id INT AUTO_INCREMENT PRIMARY KEY,
plan_id INT NOT NULL,
usuario_id INT NOT NULL,
fecha_anterior DATE NOT NULL,
fecha_nueva DATE NOT NULL,
motivo_acuerdo TEXT NOT NULL,
fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_historial_plan FOREIGN KEY (plan_id) REFERENCES planes_mejora(id) ON DELETE CASCADE,
CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA DE TICKETS DE ATENCIÓN DE PROCESO
CREATE TABLE IF NOT EXISTS tickets_proceso (
id INT AUTO_INCREMENT PRIMARY KEY,
licenciatura_id INT NOT NULL,
usuario_id INT NOT NULL,
tipo ENUM('PRORROGA_FECHA', 'DUDA_PROCEDIMIENTO', 'ACLARACION_OBSERVACION') NOT NULL,
asunto VARCHAR(255) NOT NULL,
descripcion TEXT NOT NULL,
respuesta_planeacion TEXT NULL,
estatus ENUM('ABIERTO', 'RESUELTO') DEFAULT 'ABIERTO',
fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_ticket_licenciatura FOREIGN KEY (licenciatura_id) REFERENCES licenciaturas(id) ON DELETE CASCADE,
CONSTRAINT fk_ticket_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DATOS INICIALES DE SEMBRADO (SEEDING)
-- =============================================================================

-- Carga inicial de las 19 Licenciaturas de la FES Acatlán
INSERT INTO licenciaturas (nombre) VALUES
('Actuaría'),
('Arquitectura'),
('Ciencias Políticas y Administración Pública'),
('Comunicación'),
('Derecho'),
('Diseño Gráfico'),
('Economía'),
('Enseñanza de Alemán como Lengua Extranjera'),
('Enseñanza de Español como Lengua Extranjera'),
('Enseñanza de Francés como Lengua Extranjera'),
('Enseñanza de Inglés como Lengua Extranjera'),
('Enseñanza de Italiano como Lengua Extranjera'),
('Filosofía'),
('Historia'),
('Ingeniería Civil'),
('Lengua y Literaturas Hispánicas'),
('Matemáticas Aplicadas y Computación'),
('Pedagogía'),
('Relaciones Internacionales'),
('Sociología')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Carga del Ciclo de Acreditación inicial
INSERT INTO ciclos_acreditacion (nombre, anio_inicio, anio_fin, activo) VALUES
('Ciclo de Acreditación 2024-2028', 2024, 2028, TRUE)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Carga de usuarios base para pruebas y despliegue inicial
INSERT INTO usuarios (nombre, email, rol, licenciatura_id) VALUES
('Administrador General Planeación', 'admin.planeacion@pcpuma.acatlan.unam.mx', 'ADMINISTRADOR', NULL),
('Revisor Unidad de Planeación', 'revisor.acreditacion@pcpuma.acatlan.unam.mx', 'PLANEADOR', NULL),
('Jefatura de Carrera MAC', 'jefatura.mac@pcpuma.acatlan.unam.mx', 'JEFATURA', 17)
ON DUPLICATE KEY UPDATE email=VALUES(email);
