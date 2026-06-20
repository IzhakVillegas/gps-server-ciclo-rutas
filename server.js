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

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
