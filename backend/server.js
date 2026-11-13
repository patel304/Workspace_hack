
require("dotenv").config();


const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api", require("./src/routes/api"));

app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        application: "Workforce Retention Intelligence System"
    });
});

app.use("/api", apiRoutes);

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
