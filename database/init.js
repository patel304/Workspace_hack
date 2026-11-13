
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "workforce.db");
const schemaPath = path.join(__dirname, "schema.sql");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(schemaPath, "utf8");

db.exec(schema);

console.log("Database initialized successfully!");

const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
`).all();

console.log("Created tables:", tables.map(t => t.name));

db.close();
