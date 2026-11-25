USE mejora_continua_acatlan;

CREATE TABLE IF NOT EXISTS cambios_correo_admin (
  usuario_id INT PRIMARY KEY,
  email_nuevo VARCHAR(150) NOT NULL UNIQUE,
  codigo_otp VARCHAR(6) NOT NULL,
  expira_en DATETIME NOT NULL,
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cambio_correo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recordatorios_semanales (
  usuario_id INT NOT NULL,
  semana DATE NOT NULL,
  enviado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, semana),
  CONSTRAINT fk_recordatorio_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
