const express = require('express');
const mysql   = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

console.log('Variables de entorno:');
console.log('HOST:', process.env.MYSQLHOST);
console.log('PORT:', process.env.MYSQLPORT);
console.log('USER:', process.env.MYSQLUSER);
console.log('DB:',   process.env.MYSQLDATABASE);

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

// Ensure the gps_data table exists before accepting requests
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_data (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        device_id  VARCHAR(64)    NOT NULL,
        latitude   DECIMAL(10,7)  NOT NULL,
        longitude  DECIMAL(10,7)  NOT NULL,
        altitude   FLOAT          NOT NULL,
        speed      FLOAT          NOT NULL,
        satellites TINYINT UNSIGNED NOT NULL,
        timestamp  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_device_id (device_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla gps_data lista');
  } catch (err) {
    console.error('Error al crear tabla gps_data:', err.message);
    process.exit(1);
  }
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/gps', async (req, res) => {
  const { device_id, latitude, longitude, altitude, speed, satellites } = req.body;

  // Validate that all required fields are present
  if (
    device_id  === undefined ||
    latitude   === undefined ||
    longitude  === undefined ||
    altitude   === undefined ||
    speed      === undefined ||
    satellites === undefined
  ) {
    console.warn('Petición /gps rechazada — campos faltantes:', req.body);
    return res.status(400).json({ error: 'Faltan campos requeridos: device_id, latitude, longitude, altitude, speed, satellites' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO gps_data (device_id, latitude, longitude, altitude, speed, satellites)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [device_id, latitude, longitude, altitude, speed, satellites]
    );

    console.log(`GPS recibido — device: ${device_id}, lat: ${latitude}, lon: ${longitude}, id: ${result.insertId}`);
    return res.status(201).json({ message: 'Datos GPS almacenados', id: result.insertId });
  } catch (err) {
    console.error('Error al insertar datos GPS:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
  });
});
