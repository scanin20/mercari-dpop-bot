// server.js
const express = require("express");
const { runDpop } = require("./mercari_dpop");

const app = express();

app.get("/", (req, res) => {
  res.type("text/plain").send("Mercari DPoP bot up");
});

app.get("/run", async (req, res) => {
  try {
    const result = await runDpop();
    res.json({
      status: "ok",
      ...result
    });
  } catch (err) {
    console.error("Errore /run:", err);
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server listening on port", port);
});