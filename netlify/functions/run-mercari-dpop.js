// netlify/functions/run-mercari-dpop.js

const TARGET_URL =
  process.env.MERCARI_URL ||
  "https://jp.mercari.com/en/search?keyword=%E3%83%94%E3%82%AB%E3%83%81%E3%83%A5%E3%82%A6";

const STORE_URL =
  process.env.STORE_URL ||
  "https://phpmalbolge.altervista.org/monitor/storeDPOP.php";

async function runDpop() {
  // import dinamico perché puppeteer è ESM
  const puppeteerModule = await import("puppeteer");
  const puppeteer = puppeteerModule.default ?? puppeteerModule;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  let dpopFound = null;
  let storeStatus = null;

  page.on("request", async request => {
    if (dpopFound) return;

    const url = request.url();
    if (!url.includes("entities:search")) return;

    const headers = request.headers();
    const dpop = headers["dpop"];
    if (!dpop) return;

    dpopFound = dpop;

    try {
      const fullUrl = `${STORE_URL}?DPOP=${encodeURIComponent(dpop)}`;
      const resp = await fetch(fullUrl);
      storeStatus = resp.status;
    } catch (err) {
      console.error("Errore invio DPoP:", err);
      storeStatus = "error";
    }
  });

  try {
    await page.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 0
    });
  } catch (err) {
    console.error("Errore goto:", err.message);
  }

  // aspetta un po' per permettere alle XHR di partire
  await new Promise(r => setTimeout(r, 15000));

  await browser.close();

  return { dpopFound, storeStatus };
}

// handler Netlify in CommonJS
exports.handler = async (event, context) => {
  try {
    const result = await runDpop();
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        ...result
      })
    };
  } catch (err) {
    console.error("Errore generale:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: err.message
      })
    };
  }
};
