const ofertasComputrabajo = require('./ofertasComputrabajo');

(async () => {
  try {
    await ofertasComputrabajo();
  } catch (error) {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  }
})()