
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// ======================================================
// CONFIGURATION
// ======================================================

const SEED = 20261113;
const EMPLOYEE_COUNT = 10000;
const MONTHS = 24;

const PREDICTION_DATE = "2024-12-01";
const HORIZON_MONTHS = 6;
const HORIZON_START = "2025-01-01";
const HORIZON_END = "2025-06-01";

const DB_PATH = path.join(
    __dirname,
    "../database/workforce_improved.db"
);

const SCHEMA_PATH = path.join(
    __dirname,
    "../database/schema.sql"
);

const GROUND_TRUTH_PATH = path.join(
    __dirname,
    "ground_truth_improved.csv"
);

// Never overwrite existing output.
if (fs.existsSync(DB_PATH)) {
    throw new Error(
        `Output database already exists: ${DB_PATH}. ` +
        "Preserve it or remove it explicitly before regenerating."
    );
}

if (fs.existsSync(GROUND_TRUTH_PATH)) {
    throw new Error(
        `Ground truth already exists: ${GROUND_TRUTH_PATH}. ` +
        "Preserve it or remove it explicitly before regenerating."
    );
}

// ======================================================
// DATABASE
// ======================================================

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

// ======================================================
// DETERMINISTIC RANDOM GENERATOR
// ======================================================

let seed = SEED;

function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

function pick(items) {
    return items[Math.floor(random() * items.length)];
}

function pad(value, length = 6) {
    return String(value).padStart(length, "0");
}

function dateFor(monthIndex) {
    return new Date(
        Date.UTC(2024, monthIndex, 1)
    ).toISOString().slice(0, 10);
}

