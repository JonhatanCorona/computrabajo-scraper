const puppeteer = require('puppeteer-core');
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/.env' });

// Decodificar las credenciales base64 desde la variable de entorno
const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8'));

// AUTENTICACIÓN GOOGLE SHEETS
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const client = await auth.getClient();

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
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 1. Leer columna A para contar filas ocupadas
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Hoja 2!A:A',
  });

  const filasOcupadas = response.data.values ? response.data.values.length : 0;
  const filaSiguiente = filasOcupadas + 1;

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

  const browser = await puppeteer.launch({
  executablePath: process.env.GOOGLE_CHROME_BIN || '/app/.chrome-for-testing/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  headless: 'new', // cambiar a false
  slowMo: 50,
});

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
  'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
});

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
  try {
    await page.goto(link, { waitUntil: 'networkidle2' });
    await sleep(2000); // espera un poco más

    const detalle = await page.evaluate(() => {
      const tituloElem = document.querySelector('h1.fwB.fs24.mb5.box_detail');
      const descripcionElem = document.querySelector('div.mb40.pb40.bb1[div-link="oferta"]');

      return {
        tituloEncontrado: !!tituloElem,
        tituloTexto: tituloElem ? tituloElem.innerText : null,
        descripcionEncontrada: !!descripcionElem,
        descripcionTexto: descripcionElem ? descripcionElem.innerText : null,
        link: window.location.href
      };
    });

    console.log('DEBUG detalle scrapeado:', detalle);

    if (!detalle.tituloTexto) {
      // Para entender si el selector falló o el contenido es vacío
      const htmlParcial = await ofertaPage.content();
      console.log('HTML parcial oferta (primeros 1000 caracteres):', htmlParcial.slice(0, 1000));
      console.log('⚠️ Título vacío o selector no encontrado, se omite esta oferta.');
      continue;
    }

    const oferta = {
      titulo: limpiarTexto(detalle.tituloTexto),
      textoCompleto: limpiarTexto(detalle.descripcionTexto),
      link: detalle.link,
    };

    await guardarEnGoogleSheets(oferta);

  } catch (error) {
    console.error(`❌ Error procesando oferta ${link}:`, error);
  } finally {
    if (ofertaPage) await ofertaPage.close();
  }
}
  await browser.close();
  console.log('✅ Scraping finalizado');
}

module.exports = ofertasComputrabajo;
