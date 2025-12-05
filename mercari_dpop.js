// mercari_dpop.js
const puppeteer = require("puppeteer-core");

const defaultTargetUrl =
    process.env.MERCARI_URL ||
    "https://jp.mercari.com/en/search?keyword=%E3%83%94%E3%82%AB%E3%83%81%E3%83%A5%E3%82%A6";

const defaultStoreUrl =
    process.env.STORE_URL ||
    "https://phpmalbolge.altervista.org/monitor/storeDPOP.php";

async function runDpop(targetUrl = defaultTargetUrl, storeUrl = defaultStoreUrl) {
    console.log("runDpop: starting");
    console.log("Target URL:", targetUrl);
    console.log("Store URL:", storeUrl);

    const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

    console.log("Using Chromium at:", executablePath);

    const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage"
        ]
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
        const url = request.url();

        console.log("[REQ]", request.method(), url);

        if (url.includes("entities:search")) {
            console.log("[REQ] entities:search:", url);

            const headers = request.headers();
            const dpop = headers["dpop"];

            if (dpop && !dpopFound) {
                dpopFound = dpop;
                console.log("DPoP trovato, lunghezza:", dpop.length);

                try {
                    const fullUrl = `${storeUrl}?DPOP=${encodeURIComponent(dpop)}`;
                    console.log("Invio DPoP a:", fullUrl);
                    const resp = await fetch(fullUrl);
                    storeStatus = resp.status;
                    console.log("Risposta storeDPOP:", storeStatus);
                } catch (err) {
                    console.error("Errore invio DPoP:", err);
                    storeStatus = "error";
                }
            }
        }
    });

    page.on("response", async response => {
        try {
            console.log("[RES]", response.status(), response.url());
        } catch (e) {
            // giusto per sicurezza
        }
    });

    try {
        console.log("Carico pagina Mercari...");
        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });
        console.log("Pagina caricata, attendo 15s per XHR...");
    } catch (err) {
        console.error("Errore goto Mercari:", err.message);
    }

    await new Promise(r => setTimeout(r, 15000));

    await browser.close();
    console.log("Browser chiuso");

    return {
        status: "ok",
        dpopFound,
        storeStatus
    };
}

module.exports = { runDpop };
