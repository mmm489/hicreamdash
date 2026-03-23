/**
 * download-tpv.js
 * Descarrega automàticament l'informe "Articles Venda" del BDP BackOffice
 * i el puja a la base de dades Neon Postgres.
 *
 * Us: node scripts/download-tpv.js [YYYY-MM-DD]
 *   - Si no es passa data, usa el dia d'avui
 *   - Exemples: node scripts/download-tpv.js 2026-03-18
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

// Config
const SC = 'KysydnZVS2xmRXBzUWZaUXd6YTRjYjlJMWJ6Y1o2SkpHaTVkQS96YnVTNGZ4d01HUnNLN2tKcFc2enZnRUN5a1NIN2k5dnMzZEF5QUx5NnpLZlo3OFVoT3hQOWhXbTJkU3BaZlMwTGxYQ2kyZS9ZR25NeFFBSkIwclRUcHFWd3g3TmowRFN2T2RuWg==_SENJaVRGZ2tKK1N_bjlKRG5IMHZnVmNCTlU5cjl4blFUMGxDbnhVMXBXZkxuY3RVcW5NdWlNUVBtKy9aRkRwbWxBQzd5M0VVYmNBSFdETUhocWZRbTJiNG1tZ3JYKzcvNVlHVElHYzN_SWJvMmI2dmd_MFB_P';
const BASE_URL = 'https://backoffice.bdpcenter.com';
const EMPLOYEE_CODE = '1';
const EMPLOYEE_PASS = '4593';
const GOOGLE_EMAIL = 'hicreemsalou@gmail.com';
const DB_URL = 'postgresql://neondb_owner:npg_maD7kv1EMRAB@ep-raspy-hall-am174jnc-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const DOWNLOAD_DIR = path.join(__dirname, '..', '..', 'Vendes');
const COOKIES_FILE = path.join(__dirname, 'cookies.json');

// Get target date
const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
const [year, month, day] = targetDate.split('-');
const dateForForm = `${day}/${month}/${year}`;
console.log(`Target date: ${targetDate} (${dateForForm})`);

// Categorisation
function categorise(name) {
  const n = name.toUpperCase();
  if (/POT\s+(S|M|L|XL)\b/.test(n) && !n.includes('IOGURT')) return 'Pots Gelat';
  if (n.includes('CUCURUTXO') || n.includes('CUCURUCHO')) return 'Cucurutxos';
  if (n.includes('WAFFLE')) return 'Waffles';
  if (n.includes('CREPE')) return 'Crepes';
  if (['CAFE','CAFÈ','TALLAT','CAPUCCINO','LATTE','CORTADO','ESPRESSO'].some(k => n.includes(k))) return 'Cafeteria';
  if (n.includes('XURRO') || n.includes('CHURRO') || n.includes('XOCOLATA & XURROS')) return 'Xurros & Xocolata';
  if (n.includes('IOGURT') || n.includes('YOGURT')) return 'Iogurts';
  if (['BATUT','SMOOTHIE','FRAPPE','FRAPUCCINO','SHAKE','GRANIT'].some(k => n.includes(k))) return 'Batuts & Smoothies';
  if (['HI POP','ESTRELLA','OREO','KINDER','DOGHT','LOTUS','COOKIES','MIXTO','MEDITERRANEO','PISTACHO','CHAI','MACHA'].some(k => n.includes(k))) return 'Especialitats';
  if (['AIGUA','COCA','FANTA','7UP','NESTEA','AQUARIUS','CERVESA','TONICA','CLARA','SPRITE','ZUMO','LIMONADA','REFRESC'].some(k => n.includes(k))) return 'Begudes';
  if (['NUTELLA','TOPPING','NATA','SIROPE','EXTRA','SUPPLEMENT'].some(k => n.includes(k))) return 'Complements';
  if (n.includes('XOCOLATA')) return 'Xurros & Xocolata';
  return 'Altres';
}

async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log('Cookies saved');
}

async function loadCookies(page) {
  if (fs.existsSync(COOKIES_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE));
    await page.setCookie(...cookies);
    console.log('Cookies loaded');
    return true;
  }
  return false;
}

async function handleGoogleLogin(page) {
  console.log('Google login required...');
  // Wait for account selector
  await page.waitForSelector('div[data-email]', { timeout: 10000 }).catch(() => null);

  // Click on hicreem account
  const accounts = await page.$$('div[data-email]');
  for (const acc of accounts) {
    const email = await acc.evaluate(el => el.getAttribute('data-email'));
    if (email === GOOGLE_EMAIL) {
      await acc.click();
      console.log('Selected Google account: ' + GOOGLE_EMAIL);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
      return true;
    }
  }

  // Try clicking by text
  const clicked = await page.evaluate((email) => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.textContent?.includes(email) && el.closest('[role="link"], [data-email]')) {
        el.click();
        return true;
      }
    }
    return false;
  }, GOOGLE_EMAIL);

  if (clicked) {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
    return true;
  }

  console.log('Could not find Google account to click');
  return false;
}

async function handleEmployeeLogin(page) {
  console.log('Employee identification...');
  await page.waitForSelector('input[type="text"], input[type="number"]', { timeout: 5000 }).catch(() => null);

  // Find employee code and password fields
  const inputs = await page.$$('input:not([type="hidden"])');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type(EMPLOYEE_CODE);
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type(EMPLOYEE_PASS);

    // Click Aceptar
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent);
      if (text?.includes('Aceptar')) {
        await btn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => null);
        console.log('Employee login done');
        return true;
      }
    }
  }
  return false;
}

async function downloadReport(page, date) {
  console.log(`Navigating to reports...`);
  const reportUrl = `${BASE_URL}/Informes/?sc=${SC}&AgrupInf=0`;
  await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Check if we need Google login
  if (page.url().includes('accounts.google.com')) {
    await handleGoogleLogin(page);
    await page.waitForTimeout(3000);
  }

  // Check if we need employee login
  const pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.includes('IDENTIFÍQUESE COMO EMPLEADO') || pageText.includes('Código de Empleado')) {
    await handleEmployeeLogin(page);
    await page.waitForTimeout(2000);
  }

  // Check if we're at reports page or need to navigate
  if (page.url().includes('PanelTpv')) {
    // Click Informes
    await page.evaluate(() => {
      const links = document.querySelectorAll('a, button, div');
      for (const el of links) {
        if (el.textContent?.trim() === 'Informes') { el.click(); return; }
      }
    });
    await page.waitForTimeout(3000);
  }

  // Navigate to Informes por Terminal if needed
  if (page.url().includes('ListarAgrupaciones')) {
    await page.evaluate(() => {
      const els = document.querySelectorAll('a, button, div');
      for (const el of els) {
        if (el.textContent?.includes('Informes por') && el.textContent?.includes('TERMINAL')) {
          el.click(); return;
        }
      }
    });
    await page.waitForTimeout(3000);
  }

  console.log('At reports page, clicking Articles Venda...');

  // Click Articles Venda button
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === 'Articles Venda') { btn.click(); return; }
    }
  });
  await page.waitForTimeout(2000);

  // Set dates
  const dateInputs = await page.$$('input[type="date"]');
  // Find the visible ones (in the Articles Venda modal)
  for (const input of dateInputs) {
    const visible = await input.evaluate(el => el.offsetParent !== null);
    if (visible) {
      await input.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, date);
    }
  }
  console.log(`Dates set to: ${date}`);

  // Set format to Excel - Solo datos
  const selects = await page.$$('select');
  for (const sel of selects) {
    const visible = await sel.evaluate(el => el.offsetParent !== null);
    if (visible) {
      await sel.select('2'); // Excel - Solo datos
    }
  }

  // Setup download handling
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: DOWNLOAD_DIR,
  });

  // Click Aceptar (generates report and downloads with selected format)
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const visible = [];
    for (const btn of buttons) {
      if (btn.offsetParent !== null && btn.textContent?.includes('Aceptar')) {
        visible.push(btn);
      }
    }
    // Click the last visible Aceptar (the one in the modal)
    if (visible.length > 0) visible[visible.length - 1].click();
  });

  console.log('Report requested, waiting for download...');
  await page.waitForTimeout(8000);

  // Check for downloaded file
  const files = fs.readdirSync(DOWNLOAD_DIR)
    .filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'))
    .map(f => ({ name: f, time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 0) {
    const latest = files[0].name;
    const newName = `${date}.xls`;
    const oldPath = path.join(DOWNLOAD_DIR, latest);
    const newPath = path.join(DOWNLOAD_DIR, newName);

    // Rename if needed
    if (latest !== newName) {
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(oldPath, newPath);
    }

    console.log(`Downloaded: ${newName}`);
    return newPath;
  }

  console.log('No file downloaded, trying Descargar button...');

  // Maybe report is showing, try clicking Descargar
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.offsetParent !== null && btn.textContent?.includes('Descargar')) {
        btn.click(); return;
      }
    }
  });
  await page.waitForTimeout(5000);

  // Check again
  const files2 = fs.readdirSync(DOWNLOAD_DIR)
    .filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'))
    .map(f => ({ name: f, time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files2.length > 0 && (Date.now() - files2[0].time) < 30000) {
    const latest = files2[0].name;
    const newName = `${date}.xls`;
    const oldPath = path.join(DOWNLOAD_DIR, latest);
    const newPath = path.join(DOWNLOAD_DIR, newName);
    if (latest !== newName) {
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(oldPath, newPath);
    }
    console.log(`Downloaded: ${newName}`);
    return newPath;
  }

  return null;
}

async function processAndUpload(filePath, date) {
  console.log(`Processing ${filePath} for date ${date}...`);

  // We need to use Python to read .xls files
  const { execSync } = require('child_process');
  const result = execSync(`python -X utf8 -c "
import pandas as pd, re, json, sys
df = pd.read_excel(r'${filePath.replace(/\\/g, '\\\\')}', header=None)
rows = []
for i in range(len(df)):
    codi = df.iloc[i, 0]
    if pd.isna(codi): continue
    s = str(codi).strip()
    if s in ('TOTAL','Codi') or s.startswith('HI POT'): continue
    try: ci = int(float(codi))
    except: continue
    nom = str(df.iloc[i, 1]).strip() if df.shape[1]>1 and pd.notna(df.iloc[i, 1]) else ''
    if not nom or nom=='nan': continue
    try: u = int(float(df.iloc[i, 2])) if df.shape[1]>2 and pd.notna(df.iloc[i, 2]) else 0
    except: u = 0
    try: imp = float(df.iloc[i, 3]) if df.shape[1]>3 and pd.notna(df.iloc[i, 3]) else 0.0
    except: imp = 0.0
    rows.append({'codi':ci,'producte':nom,'unitats':u,'import':round(imp,2)})
print(json.dumps(rows, ensure_ascii=False))
"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

  const products = JSON.parse(result.trim());

  // Add categories
  products.forEach(p => { p.categoria = categorise(p.producte); });

  console.log(`Parsed ${products.length} products`);
  const total = products.reduce((s, p) => s + p.import, 0);
  const units = products.reduce((s, p) => s + p.unitats, 0);
  console.log(`Total: ${total.toFixed(2)} EUR | ${units} units`);

  // Upload to database
  const sql = neon(DB_URL);
  await sql`DELETE FROM daily_sales WHERE date = ${date}`;

  for (const p of products) {
    await sql`INSERT INTO daily_sales (date, codi, producte, unitats, import, categoria) VALUES (${date}, ${p.codi}, ${p.producte}, ${p.unitats}, ${p.import}, ${p.categoria})`;
  }

  const r = await sql`SELECT COUNT(*) as c, SUM(import) as t FROM daily_sales WHERE date = ${date}`;
  console.log(`DB: ${r[0].c} products | ${parseFloat(r[0].t).toFixed(2)} EUR`);

  return { products: products.length, total };
}

async function main() {
  console.log('\n=== BDP TPV Report Downloader ===\n');

  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false, // Show browser so user can see what's happening
    defaultViewport: { width: 1400, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userDataDir: path.join(__dirname, '.chrome-profile'), // Persist login
  });

  const page = await browser.newPage();

  try {
    // Load saved cookies
    await loadCookies(page);

    // Download the report
    const filePath = await downloadReport(page, targetDate);

    if (filePath && fs.existsSync(filePath)) {
      // Save cookies for next time
      await saveCookies(page);

      // Process and upload
      await processAndUpload(filePath, targetDate);
      console.log(`\n✅ Done! ${targetDate} uploaded to database.`);
    } else {
      console.log('\n❌ Could not download the report. The session may have expired.');
      console.log('Try running the script again - it will reuse the browser session.');

      // Save cookies anyway
      await saveCookies(page);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    // Don't close browser if headless: false so user can debug
    console.log('\nBrowser left open. Press Ctrl+C to close.');
    // await browser.close();
  }
}

main();
