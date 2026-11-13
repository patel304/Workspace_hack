
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const db = new Database(
    path.join(__dirname, "../database/workforce.db")
);

db.pragma("foreign_keys = ON");

const SEED = 20261022;
const EMPLOYEE_COUNT = 10000;
const MONTHS = 24;

let seed = SEED;

function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

function pick(arr) {
    return arr[Math.floor(random() * arr.length)];
}

function pad(n, length = 6) {
    return String(n).padStart(length, "0");
}

function dateFor(monthIndex) {
    const date = new Date(Date.UTC(2024, monthIndex, 1));
    return date.toISOString().slice(0, 10);
}

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

const statements = {
    team: db.prepare(`
        INSERT INTO teams(team_id, team_name, department)
        VALUES (?, ?, ?)
    `),

    role: db.prepare(`
        INSERT INTO roles(role_id, role_title, role_level, role_category)
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

const firstNames = [
    "Aarav", "Arjun", "Rohan", "Vikram", "Rahul",
    "Priya", "Ananya", "Neha", "Kavya", "Isha"
];

const lastNames = [
    "Sharma", "Patel", "Verma", "Gupta", "Singh",
    "Kumar", "Reddy", "Mehta", "Joshi", "Das"
];

const anomalies = [];

const generate = db.transaction(() => {

    // 1. Parent/master data
    teams.forEach(t => statements.team.run(...t));
    roles.forEach(r => statements.role.run(...r));

    let voluntaryCount = 0;
    let interventionCount = 0;

    // 2. Generate employees and dependent histories
    for (let i = 1; i <= EMPLOYEE_COUNT; i++) {

        const employeeId = `EMP-${pad(i)}`;

        const originalRole = pick(roles);
        const originalTeam = pick(teams);

        const hireDate = dateFor(
            Math.floor(random() * 24)
        );

        // Generate future voluntary attrition at the 6-month horizon.
        const leaves = random() < 0.10;

        let terminationDate = null;

        if (leaves) {
            const exitMonth = 12 + Math.floor(random() * 6);
            terminationDate = dateFor(exitMonth);
            voluntaryCount++;
        }

        const lastName = pick(lastNames);

        statements.employee.run(
            employeeId,
            pick(firstNames),
            lastName,
            originalRole[0],
            originalTeam[0],
            hireDate,
            leaves ? "terminated" : "active"
        );

        // Compensation baseline
        statements.compensation.run(
            `COMP-${pad(i)}`,
            employeeId,
            pick(["B1", "B2", "B3", "B4"]),
            hireDate,
            null
        );

        let currentRole = originalRole[0];
        let currentTeam = originalTeam[0];

        let previousRole = null;
        let promotionDone = false;

        const baselineEngagement = 2.5 + random() * 2.3;

        for (let m = 0; m < MONTHS; m++) {

            const snapshotDate = dateFor(m);

            if (snapshotDate < hireDate) continue;

            if (terminationDate && snapshotDate >= terminationDate) {
                break;
            }

            // Internal transfer: team changes, employee remains employed.
            if (m > 0 && m % 8 === 0 && random() < 0.08) {
                currentTeam = pick(
                    teams.filter(t => t[0] !== currentTeam)
                )[0];
            }

            // Career progression
            if (
                !promotionDone &&
                m >= 8 &&
                random() < 0.08
            ) {
                const oldRole = currentRole;

                const availableRoles = roles.filter(
                    r => r[0] !== oldRole
                );

                currentRole = pick(availableRoles)[0];

                statements.promotion.run(
                    `PROM-${pad(i)}`,
                    employeeId,
                    oldRole,
                    currentRole,
                    snapshotDate
                );

                previousRole = oldRole;
                promotionDone = true;
            }

            // Tenure calculation
            const hire = new Date(hireDate);
            const current = new Date(snapshotDate);

            const tenureMonths =
                (current.getUTCFullYear() - hire.getUTCFullYear()) * 12 +
                current.getUTCMonth() - hire.getUTCMonth();

            statements.tenure.run(
                `SNAP-${employeeId}-${snapshotDate.slice(0, 7)}`,
                employeeId,
                snapshotDate,
                tenureMonths,
                currentTeam,
                currentRole
            );

            // Engagement survey: missingness is not a negative score.
            const missing = random() < 0.12;

            let engagement = Math.max(
                1,
                Math.min(
                    5,
                    baselineEngagement - m * 0.025 +
                    (random() - 0.5) * 0.8
                )
            );

            statements.survey.run(
                `SURV-${2024 + Math.floor(m / 12)}-${pad(i * 24 + m)}`,
                employeeId,
                snapshotDate,
                missing ? null : Number(engagement.toFixed(2)),
                missing ? null : Number(
                    (1 + random() * 4).toFixed(2)
                ),
                missing ? "missing" : "completed"
            );

            // Workload: high workload can be benign.
            const weeklyHours = 35 + random() * 20;
            const overtimeHours = Math.max(
                0,
                weeklyHours - 40
            );

            const workloadLevel =
                weeklyHours >= 55 ? "critical" :
                weeklyHours >= 48 ? "high" :
                weeklyHours >= 40 ? "normal" : "low";

            statements.workload.run(
                `WORK-${pad(i * 24 + m)}`,
                employeeId,
                snapshotDate,
                Number(weeklyHours.toFixed(2)),
                Number(overtimeHours.toFixed(2)),
                workloadLevel
            );
        }

        // 3. Future attrition outcome:
        // Prediction cutoff = 2024-12-01
        // Outcome horizon = Jan-Jun 2025
        statements.outcome.run(
            `OUT-${employeeId}-2025`,
            employeeId,
            "2024-12-01",
            6,
            terminationDate,
            leaves ? "voluntary" : "none",
            leaves ? 1 : 0
        );

        // 4. Supportive intervention based on a synthetic review sample.
        if (random() < 0.15) {

            const priority = pick(["low", "medium", "high"]);

            statements.intervention.run(
                `INT-2025-${pad(i)}`,
                employeeId,
                "2025-01-15",
                pick([
                    "manager_conversation",
                    "workload_review",
                    "career_discussion",
                    "hr_support"
                ]),
                priority,
                "Synthetic supportive review; human assessment required.",
                "pending",
                "simulated_review_pending"
            );

            interventionCount++;
        }
    }

    return { voluntaryCount, interventionCount };
});

// 5. Execute generation atomically.
try {

    const result = generate();

    // 6. Keep deliberate anomaly labels outside production tables.
    const truthDir = path.join(__dirname, "ground_truth");
    fs.mkdirSync(truthDir, { recursive: true });

    const csv = [
        "case_id,issue_type,expected_decision,description"
    ];

    const cases = [
        [
            "ANOM-001",
            "future_information_leak",
            "reject_feature",
            "Feature timestamp occurs after prediction cutoff"
        ],
        [
            "ANOM-002",
            "missing_survey_negative",
            "preserve_missing",
            "Missing survey must not be treated as negative engagement"
        ],
        [
            "ANOM-003",
            "outcome_date_mismatch",
            "flag_exception",
            "Attrition label conflicts with termination date"
        ],
        [
            "ANOM-004",
            "unexplained_individual_score",
            "require_human_review",
            "Individual score requires explanation and human review"
        ]
    ];

    cases.forEach(c => {
        csv.push(c.map(v => `"${v}"`).join(","));
    });

    fs.writeFileSync(
        path.join(truthDir, "ground_truth.csv"),
        csv.join("\n")
    );

    console.log("\nDATA GENERATION COMPLETE");
    console.log("Employees:", EMPLOYEE_COUNT);
    console.log("Voluntary exits:", result.voluntaryCount);
    console.log("Interventions:", result.interventionCount);
    console.log("Seed:", SEED);
    console.log("Ground truth:", truthDir);

} catch (error) {
    console.error("Generation failed:", error.message);
    process.exitCode = 1;
} finally {
    db.close();
}
