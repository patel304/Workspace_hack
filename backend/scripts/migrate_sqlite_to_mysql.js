
const Database = require("better-sqlite3");
const mysql = require("mysql2/promise");
const path = require("path");

const sqlite = new Database(
  path.resolve(__dirname, "../../database/workforce_improved.db"),
  { readonly: true }
);

const tables = [
  "teams",
  "roles",
  "employees",
  "tenure_snapshots",
  "engagement_surveys",
  "workload_snapshots",
  "compensation_bands",
  "promotion_history",
  "attrition_outcomes",
  "interventions",
];

async function migrate() {
  if (!process.env.MYSQL_PASSWORD) {
    throw new Error("MYSQL_PASSWORD is not set");
  }

  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: process.env.MYSQL_PASSWORD,
    database: "workforce_retention",
  });

  try {
    // Refuse to duplicate or overwrite existing MySQL records.
    for (const table of tables) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS total FROM \`${table}\``
      );

      if (Number(rows[0].total) !== 0) {
        throw new Error(`${table} is not empty. Migration stopped.`);
      }
    }

    await connection.beginTransaction();

    const report = {};

    for (const table of tables) {
      const columns = sqlite
        .prepare(`PRAGMA table_info("${table}")`)
        .all()
        .map((column) => column.name);

      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();

      const columnNames = columns
        .map((column) => `\`${column}\``)
        .join(", ");

      let migrated = 0;
      const batchSize = 300;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const placeholders = batch
          .map(
            () => `(${columns.map(() => "?").join(", ")})`
          )
          .join(", ");

        const values = batch.flatMap((row) =>
          columns.map((column) => row[column])
        );

        await connection.query(
          `INSERT INTO \`${table}\` (${columnNames})
           VALUES ${placeholders}`,
          values
        );

        migrated += batch.length;
      }

      report[table] = {
        source: rows.length,
        migrated,
      };

      console.log(`${table}: ${migrated} records`);
    }

    // Verify all destination counts before committing.
    for (const table of tables) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS total FROM \`${table}\``
      );

      if (Number(rows[0].total) !== report[table].source) {
        throw new Error(`Count mismatch in ${table}`);
      }
    }

    await connection.commit();

    console.log("\nMIGRATION SUCCESSFUL");
    console.table(report);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    sqlite.close();
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("MIGRATION FAILED:", error.message);
  process.exitCode = 1;
});
