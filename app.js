require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const path = require("path");
const studentRoutes = require("./routes/studentRoutes");
const pool = require("./config/db");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(morgan("dev"));
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "view", "view.html"));
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/students", studentRoutes);
app.use("/api/students", studentRoutes);

app.use((err, req, res, next) => {
    console.error("Unhandled API error:", err);
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "request body must contain valid JSON" });
    }
    res.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`Student API listening on port ${port}`);
    });

    const shutdown = async () => {
        server.close(async () => {
            await pool.end();
            console.log("Database pool closed");
        });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

module.exports = app;
