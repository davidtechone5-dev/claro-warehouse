import express from "express";
import { wmsController } from "./controllers/wms.controller";

const app = express();
app.use(express.json());

const router = express.Router();
router.patch("/material-requests/:id", (req, res) => {
  res.status(200).json({ ok: true, id: req.params.id });
});

app.use("/api/v1/wms", router);

const server = app.listen(0, async () => {
  const address = server.address() as any;
  const port = address.port;
  console.log(`Test server listening on port ${port}`);

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/wms/material-requests/123-abc`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" })
    });
    console.log("Response status:", res.status);
    const json = await res.json();
    console.log("Response JSON:", json);
  } catch (err: any) {
    console.error("Test failed:", err.message);
  } finally {
    server.close();
  }
});
