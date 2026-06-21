import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { slowQueriesRouter } from "./routes/slowQueries";
import { analyzeRouter } from "./routes/analyze";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/slow-queries", slowQueriesRouter);
app.use("/api/analyze", analyzeRouter);

app.listen(PORT, () => {
  console.log(`🚀 Query Performance Analyzer API running on port ${PORT}`);
});
