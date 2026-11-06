CREATE DATABASE IF NOT EXISTS orvant_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE orvant_db;

CREATE TABLE IF NOT EXISTS roles (
    id_rol      INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
    id_rol         INT NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    activo         BOOLEAN  DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso  DATETIME,

    INDEX idx_usuarios_rol (id_rol),
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carreras (
    id_carrera     INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    clave          VARCHAR(20) UNIQUE,
    estado         ENUM('matriculada','en_proceso','inactiva') DEFAULT 'en_proceso',
    modalidad      VARCHAR(50),
    nivel          VARCHAR(50),
    coordinador    VARCHAR(150),
    plazo_dias     INT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas          VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expedientes (
    id_expediente   INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT NOT NULL,
    id_carrera      INT NOT NULL,
    estado          ENUM('pendiente','en_proceso','en_revision','completado','rechazado') DEFAULT 'pendiente',
    fecha_inicio    DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_limite    DATETIME,
    fecha_completado DATETIME,

    UNIQUE KEY uk_usuario_carrera (id_usuario, id_carrera),
    INDEX idx_exp_carrera (id_carrera),
    CONSTRAINT fk_exp_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_exp_carrera FOREIGN KEY (id_carrera) REFERENCES carreras(id_carrera) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campos (
    id_campo    INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    orden       INT DEFAULT 0,
    tipo        ENUM('texto','fecha','archivo','seleccion') DEFAULT 'texto',
    requerido   BOOLEAN DEFAULT TRUE,
    activo      BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS avances (
    id_avance           INT AUTO_INCREMENT PRIMARY KEY,
    id_expediente       INT NOT NULL,
    id_campo            INT NOT NULL,
    estado              ENUM('pendiente','enviado','aceptado','devuelto') DEFAULT 'pendiente',
    valor_texto         TEXT,
    fecha_envio         DATETIME,
    fecha_revision      DATETIME,
    id_revisor          INT,
    comentario_revision VARCHAR(255),

    UNIQUE KEY uk_exp_campo (id_expediente, id_campo),
    CONSTRAINT fk_av_exp FOREIGN KEY (id_expediente) REFERENCES expedientes(id_expediente) ON DELETE CASCADE,
    CONSTRAINT fk_av_campo FOREIGN KEY (id_campo) REFERENCES campos(id_campo) ON DELETE RESTRICT,
    CONSTRAINT fk_av_revisor FOREIGN KEY (id_revisor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documentos (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    id_avance    INT NOT NULL,
    id_usuario   INT NOT NULL,
    nombre       VARCHAR(200) NOT NULL,
    ruta         VARCHAR(500),
    url_externa  VARCHAR(500),
    tipo_mime    VARCHAR(100),
    tamano_bytes BIGINT,
    version      INT DEFAULT 1,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_doc_av FOREIGN KEY (id_avance) REFERENCES avances(id_avance) ON DELETE CASCADE,
    CONSTRAINT fk_doc_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tickets (
    id_ticket            INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario           INT NOT NULL,
    id_expediente        INT,
    asunto               VARCHAR(200) NOT NULL,
    descripcion          TEXT NOT NULL,
    estado               ENUM('abierto','en_revision','resuelto','cerrado') DEFAULT 'abierto',
    prioridad            ENUM('baja','media','alta') DEFAULT 'media',
    id_asignado          INT,
    fecha_creacion       DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_ticket_estado (estado),
    CONSTRAINT fk_ticket_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_exp FOREIGN KEY (id_expediente) REFERENCES expedientes(id_expediente) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_asignado FOREIGN KEY (id_asignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_mensajes (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    id_ticket  INT NOT NULL,
    id_usuario INT NOT NULL,
    contenido  TEXT NOT NULL,
    fecha      DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_msg_ticket FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    CONSTRAINT fk_msg_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Vista para calcular el porcentaje de avance de cada expediente

CREATE OR REPLACE VIEW v_avance_expediente AS
SELECT
    e.id_expediente,
    e.id_usuario,
    e.id_carrera,
    e.estado,
    COUNT(a.id_avance) AS total_campos,
    SUM(CASE WHEN a.estado = 'aceptado' THEN 1 ELSE 0 END) AS campos_aceptados,
    ROUND(
        COALESCE(SUM(CASE WHEN a.estado = 'aceptado' THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(a.id_avance), 0), 0)
    , 0) AS porcentaje
FROM expedientes e
LEFT JOIN avances a ON a.id_expediente = e.id_expediente
GROUP BY e.id_expediente, e.id_usuario, e.id_carrera, e.estado;

-- Datos iniciales

INSERT INTO roles (nombre, descripcion) VALUES
    ('admin',      'Acceso total al sistema'),
    ('revisor',    'Acepta, modifica y devuelve documentos; atiende tickets del proceso'),
    ('capturista', 'Captura información y sube documentos de su expediente');

INSERT INTO carreras (nombre, estado) VALUES
    ('Carrera 01', 'matriculada'),
    ('Carrera 02', 'matriculada'),
    ('Carrera 03', 'matriculada'),
    ('Carrera 04', 'matriculada'),
    ('Carrera 05', 'matriculada'),
    ('Carrera 06', 'matriculada'),
    ('Carrera 07', 'matriculada'),
    ('Carrera 08', 'matriculada'),
    ('Carrera 09', 'matriculada'),
    ('Carrera 10', 'matriculada'),
    ('Carrera 11', 'matriculada'),
    ('Carrera 12', 'matriculada'),
    ('Carrera 13', 'matriculada'),
    ('Carrera 14', 'matriculada'),
    ('Carrera 15', 'matriculada'),
    ('Carrera 16', 'matriculada'),
    ('Carrera 17', 'matriculada'),
    ('Carrera 18', 'matriculada'),
    ('Carrera 19', 'matriculada'),
    ('Carrera 20', 'en_proceso');

INSERT INTO campos (nombre, orden, tipo, requerido) VALUES
    ('Tarea 01', 1,  'texto',   TRUE),
    ('Tarea 02', 2,  'texto',   TRUE),
    ('Tarea 03', 3,  'texto',   TRUE),
    ('Tarea 04', 4,  'archivo', TRUE),
    ('Tarea 05', 5,  'archivo', TRUE),
    ('Tarea 06', 6,  'archivo', TRUE),
    ('Tarea 07', 7,  'archivo', TRUE),
    ('Tarea 08', 8,  'archivo', TRUE),
    ('Tarea 09', 9,  'texto',   FALSE),
    ('Tarea 10', 10, 'archivo', TRUE),
    ('Tarea 11', 11, 'fecha',   FALSE),
    ('Tarea 12', 12, 'texto',   FALSE);

INSERT INTO usuarios (id_rol, nombre, email, password_hash)
SELECT id_rol, 'Administrador', 'admin@orvant.local', '<hash_generado_por_backend>'
FROM roles WHERE nombre = 'admin';

INSERT INTO usuarios (id_rol, nombre, email, password_hash)
SELECT id_rol, 'Colaborador 01', 'col01@orvant.local', '<hash_generado_por_backend>'
FROM roles WHERE nombre = 'capturista';

INSERT INTO usuarios (id_rol, nombre, email, password_hash)
SELECT id_rol, 'Colaborador 02', 'col02@orvant.local', '<hash_generado_por_backend>'
FROM roles WHERE nombre = 'capturista';
