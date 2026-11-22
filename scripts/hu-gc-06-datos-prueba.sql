-- =====================================================================
-- HU-GC-06 · Datos de prueba para "Gestionar partidos" y el correo
-- a aficionados de partidos anteriores.
--
-- Ejecutar sobre la BD de ms-business DESPUÉS de `npm run migration:run`.
-- Es re-ejecutable: primero borra lo que haya creado antes (ids fijos).
--
-- ANTES DE EJECUTAR: cambia el correo de la línea @correo_aficionado por el
-- de un usuario que exista en ms-security (security_f_ms_db.users). A ese
-- correo llegará el aviso. Si tu BD de security tiene otro nombre, ajústalo
-- también en la consulta de @user_id.
-- =====================================================================

USE ligahub_db;
-- Misma collation que las tablas: evita "Illegal mix of collations" con las variables.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET @correo_aficionado = 'tu_correo@ejemplo.com';
SET @user_id = (SELECT id FROM security_f_ms_db.users WHERE email = @correo_aficionado);

-- Ids fijos (formato UUID v4) para poder limpiar y reconocer los datos.
SET @deporte   = '0b6f0c00-0000-4000-8000-000000000001';
SET @torneo    = '0b6f0c00-0000-4000-8000-000000000002';
SET @fase      = '0b6f0c00-0000-4000-8000-000000000003';
SET @grupo     = '0b6f0c00-0000-4000-8000-000000000004';
SET @eq_once   = '0b6f0c00-0000-4000-8000-000000000011';
SET @eq_mzl    = '0b6f0c00-0000-4000-8000-000000000012';
SET @eq_per    = '0b6f0c00-0000-4000-8000-000000000013';
SET @eq_inact  = '0b6f0c00-0000-4000-8000-000000000014';
SET @escenario = '0b6f0c00-0000-4000-8000-000000000021';
SET @esc_torn  = '0b6f0c00-0000-4000-8000-000000000022';
SET @localidad = '0b6f0c00-0000-4000-8000-000000000023';
SET @partido0  = '0b6f0c00-0000-4000-8000-000000000031';
SET @aficion   = '0b6f0c00-0000-4000-8000-000000000041';
SET @boleta    = '0b6f0c00-0000-4000-8000-000000000051';

-- ---------------------------------------------------------------------
-- 1. Limpieza de una ejecución anterior (orden inverso a las FKs)
-- ---------------------------------------------------------------------
DELETE FROM boletas  WHERE partido_id IN (SELECT id FROM (SELECT id FROM partidos WHERE fase_id = @fase) p);
DELETE FROM apuestas WHERE partido_id IN (SELECT id FROM (SELECT id FROM partidos WHERE fase_id = @fase) p);
DELETE FROM anotaciones WHERE partido_id IN (SELECT id FROM (SELECT id FROM partidos WHERE fase_id = @fase) p);
DELETE FROM partidos WHERE fase_id = @fase;
DELETE FROM aficionados WHERE id = @aficion;
DELETE FROM localidades WHERE id = @localidad;
DELETE FROM escenarios_torneo WHERE id = @esc_torn;
DELETE FROM escenarios WHERE id = @escenario;
DELETE FROM inscripciones WHERE torneo_id = @torneo;
DELETE FROM aficionados_equipos WHERE equipo_id IN (@eq_once, @eq_mzl, @eq_per, @eq_inact);
DELETE FROM equipos WHERE id IN (@eq_once, @eq_mzl, @eq_per, @eq_inact);
DELETE FROM fases_grupos WHERE id = @grupo;
DELETE FROM fases WHERE id = @fase;
DELETE FROM torneos WHERE id = @torneo;
DELETE FROM deportes WHERE id = @deporte;

-- ---------------------------------------------------------------------
-- 2. Torneo en curso con una fase de grupos abierta
-- ---------------------------------------------------------------------
INSERT INTO deportes (id, nombre, descripcion)
VALUES (@deporte, 'Fútbol HU06', 'Deporte de prueba HU-GC-06');

INSERT INTO torneos (id, nombre, descripcion, estado, max_equipos, deporte_id, activo)
VALUES (@torneo, 'Copa Caldas HU06', 'Torneo de prueba HU-GC-06', 'EN_CURSO', 8, @deporte, 1);

