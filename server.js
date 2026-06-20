const express = require('express');
const mysql   = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = mysql.createPool({
  host    : process.env.MYSQLHOST,
  port    : parseInt(process.env.MYSQLPORT || '3306'),
  user    : process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS gps_data (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        device_id   VARCHAR(50)  NOT NULL,
        latitude    DOUBLE       NOT NULL,
        longitude   DOUBLE       NOT NULL,
        altitude    DOUBLE       DEFAULT 0,
        speed       DOUBLE       DEFAULT 0,
        satellites  INT          DEFAULT 0,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla gps_data lista.');
  } finally {
    conn.release();
  }
}

async function conectarConReintentos(intentos = 5) {
  for (let i = 0; i < intentos; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('DB conectada');
      return;
    } catch (err) {
      console.log(`Reintento ${i + 1}/${intentos}... (${err.message})`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('No se pudo conectar a la DB tras varios intentos');
}

app.post('/gps', async (req, res) => {
  const { device_id, latitude, longitude, altitude, speed, satellites } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Faltan latitude y longitude' });
  }

  console.log(`[${device_id}] lat=${latitude}, lng=${longitude}, alt=${altitude}m, vel=${speed}km/h, sats=${satellites}`);

  try {
    const [result] = await pool.execute(
      `INSERT INTO gps_data (device_id, latitude, longitude, altitude, speed, satellites)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [device_id || 'UNKNOWN', latitude, longitude, altitude || 0, speed || 0, satellites || 0]
    );
    res.status(201).json({ message: 'Guardado', insertedId: result.insertId });
  } catch (err) {
    console.error('Error DB:', err.message);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

// GET /gps → Últimos 100 registros
app.get('/gps', async (req, res) => {
  const limit     = parseInt(req.query.limit || '100');
  const device_id = req.query.device_id || null;

  try {
    let query  = 'SELECT * FROM gps_data';
    let params = [];

    if (device_id) {
      query += ' WHERE device_id = ?';
      params.push(device_id);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.execute(query, params);
    res.json({ total: rows.length, data: rows });
  } catch (err) {
    console.error('Error DB:', err.message);
    res.status(500).json({ error: 'Error al consultar' });
  }
});

// GET /health → Estado del servidor
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'conectada', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', database: err.message });
  }
});

async function main() {
  try {
    console.log('Conectando a MySQL de Railway...');
    await conectarConReintentos();
    await initDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar:', err.message);
    process.exit(1);
  }
}

main();
