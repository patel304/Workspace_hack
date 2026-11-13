
const Database = require("better-sqlite3");

const DB_PATH = "database/workforce_improved.db";
const CUTOFF = "2024-12-01";

const db = new Database(DB_PATH, { readonly: true });

function calculateScore(employee) {
    let score = 0;

    if (employee.engagement !== null) {
        if (employee.engagement < 2.5) score += 35;
        else if (employee.engagement < 3.2) score += 20;
    }

    if (employee.average_workload >= 50) score += 30;
    else if (employee.average_workload >= 45) score += 15;

    if (
        employee.tenure_months >= 24 &&
        employee.last_promotion_date === null
    ) {
        score += 15;
    } else if (
        employee.months_since_promotion !== null &&
        employee.months_since_promotion >= 24
    ) {
        score += 15;
    }

    if (
        employee.tenure_months >= 12 &&
        employee.tenure_months < 24
    ) {
        score += 10;
    }

    score = Math.min(score, 100);

    return {
        score,
        priority:
            score >= 60 ? "high" :
            score >= 30 ? "medium" : "low"
    };
}

const rows = db.prepare(`
    SELECT
        e.employee_id,
        o.ground_truth,

        (
            SELECT t.tenure_months
            FROM tenure_snapshots t
            WHERE t.employee_id = e.employee_id
              AND t.snapshot_date <= ?
            ORDER BY t.snapshot_date DESC
            LIMIT 1
        ) AS tenure_months,

        (
            SELECT s.engagement_score
            FROM engagement_surveys s
            WHERE s.employee_id = e.employee_id
              AND s.survey_date <= ?
              AND s.survey_status = 'completed'
            ORDER BY s.survey_date DESC
            LIMIT 1
        ) AS engagement,

        (
            SELECT AVG(recent.weekly_hours)
            FROM (
                SELECT w.weekly_hours
                FROM workload_snapshots w
                WHERE w.employee_id = e.employee_id
                  AND w.snapshot_date <= ?
                ORDER BY w.snapshot_date DESC
                LIMIT 3
            ) recent
        ) AS average_workload,

        (
            SELECT p.promotion_date
            FROM promotion_history p
            WHERE p.employee_id = e.employee_id
              AND p.promotion_date <= ?
            ORDER BY p.promotion_date DESC
            LIMIT 1
        ) AS last_promotion_date

    FROM employees e
    JOIN attrition_outcomes o
      ON o.employee_id = e.employee_id

    WHERE e.hire_date <= ?
      AND o.prediction_date = ?
      AND o.horizon_months = 6
`).all(
    CUTOFF,
    CUTOFF,
    CUTOFF,
    CUTOFF,
    CUTOFF,
    CUTOFF
);

function monthsBetween(start, end) {
    const a = new Date(start);
    const b = new Date(end);

    return (
        (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
        b.getUTCMonth() - a.getUTCMonth()
    );
}

const results = rows.map(employee => {
    const monthsSincePromotion =
        employee.last_promotion_date
            ? monthsBetween(
                employee.last_promotion_date,
                CUTOFF
            )
            : null;

    const scored = calculateScore({
        ...employee,
        months_since_promotion: monthsSincePromotion
    });

    return {
        ...employee,
        ...scored,
        actual: Number(employee.ground_truth)
    };
});

function metrics(label) {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const row of results) {
        const predicted = label(row);

        if (predicted && row.actual === 1) tp++;
        else if (predicted && row.actual === 0) fp++;
        else if (!predicted && row.actual === 0) tn++;
        else fn++;
    }

    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall
        ? 2 * precision * recall / (precision + recall)
        : 0;

    return {
        TP: tp,
        FP: fp,
        TN: tn,
        FN: fn,
        precision: precision.toFixed(4),
        recall: recall.toFixed(4),
        f1_score: f1.toFixed(4)
    };
}

try {
    const actualExits = results.filter(
        row => row.actual === 1
    ).length;

    if (results.length === 0) {
        throw new Error("No eligible employees found.");
    }

    console.log("\nIMPROVED DATASET EVALUATION");
    console.log("===========================");
    console.log("Prediction date:", CUTOFF);
    console.log("Horizon: 6 months");
    console.log("Employees evaluated:", results.length);
    console.log("Actual voluntary exits:", actualExits);
    console.log(
        "Attrition rate:",
        (actualExits / results.length * 100).toFixed(2) + "%"
    );

    console.log("\nHIGH PRIORITY ONLY");
    console.table(
        metrics(row => row.priority === "high")
    );

    console.log("\nMEDIUM + HIGH PRIORITY");
    console.table(
        metrics(row =>
            row.priority === "medium" ||
            row.priority === "high"
        )
    );

    console.log("\nPRIORITY DISTRIBUTION");
    console.table({
        high: results.filter(r => r.priority === "high").length,
        medium: results.filter(r => r.priority === "medium").length,
        low: results.filter(r => r.priority === "low").length
    });

} finally {
    db.close();
}