INSERT INTO fases (id, numero_orden, fecha_inicio, fecha_fin, estado, torneo_id)
VALUES (@fase, 1, '2026-10-01', '2027-01-31', 'EN_CURSO', @torneo);

INSERT INTO fases_grupos (id, nombre, fase_id, cupo_equipos)
VALUES (@grupo, 'Grupo A HU06', @fase, 4);

-- ---------------------------------------------------------------------
-- 3. Equipos del grupo con inscripción ACEPTADA (uno inactivo para probar)
-- ---------------------------------------------------------------------
INSERT INTO equipos (id, nombre, fase_grupos_id, activo) VALUES
  (@eq_once,  'Once Caldas HU06',  @grupo, 1),
  (@eq_mzl,   'Manizales FC HU06', @grupo, 1),
  (@eq_per,   'Pereira HU06',      @grupo, 1),
  (@eq_inact, 'Inactivo HU06',     @grupo, 0);

INSERT INTO inscripciones (id, fecha_inscripcion, estado, equipo_id, torneo_id) VALUES
  (UUID(), '2026-09-15', 'ACEPTADA', @eq_once,  @torneo),
  (UUID(), '2026-09-15', 'ACEPTADA', @eq_mzl,   @torneo),
  (UUID(), '2026-09-15', 'ACEPTADA', @eq_per,   @torneo),
  (UUID(), '2026-09-15', 'ACEPTADA', @eq_inact, @torneo);

-- ---------------------------------------------------------------------
-- 4. Escenario asignado al torneo y una localidad de ese escenario
-- ---------------------------------------------------------------------
INSERT INTO escenarios (id, nombre, direccion, capacidad)
VALUES (@escenario, 'Estadio Palogrande HU06', 'Cra 23 # 70-50, Manizales', 36000);

INSERT INTO escenarios_torneo (id, fecha_asignacion, estado, escenario_id, torneo_id)
VALUES (@esc_torn, '2026-09-20', 'ACTIVO', @escenario, @torneo);

INSERT INTO localidades (id, nombre, capacidad, precio, escenario_id)
VALUES (@localidad, 'Oriental', 5000, 30000.00, @escenario);

-- ---------------------------------------------------------------------
-- 5. Partido ANTERIOR (ya jugado): Once Caldas vs Pereira
-- ---------------------------------------------------------------------
INSERT INTO partidos (id, fecha_hora, estado, equipo_local_id, equipo_visitante_id,
                      goles_local, goles_visitante, escenario_id, fase_id)
VALUES (@partido0, '2026-11-01 19:00:00', 'FINALIZADO', @eq_once, @eq_per,
        2, 1, @escenario, @fase);

-- ---------------------------------------------------------------------
-- 6. Aficionado ligado al usuario de security + boleta del partido anterior
--    Si ese usuario ya era aficionado (HU-GE-05) se reutiliza su registro.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO aficionados (id, user_id, nombre, documento, email, telefono)
VALUES (@aficion, @user_id, 'Aficionado HU06', 'HU06-0001', @correo_aficionado, NULL);

SET @aficionado_id = COALESCE(
  (SELECT id FROM aficionados WHERE user_id = @user_id LIMIT 1),
  (SELECT id FROM aficionados WHERE email = @correo_aficionado LIMIT 1),
  @aficion
);

INSERT INTO boletas (id, precio, estado, aficionado_id, partido_id, localidad_id)
VALUES (@boleta, 30000.00, 'USADA', @aficionado_id, @partido0, @localidad);

-- ---------------------------------------------------------------------
-- 7. Verificación: debe mostrar 1 fila con el correo que recibirá el aviso
-- ---------------------------------------------------------------------
SELECT a.id AS aficionado_id, a.user_id, a.email AS email_business,
       u.email AS email_security, b.id AS boleta_id, p.estado AS partido_anterior
FROM boletas b
JOIN aficionados a ON a.id = b.aficionado_id
JOIN partidos p ON p.id = b.partido_id
LEFT JOIN security_f_ms_db.users u ON u.id = a.user_id
WHERE b.id = @boleta;
