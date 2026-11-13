
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
    team_id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    role_id TEXT PRIMARY KEY,
    role_title TEXT NOT NULL,
    role_level INTEGER NOT NULL CHECK(role_level BETWEEN 1 AND 10),
    role_category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    hire_date TEXT NOT NULL,
    employment_status TEXT NOT NULL DEFAULT 'active'
        CHECK(employment_status IN ('active','terminated')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(role_id) REFERENCES roles(role_id),
    FOREIGN KEY(team_id) REFERENCES teams(team_id)
);

CREATE TABLE IF NOT EXISTS tenure_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    tenure_months INTEGER NOT NULL CHECK(tenure_months >= 0),
    team_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY(team_id) REFERENCES teams(team_id),
    FOREIGN KEY(role_id) REFERENCES roles(role_id),
    UNIQUE(employee_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS engagement_surveys (
    survey_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    survey_date TEXT NOT NULL,
    engagement_score REAL
        CHECK(engagement_score IS NULL OR engagement_score BETWEEN 1 AND 5),
    satisfaction_score REAL
        CHECK(satisfaction_score IS NULL OR satisfaction_score BETWEEN 1 AND 5),
    survey_status TEXT NOT NULL
        CHECK(survey_status IN ('completed','missing')),
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
    CHECK(
        (survey_status = 'missing'
         AND engagement_score IS NULL
         AND satisfaction_score IS NULL)
        OR
        (survey_status = 'completed'
         AND engagement_score IS NOT NULL
         AND satisfaction_score IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS workload_snapshots (
    workload_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    weekly_hours REAL NOT NULL CHECK(weekly_hours BETWEEN 0 AND 100),
    overtime_hours REAL NOT NULL CHECK(overtime_hours BETWEEN 0 AND 60),
    workload_level TEXT NOT NULL
        CHECK(workload_level IN ('low','normal','high','critical')),
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
    UNIQUE(employee_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS compensation_bands (
    compensation_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    band_name TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
    CHECK(effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS promotion_history (
    promotion_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    previous_role_id TEXT,
    new_role_id TEXT NOT NULL,
    promotion_date TEXT NOT NULL,
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY(previous_role_id) REFERENCES roles(role_id),
    FOREIGN KEY(new_role_id) REFERENCES roles(role_id)
);

CREATE TABLE IF NOT EXISTS attrition_outcomes (
    outcome_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    prediction_date TEXT NOT NULL,
    horizon_months INTEGER NOT NULL DEFAULT 6,
    termination_date TEXT,
    attrition_type TEXT NOT NULL
        CHECK(attrition_type IN ('voluntary','involuntary','none')),
    ground_truth INTEGER NOT NULL CHECK(ground_truth IN (0,1)),
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
    CHECK(
        (attrition_type = 'voluntary'
         AND ground_truth = 1
         AND termination_date IS NOT NULL)
        OR
        (attrition_type = 'none'
         AND ground_truth = 0
         AND termination_date IS NULL)
        OR
        (attrition_type = 'involuntary'
         AND ground_truth = 0
         AND termination_date IS NOT NULL)
    ),
    CHECK(horizon_months > 0)
);

CREATE TABLE IF NOT EXISTS interventions (
    intervention_id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    created_date TEXT NOT NULL,
    intervention_type TEXT NOT NULL
        CHECK(intervention_type IN (
            'manager_conversation',
            'workload_review',
            'career_discussion',
            'hr_support'
        )),
    priority TEXT NOT NULL
        CHECK(priority IN ('low','medium','high')),
    explanation TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK(review_status IN ('pending','reviewed','completed','cancelled')),
    simulated_outcome TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_team
ON employees(team_id);

CREATE INDEX IF NOT EXISTS idx_employee_role
ON employees(role_id);

CREATE INDEX IF NOT EXISTS idx_tenure_employee_date
ON tenure_snapshots(employee_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_survey_employee_date
ON engagement_surveys(employee_id, survey_date);

CREATE INDEX IF NOT EXISTS idx_workload_employee_date
ON workload_snapshots(employee_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_promotion_employee_date
ON promotion_history(employee_id, promotion_date);

CREATE INDEX IF NOT EXISTS idx_intervention_employee
ON interventions(employee_id, created_date);

CREATE INDEX IF NOT EXISTS idx_outcome_prediction
ON attrition_outcomes(prediction_date, ground_truth);
