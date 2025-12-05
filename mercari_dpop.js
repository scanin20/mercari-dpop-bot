const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const defaultTargetUrl =
  process.env.MERCARI_URL ||
  "https://jp.mercari.com/en/search?keyword=%E3%83%94%E3%82%AB%E3%83%81%E3%83%A5%E3%82%A6";

const defaultStoreUrl =
  process.env.STORE_URL ||
  "https://phpmalbolge.altervista.org/monitor/storeDPOP.php";

async function runDpop(targetUrl = defaultTargetUrl, storeUrl = defaultStoreUrl) {
  const executablePath = await chromium.executablePath;

  const browser = await puppeteer.launch({
    executablePath,
    headless: chromium.headless,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport
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

    if (!request.url().includes("entities:search")) return;

    const dpop = request.headers()["dpop"];
    if (!dpop) return;

    dpopFound = dpop;

    try {
      const resp = await fetch(
        `${storeUrl}?DPOP=${encodeURIComponent(dpop)}`
      );
      storeStatus = resp.status;
    } catch (err) {
      storeStatus = "error";
    }
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  await new Promise(r => setTimeout(r, 15000));

  await browser.close();

  return { dpopFound, storeStatus };
}

module.exports = { runDpop };
