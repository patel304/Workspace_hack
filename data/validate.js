
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
    path.join(__dirname, "../database/workforce.db"),
    { readonly: true }
);

db.pragma("foreign_keys = ON");

const checks = [
    ["Employees", "SELECT COUNT(*) AS total FROM employees"],
    ["Teams", "SELECT COUNT(*) AS total FROM teams"],
    ["Roles", "SELECT COUNT(*) AS total FROM roles"],
    ["Tenure snapshots", "SELECT COUNT(*) AS total FROM tenure_snapshots"],
    ["Engagement surveys", "SELECT COUNT(*) AS total FROM engagement_surveys"],
    ["Workload snapshots", "SELECT COUNT(*) AS total FROM workload_snapshots"],
    ["Compensation records", "SELECT COUNT(*) AS total FROM compensation_bands"],
    ["Promotion records", "SELECT COUNT(*) AS total FROM promotion_history"],
    ["Attrition outcomes", "SELECT COUNT(*) AS total FROM attrition_outcomes"],
    ["Interventions", "SELECT COUNT(*) AS total FROM interventions"]
];

let failed = false;

console.log("\n===== DATA VALIDATION REPORT =====");

for (const [name, query] of checks) {
    const result = db.prepare(query).get();
    console.log(`${name}: ${result.total}`);
}

const fkErrors = db.pragma("foreign_key_check");

console.log("\nForeign key errors:", fkErrors.length);

const invalidDates = db.prepare(`
    SELECT COUNT(*) AS total
    FROM attrition_outcomes o
    JOIN employees e ON e.employee_id = o.employee_id
    WHERE o.termination_date IS NOT NULL
    AND o.termination_date < e.hire_date
`).get().total;

console.log("Termination before hire:", invalidDates);

const invalidStatus = db.prepare(`
    SELECT COUNT(*) AS total
    FROM employees e
    JOIN attrition_outcomes o ON e.employee_id = o.employee_id
    WHERE e.employment_status = 'terminated'
    AND o.termination_date IS NULL
`).get().total;

console.log("Status inconsistencies:", invalidStatus);

const missingSurvey = db.prepare(`
    SELECT COUNT(*) AS total
    FROM engagement_surveys
    WHERE survey_status = 'missing'
    AND engagement_score IS NOT NULL
`).get().total;

console.log("Missing survey inconsistencies:", missingSurvey);

if (fkErrors.length || invalidDates || invalidStatus || missingSurvey) {
    failed = true;
}

console.log(
    failed
        ? "\nVALIDATION FAILED - Issues require correction."
        : "\nBASIC VALIDATION PASSED"
);

db.close();

if (failed) process.exitCode = 1;
