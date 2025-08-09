const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config({ path: __dirname + '/.env' });

// Crear archivo credenciales.json si no existe, usando variable de entorno codificada en base64
const credFilePath = path.resolve(__dirname, 'credenciales.json');
if (!fs.existsSync(credFilePath)) {
  if (!process.env.GOOGLE_CREDENTIALS_B64) {
    console.error('❌ Error: La variable de entorno GOOGLE_CREDENTIALS_B64 no está definida.');
    process.exit(1);
  }
  const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
  fs.writeFileSync(credFilePath, credentialsJson);
  console.log('✅ Archivo credenciales.json creado desde variable de entorno.');
}

// AUTENTICACIÓN GOOGLE SHEETS
const auth = new google.auth.GoogleAuth({
  keyFile: credFilePath, // Cambiamos para usar la ruta del archivo creado
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = process.env.SHEET_ID; // <---- Cambia esto

// Función para limpiar texto y forzar UTF-8
function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Guardar en Google Sheets
async function guardarEnGoogleSheets(oferta) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 1. Leer columna A para contar filas ocupadas (suponiendo que ahí siempre hay dato si la fila está ocupada)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Hoja 2!A:A',
  });

  const filasOcupadas = response.data.values ? response.data.values.length : 0;
  const filaSiguiente = filasOcupadas + 1; // La próxima fila vacía

  // 2. Escribir en la fila siguiente sin borrar nada
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Hoja 2!A${filaSiguiente}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[oferta.link, oferta.titulo, oferta.textoCompleto]],
    },
  });

  console.log(`✅ Oferta guardada en fila ${filaSiguiente}: ${oferta.titulo}`);
}

async function ofertasComputrabajo() {
  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({ headless: true, slowMo: 50 }); // modo headless para producción
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  const urlBusqueda = 'https://co.computrabajo.com/trabajo-de-desarrollador-en-bogota-dc?pubdate=1';
  console.log(`Abriendo página: ${urlBusqueda}`);
  await page.goto(urlBusqueda, { waitUntil: 'networkidle2' });

  console.log('Esperando 5 segundos...');
  await sleep(5000);

  try {
    const botonCookiesSelector = 'button[data-cookiebanner="acceptbutton"]';
    await page.waitForSelector(botonCookiesSelector, { timeout: 5000 });
    await page.click(botonCookiesSelector);
    console.log('✅ Cookies aceptadas');
    await page.waitForTimeout(2000);
  } catch {
    console.log('ℹ️ No fue necesario cerrar cookies');
  }

  console.log('Esperando selector .box_offer...');
  await page.waitForSelector('.box_offer', { timeout: 60000 });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.box_offer .js-o-link'))
      .slice(0, 20)
      .map(a => a.href);
  });

  console.log(`🔗 Ofertas encontradas: ${links.length}`);

  for (const link of links) {
    console.log(`📄 Abriendo oferta: ${link}`);
    let ofertaPage;
    try {
      ofertaPage = await browser.newPage();
      await ofertaPage.goto(link, { waitUntil: 'networkidle2' });

      await sleep(1000);

      const detalle = await ofertaPage.evaluate(() => {
        const titulo = document.querySelector('h1.fwB.fs24.mb5.box_detail')?.innerText || '';
        const descripcion = document.querySelector('div.mb40.pb40.bb1[div-link="oferta"]')?.innerText || '';
        return { titulo, textoCompleto: descripcion, link: window.location.href };
      });

      detalle.titulo = limpiarTexto(detalle.titulo);
      detalle.textoCompleto = limpiarTexto(detalle.textoCompleto);

      if (!detalle.titulo) {
        console.log('⚠️ Título vacío, se omite esta oferta.');
      } else {
        await guardarEnGoogleSheets(detalle); // GUARDAR EN GOOGLE SHEETS
      }
    } catch (error) {
      console.error(`❌ Error procesando oferta ${link}:`, error);
    } finally {
      if (ofertaPage) await ofertaPage.close();
    }
  }

  await browser.close();
  console.log('✅ Scraping finalizado');
}

cron.schedule('1 2 * * *', () => {
  console.log('Ejecutando scraping programado a las 12:00 PM');
  ofertasComputrabajo();
});

