  } catch (err) {
    console.error('Error al consultar DB:', err.message);
    res.status(500).json({ error: 'Error interno al consultar datos' });
  }
});

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
    console.log('Conectando a TiDB Cloud...');
    await initDB();
    app.listen(PORT, () => {
      console.log(`   Servidor escuchando en http://localhost:${PORT}`);
      console.log(`   POST http://localhost:${PORT}/gps   ← ESP32 envía aquí`);
      console.log(`   GET  http://localhost:${PORT}/gps   ← Consulta registros`);
      console.log(`   GET  http://localhost:${PORT}/health ← Estado del servidor`);
    });
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
}

main();