function monthsBetween(start, end) {
    const a = new Date(start);
    const b = new Date(end);

    return (
        (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
        b.getUTCMonth() - a.getUTCMonth()
    );
}

function csvEscape(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return `"${String(value).replace(/"/g, '""')}"`;
}

// ======================================================
// MASTER DATA
// ======================================================

const teams = [
    ["TEAM-001", "Engineering", "Technology"],
    ["TEAM-002", "Human Resources", "HR"],
    ["TEAM-003", "Sales", "Business"],
    ["TEAM-004", "Operations", "Operations"],
    ["TEAM-005", "Finance", "Finance"]
];

const roles = [
    ["ROLE-001", "Junior Associate", 2, "Individual Contributor"],
    ["ROLE-002", "Software Engineer", 4, "Technology"],
    ["ROLE-003", "Senior Engineer", 6, "Technology"],
    ["ROLE-004", "Team Manager", 7, "Management"],
    ["ROLE-005", "HR Specialist", 4, "HR"],
    ["ROLE-006", "Business Analyst", 4, "Business"]
];

const firstNames = [
    "Aarav", "Arjun", "Rohan", "Vikram", "Rahul",
    "Priya", "Ananya", "Neha", "Kavya", "Isha"
];

const lastNames = [
    "Sharma", "Patel", "Verma", "Gupta", "Singh",
    "Kumar", "Reddy", "Mehta", "Joshi", "Das"
];

// ======================================================
// PREPARED STATEMENTS
// ======================================================

const statements = {
    team: db.prepare(`
        INSERT INTO teams
        (team_id, team_name, department)
        VALUES (?, ?, ?)
    `),

    role: db.prepare(`
        INSERT INTO roles
        (role_id, role_title, role_level, role_category)
        VALUES (?, ?, ?, ?)
    `),

    employee: db.prepare(`
        INSERT INTO employees
        (employee_id, first_name, last_name, role_id,
         team_id, hire_date, employment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

    tenure: db.prepare(`
        INSERT INTO tenure_snapshots
        VALUES (?, ?, ?, ?, ?, ?)
    `),

    survey: db.prepare(`
        INSERT INTO engagement_surveys
        VALUES (?, ?, ?, ?, ?, ?)
    `),

    workload: db.prepare(`
        INSERT INTO workload_snapshots
        VALUES (?, ?, ?, ?, ?, ?)
    `),

    compensation: db.prepare(`
        INSERT INTO compensation_bands
        VALUES (?, ?, ?, ?, ?)
    `),

    promotion: db.prepare(`
        INSERT INTO promotion_history
        VALUES (?, ?, ?, ?, ?)
    `),

    outcome: db.prepare(`
        INSERT INTO attrition_outcomes
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

    intervention: db.prepare(`
        INSERT INTO interventions
        (intervention_id, employee_id, created_date,
         intervention_type, priority, explanation,
         review_status, simulated_outcome)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
};

// ======================================================
// GENERATE EMPLOYEE HISTORIES IN MEMORY
// ======================================================

const employees = [];

for (let i = 1; i <= EMPLOYEE_COUNT; i++) {
    const employeeId = `EMP-${pad(i)}`;

    // Hire dates range from January 2024 to December 2025.
    const hireDate = dateFor(
        Math.floor(random() * MONTHS)
    );

    const eligible = hireDate <= PREDICTION_DATE;

    const originalRole = pick(roles);
    const originalTeam = pick(teams);

    const baselineEngagement = 2.5 + random() * 2.3;

    const employee = {
        employeeId,
        hireDate,
        eligible,
        roleId: originalRole[0],
        teamId: originalTeam[0],
        firstName: pick(firstNames),
        lastName: pick(lastNames),
        baselineEngagement,
        histories: [],
        promotions: [],
        terminationDate: null,
        attritionType: "none",
        groundTruth: 0
    };

    let currentRole = originalRole[0];
    let currentTeam = originalTeam[0];
    let promotionDone = false;

    for (let m = 0; m < MONTHS; m++) {
        const snapshotDate = dateFor(m);

        if (snapshotDate < hireDate) {
            continue;
        }

        // Internal transfers do not imply attrition.
        if (m > 0 && m % 8 === 0 && random() < 0.08) {
            currentTeam = pick(
                teams.filter(team => team[0] !== currentTeam)
            )[0];
        }

        // Promotion opportunity.
        if (
            !promotionDone &&
            m >= 8 &&
            random() < 0.08
        ) {
            const previousRole = currentRole;

            currentRole = pick(
                roles.filter(role => role[0] !== currentRole)
            )[0];

            employee.promotions.push({
                previousRole,
                newRole: currentRole,
                promotionDate: snapshotDate
            });

            promotionDone = true;
        }

        const tenureMonths = monthsBetween(
            hireDate,
            snapshotDate
        );

        const missing = random() < 0.12;

        // Engagement trends are generated independently of
        // future attrition outcomes.
        const engagement = Math.max(
            1,
            Math.min(
                5,
                baselineEngagement -
                m * 0.025 +
                (random() - 0.5) * 0.8
            )
        );

        // Some high workload is intentionally benign.
        const weeklyHours = 35 + random() * 20;

        const overtimeHours = Math.max(
            0,
            weeklyHours - 40
        );

        const workloadLevel =
            weeklyHours >= 55 ? "critical" :
            weeklyHours >= 48 ? "high" :
            weeklyHours >= 40 ? "normal" : "low";

        employee.histories.push({
            snapshotDate,
            tenureMonths,
            teamId: currentTeam,
            roleId: currentRole,
            engagementScore: missing
                ? null
                : Number(engagement.toFixed(2)),
            satisfactionScore: missing
                ? null
                : Number((1 + random() * 4).toFixed(2)),
            surveyStatus: missing ? "missing" : "completed",
            weeklyHours: Number(weeklyHours.toFixed(2)),
            overtimeHours: Number(overtimeHours.toFixed(2)),
            workloadLevel
        });
    }

    employees.push(employee);
}

// ======================================================
// PRE-OUTCOME RISK SIGNALS
// ======================================================

function calculateSignals(employee) {
    const history = employee.histories.filter(
        item => item.snapshotDate <= PREDICTION_DATE
    );

    const latest = history[history.length - 1];

    if (!latest) {
        return null;
    }

    const surveys = history.filter(
        item => item.engagementScore !== null
    );

    const latestSurvey = surveys.length
        ? surveys[surveys.length - 1]
        : null;

    const recentWorkload = history.slice(-3);

    const averageWorkload =
        recentWorkload.reduce(
            (sum, item) => sum + item.weeklyHours,
            0
        ) / recentWorkload.length;

    const promotionsBeforeCutoff =
        employee.promotions.filter(
            item => item.promotionDate <= PREDICTION_DATE
        );

    const lastPromotion = promotionsBeforeCutoff.length
        ? promotionsBeforeCutoff[promotionsBeforeCutoff.length - 1]
        : null;

    const monthsSincePromotion = lastPromotion
        ? monthsBetween(lastPromotion.promotionDate, PREDICTION_DATE)
        : null;

    return {
        tenureMonths: latest.tenureMonths,
        engagement: latestSurvey
            ? latestSurvey.engagementScore
            : null,
        averageWorkload,
        monthsSincePromotion,
        promotionCount: promotionsBeforeCutoff.length
    };
}

// This is a synthetic data-generating mechanism,
// NOT a real-world resignation probability model.
function calculateSyntheticRisk(signals) {
    let score = 0;

    if (
        signals.engagement !== null &&
        signals.engagement < 2.5
    ) {
        score += 0.18;
    } else if (
        signals.engagement !== null &&
        signals.engagement < 3.2
    ) {
        score += 0.09;
    }

    if (signals.averageWorkload >= 50) {
        score += 0.12;
    } else if (signals.averageWorkload >= 45) {
        score += 0.05;
    }

    if (
        signals.tenureMonths >= 24 &&
        signals.monthsSincePromotion === null
    ) {
        score += 0.06;
    } else if (
        signals.monthsSincePromotion !== null &&
        signals.monthsSincePromotion >= 24
    ) {
        score += 0.06;
    }

    if (
        signals.tenureMonths >= 12 &&
        signals.tenureMonths < 24
    ) {
        score += 0.03;
    }

    // Missing surveys do not add negative engagement points.
    // A baseline probability preserves randomness.
    return Math.min(0.30, 0.035 + score);
}

// ======================================================
// ASSIGN FUTURE OUTCOMES ONLY TO ELIGIBLE EMPLOYEES
// ======================================================

let eligibleCount = 0;
let voluntaryCount = 0;

for (const employee of employees) {
    if (!employee.eligible) {
        continue;
    }

    const signals = calculateSignals(employee);

    if (!signals) {
        continue;
    }

    eligibleCount++;

    const syntheticRisk = calculateSyntheticRisk(signals);

    if (random() < syntheticRisk) {
        employee.terminationDate = dateFor(
            12 + Math.floor(random() * 6)
        );

        employee.attritionType = "voluntary";
        employee.groundTruth = 1;

        voluntaryCount++;
    }

    employee.signals = signals;
}

// ======================================================
// WRITE DATA TO DATABASE
// ======================================================

const generate = db.transaction(() => {
    teams.forEach(team => statements.team.run(...team));
    roles.forEach(role => statements.role.run(...role));

    let interventionCount = 0;
    let snapshotCount = 0;

    for (const employee of employees) {
        const {
            employeeId,
            hireDate,
            roleId,
            teamId,
            firstName,
            lastName,
            terminationDate
        } = employee;

        statements.employee.run(
            employeeId,
            firstName,
            lastName,
            roleId,
            teamId,
            hireDate,
            terminationDate ? "terminated" : "active"
        );

        statements.compensation.run(
            `COMP-${employeeId}`,
            employeeId,
            pick(["B1", "B2", "B3", "B4"]),
            hireDate,
            null
        );

        for (const promotion of employee.promotions) {
            if (
                terminationDate &&
                promotion.promotionDate >= terminationDate
            ) {
                continue;
            }
            statements.promotion.run(
                `PROM-${employeeId}-${promotion.promotionDate}`,
                employeeId,
                promotion.previousRole,
                promotion.newRole,
                promotion.promotionDate
            );
        }

        for (const item of employee.histories) {
            // Stop all employee history on or after termination.
            if (
                terminationDate &&
                item.snapshotDate >= terminationDate
            ) {
                continue;
            }

            statements.tenure.run(
                `SNAP-${employeeId}-${item.snapshotDate.slice(0, 7)}`,
                employeeId,
                item.snapshotDate,
                item.tenureMonths,
                item.teamId,
                item.roleId
            );

            statements.survey.run(
                `SURV-${employeeId}-${item.snapshotDate}`,
                employeeId,
                item.snapshotDate,
                item.engagementScore,
                item.satisfactionScore,
                item.surveyStatus
            );

            statements.workload.run(
                `WORK-${employeeId}-${item.snapshotDate}`,
                employeeId,
                item.snapshotDate,
                item.weeklyHours,
                item.overtimeHours,
                item.workloadLevel
            );

            snapshotCount++;
        }

        // Only employees eligible at the prediction date
        // receive an outcome record.
        if (employee.eligible) {
            statements.outcome.run(
                `OUT-${employeeId}-2025`,
                employeeId,
                PREDICTION_DATE,
                HORIZON_MONTHS,
                terminationDate,
                employee.attritionType,
                employee.groundTruth
            );
        }

        // Do not create a future intervention for someone
        // who already exited before the intervention date.
        if (
            random() < 0.15 &&
            (!terminationDate || terminationDate > "2025-01-15")
        ) {
            statements.intervention.run(
                `INT-${employeeId}`,
                employeeId,
                "2025-01-15",
                pick([
                    "manager_conversation",
                    "workload_review",
                    "career_discussion",
                    "hr_support"
                ]),
                pick(["low", "medium", "high"]),
                "Synthetic supportive review; human assessment required.",
                "pending",
                "simulated_review_pending"
            );

            interventionCount++;
        }
    }

    return {
        snapshotCount,
        interventionCount
    };
});

// ======================================================
// EMPLOYEE-LEVEL GROUND TRUTH
// ======================================================

function writeGroundTruth() {
    const rows = [
        [
            "employee_id",
            "prediction_date",
            "horizon_months",
            "termination_date",
            "attrition_type",
            "ground_truth",
            "tenure_months_at_cutoff",
            "engagement_at_cutoff",
            "average_workload_at_cutoff",
            "months_since_promotion"
        ].join(",")
    ];

    for (const employee of employees) {
        if (!employee.eligible || !employee.signals) {
            continue;
        }

        const s = employee.signals;

        rows.push([
            employee.employeeId,
            PREDICTION_DATE,
            HORIZON_MONTHS,
            employee.terminationDate,
            employee.attritionType,
            employee.groundTruth,
            s.tenureMonths,
            s.engagement,
            Number(s.averageWorkload.toFixed(2)),
            s.monthsSincePromotion
        ].map(csvEscape).join(","));
    }

    fs.writeFileSync(
        GROUND_TRUTH_PATH,
        rows.join("\n") + "\n",
        "utf8"
    );
}

// ======================================================
// POST-GENERATION VALIDATION
// ======================================================

function validateDatabase() {
    const foreignKeyErrors = db.pragma("foreign_key_check");

    const outcomeCounts = db.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(ground_truth) AS voluntary_exits,
            SUM(CASE WHEN attrition_type = 'none' THEN 1 ELSE 0 END) AS no_exit
        FROM attrition_outcomes
    `).get();

    const invalidDates = db.prepare(`
        SELECT COUNT(*) AS total
        FROM attrition_outcomes o
        JOIN employees e ON e.employee_id = o.employee_id
        WHERE e.hire_date > o.prediction_date
           OR (
                o.termination_date IS NOT NULL
                AND o.termination_date < o.prediction_date
           )
           OR (
                o.termination_date IS NOT NULL
                AND o.termination_date > '2025-06-01'
           )
    `).get();

    const invalidStatus = db.prepare(`
        SELECT COUNT(*) AS total
        FROM employees e
        LEFT JOIN attrition_outcomes o
            ON o.employee_id = e.employee_id
        WHERE
            (e.employment_status = 'terminated'
             AND (o.outcome_id IS NULL OR o.termination_date IS NULL))
            OR
            (e.employment_status = 'active'
             AND o.termination_date IS NOT NULL)
    `).get();

    if (
        foreignKeyErrors.length ||
        invalidDates.total ||
        invalidStatus.total ||
        outcomeCounts.total !== eligibleCount
    ) {
        throw new Error(
            "Post-generation validation failed. " +
            JSON.stringify({
                foreignKeyErrors: foreignKeyErrors.length,
                invalidDates: invalidDates.total,
                invalidStatus: invalidStatus.total,
                outcomes: outcomeCounts.total,
                expectedEligible: eligibleCount
            })
        );
    }

    return outcomeCounts;
}

// ======================================================
// EXECUTION
// ======================================================

try {
    const result = generate();
    writeGroundTruth();

    const validation = validateDatabase();

    console.log("\nIMPROVED DATA GENERATION COMPLETE");
    console.log("---------------------------------");
    console.log("Seed:", SEED);
    console.log("Employees:", EMPLOYEE_COUNT);
    console.log("Eligible employees:", eligibleCount);
    console.log("Voluntary exits:", voluntaryCount);
    console.log(
        "Eligible attrition rate:",
        (voluntaryCount / eligibleCount * 100).toFixed(2) + "%"
    );
    console.log("History snapshots:", result.snapshotCount);
    console.log("Interventions:", result.interventionCount);
    console.log("Outcome records:", validation.total);
    console.log("Foreign key errors: 0");
    console.log("Invalid outcome dates: 0");
    console.log("Invalid employee statuses: 0");
    console.log("Database:", DB_PATH);
    console.log("Ground truth:", GROUND_TRUTH_PATH);

} catch (error) {
    console.error("\nGENERATION FAILED:", error.message);
    process.exitCode = 1;

} finally {
    db.close();
}
