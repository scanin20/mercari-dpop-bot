const express = require("express");
const { runDpop } = require("./mercari_dpop");

const app = express();

app.get("/", (req, res) => {
  res.send("Mercari DPoP bot up");
});

app.get("/run", async (req, res) => {
  try {
    const result = await runDpop();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server listening on", port));
