Computrabajo Scraper
Este proyecto es un scraper que extrae automáticamente las 20 primeras ofertas de empleo de la página de Computrabajo para desarrolladores en Bogotá. Los datos se guardan en una hoja de Google Sheets para facilitar su seguimiento y análisis.

Funcionalidad
Navega a la página de búsqueda de empleos en Computtrabajo.

Acepta la política de cookies automáticamente (si aparece).

Extrae los enlaces de las primeras 20 ofertas de empleo.

Para cada oferta, abre la página y obtiene el título y la descripción completa.

Limpia y formatea el texto para evitar errores de codificación.

Guarda cada oferta en una fila nueva en Google Sheets, sin sobreescribir datos previos.

Registra en consola el avance y cualquier error ocurrido.

Tecnologías usadas
Node.js

Puppeteer (automatización de navegador)

Google Sheets API (para guardar datos)

dotenv (manejo de variables de entorno)

Requisitos previos
Google Cloud Console:

Crear un proyecto en Google Cloud.

Habilitar Google Sheets API.

Crear una cuenta de servicio y descargar el archivo JSON de credenciales.

Compartir tu hoja de Google Sheets con el correo de la cuenta de servicio con permisos de edición.

Google Sheets:

Crear una hoja nueva.

Obtener el ID de la hoja (en la URL, entre /d/ y /edit).

Archivo .env:

Crear un archivo .env en la raíz del proyecto con el siguiente contenido:

ini
Copiar
Editar
GOOGLE_APPLICATION_CREDENTIALS=./credenciales.json
SHEET_ID=tu_id_de_hoja_de_calculo
Archivo credenciales.json:

Colocar el archivo JSON descargado de Google Cloud en la ruta indicada en GOOGLE_APPLICATION_CREDENTIALS.

Instalación
bash
Copiar
Editar
git clone https://github.com/JonhatanCorona/computrabajo-scraper.git
cd computrabajo-scraper
npm install
Uso
Ejecutar el script con Node.js:

bash
Copiar
Editar
node index.js
El script abrirá un navegador (no oculto para fines de desarrollo), hará el scraping y guardará los datos en Google Sheets.

Consideraciones
Para producción, se recomienda cambiar Puppeteer a modo headless: true.

Asegúrate que la hoja de cálculo tenga permisos correctos para la cuenta de servicio.

El script está configurado para la búsqueda en Computrabajo para "desarrollador" en Bogotá del dia actual, pero puedes modificar la URL en el código.

Se recomienda programar la ejecución automática (por ejemplo, con cronjobs o en servicios como Railway).

Variables de entorno
Variable	Descripción
GOOGLE_APPLICATION_CREDENTIALS	Ruta al archivo JSON con credenciales de Google Cloud
SHEET_ID	ID de la hoja de cálculo de Google Sheets

Estructura del proyecto
pgsql
Copiar
Editar
computrabajo-scraper/
├──.env
├── credenciales.json
├── ofertasComputrabajox.js
├── package-lock.json
├── package.json
└── README.md