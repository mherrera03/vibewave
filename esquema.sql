CREATE TABLE IF NOT EXISTS canciones (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    artista VARCHAR(150) NOT NULL,
    album VARCHAR(150),
    genero VARCHAR(80),
    duracion_segundos INTEGER NOT NULL
        CHECK (duracion_segundos > 0),
    portada_url TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_canciones_titulo
ON canciones (titulo);

CREATE INDEX IF NOT EXISTS idx_canciones_artista
ON canciones (artista);
