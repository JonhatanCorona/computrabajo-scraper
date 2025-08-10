// ofertasComputrabajo.js

const puppeteer = require('puppeteer-core');
const { google } = require('googleapis');
require('dotenv').config();

function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function guardarEnGoogleSheets(oferta, client) {
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Hoja 2!A:A',
  });

  const filasOcupadas = response.data.values ? response.data.values.length : 0;
  const filaSiguiente = filasOcupadas + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `Hoja 2!A${filaSiguiente}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[oferta.link, oferta.titulo, oferta.textoCompleto]],
    },
  });

  console.log(`✅ Oferta guardada en fila ${filaSiguiente}: ${oferta.titulo}`);
}

async function ofertasComputrabajo() {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();

  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    executablePath: process.env.GOOGLE_CHROME_BIN || '/app/.chrome-for-testing/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: 'new',
    slowMo: 50,
  });

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

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

  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.box_offer .js-o-link'))
      .slice(0, 20)
      .map(a => a.href)
  );

  console.log(`🔗 Ofertas encontradas: ${links.length}`);

  for (const link of links) {
    console.log(`📄 Abriendo oferta: ${link}`);
    try {
      await page.goto(link, { waitUntil: 'networkidle2' });
      await sleep(2000);

      const detalle = await page.evaluate(() => {
        const tituloElem = document.querySelector('h1.fwB.fs24.mb5.box_detail');
        const descripcionElem = document.querySelector('div.mb40.pb40.bb1[div-link="oferta"]');

        return {
          tituloEncontrado: !!tituloElem,
          tituloTexto: tituloElem ? tituloElem.innerText : null,
          descripcionEncontrada: !!descripcionElem,
          descripcionTexto: descripcionElem ? descripcionElem.innerText : null,
          link: window.location.href,
        };
      });

      if (!detalle.tituloTexto) {
        console.log('⚠️ Título vacío o selector no encontrado, se omite esta oferta.');
        continue;
      }

      const oferta = {
        titulo: limpiarTexto(detalle.tituloTexto),
        textoCompleto: limpiarTexto(detalle.descripcionTexto),
        link: detalle.link,
      };

      await guardarEnGoogleSheets(oferta, client);
    } catch (error) {
      console.error(`❌ Error procesando oferta ${link}:`, error);
    }
  }

  await browser.close();
  console.log('✅ Scraping finalizado');
}

// Exportamos la función para que puedas llamarla desde otro lado
module.exports = ofertasComputrabajo;

// Y si este archivo se ejecuta directamente, corre la función
if (require.main === module) {
  ofertasComputrabajo().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
