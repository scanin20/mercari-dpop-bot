import puppeteer from "puppeteer";

const TARGET_URL = "https://jp.mercari.com/en/search?keyword=ピカチュウ";
// la tua pagina PHP che salva il token
const STORE_URL  = "https://phpmalbolge.altervista.org/monitor/storeDPOP.php";

(async () => {
    // per debug puoi mettere headless: false per vedere il browser
    const browser = await puppeteer.launch({
        headless: true,
        // opzionale: aumenta timeout avvio
        timeout: 60000
    });

    const page = await browser.newPage();

    // opzionale: user agent simile a un browser reale
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    let dpopFound = false;

    // intercettiamo tutte le richieste XHR/fetch
    page.on("request", async (request) => {
        const url = request.url();

        // stessa logica del tuo script: cerchiamo "entities:search"
        if (url.includes("entities:search")) {
            const headers = request.headers();

            // chiave in lowercase, come la espone Puppeteer
            const dpop = headers["dpop"];

            if (dpop && !dpopFound) {
                dpopFound = true;
                console.log("DPoP trovato, primi 80 caratteri:");
                console.log(dpop.slice(0, 80) + "...");

                try {
                    const fullUrl = `${STORE_URL}?DPOP=${encodeURIComponent(dpop)}`;
                    console.log("Invio DPoP a:", fullUrl);

                    const resp = await fetch(fullUrl);
                    console.log("Risposta storeDPOP HTTP:", resp.status);
                } catch (err) {
                    console.error("Errore durante l invio del DPoP:", err);
                }

                // chiudiamo tutto appena abbiamo il token
                await browser.close();
                process.exit(0);
            }
        }
    });

    // carichiamo la pagina di ricerca Mercari
    try {
        await page.goto(TARGET_URL, {
            waitUntil: "networkidle2",
            timeout: 60000
        });
    } catch (err) {
        console.error("Errore nel caricamento pagina Mercari:", err);
    }

    // aspetta ancora un po per eventuali XHR ritardate
    await new Promise((resolve) => setTimeout(resolve, 10000));

    if (!dpopFound) {
        console.log("Nessun DPoP trovato dalle richieste entities:search");
    }

    await browser.close();
    process.exit(0);
})();
