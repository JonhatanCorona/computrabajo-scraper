const ofertasComputrabajo = require('./ofertasComputrabajo');

(async () => {
  try {
    await ofertasComputrabajo();
  } catch (error) {
    console.error('Error ejecutando scraping:', error);
    process.exit(1);
  }
})();
