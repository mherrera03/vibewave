const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'vibewave_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function validarCancion(datos) {
  const titulo = String(datos.titulo || '').trim();
  const artista = String(datos.artista || '').trim();
  const album = String(datos.album || '').trim();
  const genero = String(datos.genero || '').trim();
  const portada_url = String(datos.portada_url || '').trim();
  const duracion_segundos = Number(datos.duracion_segundos);

  if (!titulo || titulo.length > 150 ||
      !artista || artista.length > 150 ||
      album.length > 150 || genero.length > 80 ||
      !Number.isSafeInteger(duracion_segundos) ||
      duracion_segundos <= 0 || duracion_segundos > 86400) {
    return { error: 'Verifica los datos de la canción.' };
  }

  if (portada_url) {
    try {
      const url = new URL(portada_url);
      if (!['https:', 'http:'].includes(url.protocol)) {
        return { error: 'La portada debe ser una URL HTTP o HTTPS.' };
      }
    } catch {
      return { error: 'La URL de la portada no es válida.' };
    }
  }

  return {
    titulo, artista, album, genero,
    portada_url, duracion_segundos
  };
}

app.get('/api/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', aplicacion: 'VibeWave', base_datos: 'conectada' });
  } catch {
    res.status(503).json({ error: 'Base de datos no disponible' });
  }
});

app.get('/api/canciones', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM canciones ORDER BY id DESC'
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron consultar las canciones.' });
  }
});

app.post('/api/canciones', async (req, res) => {
  const datos = validarCancion(req.body);
  if (datos.error) return res.status(400).json(datos);

  try {
    const { rows } = await pool.query(
      `INSERT INTO canciones
       (titulo, artista, album, genero, duracion_segundos, portada_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        datos.titulo, datos.artista, datos.album || null,
        datos.genero || null, datos.duracion_segundos,
        datos.portada_url || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: 'No se pudo registrar la canción.' });
  }
});

app.put('/api/canciones/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'ID no válido.' });
  }

  const datos = validarCancion(req.body);
  if (datos.error) return res.status(400).json(datos);

  try {
    const { rows } = await pool.query(
      `UPDATE canciones
       SET titulo=$1, artista=$2, album=$3, genero=$4,
           duracion_segundos=$5, portada_url=$6
       WHERE id=$7 RETURNING *`,
      [
        datos.titulo, datos.artista, datos.album || null,
        datos.genero || null, datos.duracion_segundos,
        datos.portada_url || null, id
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Canción no encontrada.' });
    }

    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la canción.' });
  }
});

app.delete('/api/canciones/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'ID no válido.' });
  }

  try {
    const resultado = await pool.query(
      'DELETE FROM canciones WHERE id=$1 RETURNING id',
      [id]
    );

    if (!resultado.rowCount) {
      return res.status(404).json({ error: 'Canción no encontrada.' });
    }

    res.json({ mensaje: 'Canción eliminada correctamente.' });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar la canción.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VibeWave disponible en el puerto ${PORT}`);
});
