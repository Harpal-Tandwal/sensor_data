const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 8000;

// Connect to SQLite database (or create if it doesn't exist)
const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log("Connected to SQLite database");
    }
});

// Middleware to parse JSON requests
app.use(express.json());

// Create "dh11" table if it does not exist
db.run(`CREATE TABLE IF NOT EXISTS dh11 (

	"sensor_id"	VARCHAR(20) NOT NULL UNIQUE,
	"datetime"	DATATIME NOT NULL,
	"temp"	NUMERIC,
	"humidity"	NUMERIC

)`, (err) => {
    if (err) {
        console.error("Error creating table:", err.message);
    } else {
        console.log('Table "dh11" is ready.');
    }
});

// Route to insert sensor data
app.post("/sensor-data", (req, res) => {
    const { sensor_id, temp, humidity } = req.body;

    const datetime = new Date().toISOString().replace("T", " ").split(".")[0];
    // const sql = `INSERT INTO dh11 ("sensor id", "datetime", "temp", "humidity") VALUES (?, ?, ?, ?)`;
    const sql=`INSERT INTO dh11 (sensor_id, datetime, temp, humidity)
VALUES (?,?,?,?)
ON CONFLICT(sensor_id) 
DO UPDATE SET 
    datetime = excluded.datetime,
    temp = excluded.temp,
    humidity = excluded.humidity`;
    db.run(sql, [sensor_id, datetime, temp, humidity], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ message: "Data inserted", id: this.lastID });
        }
    });
});

// Route to get all sensor data
app.get("/sensor-data", (req, res) => {
    db.all("SELECT * FROM dh11", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// DELETE row based on sensor_id 
app.post("/delete", (req, res) => {
    const { sensor_id } = req.body;

    if (!sensor_id) {
        return res.status(400).json({ error: "sensor_id is required" });
    }

    const sql = "DELETE FROM dh11 WHERE sensor_id = ?";
    db.run(sql, [sensor_id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Sensor ID not found" });
        }
        res.json({ message: "Row deleted successfully", sensor_id });
    });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
