
CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(64) PRIMARY KEY,
    team_name VARCHAR(150) NOT NULL UNIQUE,
    department VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(64) PRIMARY KEY,
    role_title VARCHAR(150) NOT NULL,
    role_level INT NOT NULL CHECK (role_level BETWEEN 1 AND 10),
    role_category VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
    employee_id VARCHAR(64) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    team_id VARCHAR(64) NOT NULL,
    hire_date DATE NOT NULL,
    employment_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active','terminated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    INDEX idx_employee_team (team_id),
    INDEX idx_employee_role (role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenure_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    snapshot_date DATE NOT NULL,
    tenure_months INT NOT NULL CHECK (tenure_months >= 0),
    team_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    UNIQUE KEY uq_tenure_employee_date (employee_id, snapshot_date),
    INDEX idx_tenure_employee_date (employee_id, snapshot_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS engagement_surveys (
    survey_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    survey_date DATE NOT NULL,
    engagement_score DOUBLE NULL,
    satisfaction_score DOUBLE NULL,
    survey_status VARCHAR(20) NOT NULL
        CHECK (survey_status IN ('completed','missing')),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    CHECK (engagement_score IS NULL OR engagement_score BETWEEN 1 AND 5),
    CHECK (satisfaction_score IS NULL OR satisfaction_score BETWEEN 1 AND 5),
    CHECK (
        (survey_status = 'missing'
         AND engagement_score IS NULL
         AND satisfaction_score IS NULL)
        OR
        (survey_status = 'completed'
         AND engagement_score IS NOT NULL
         AND satisfaction_score IS NOT NULL)
    ),
    INDEX idx_survey_employee_date (employee_id, survey_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workload_snapshots (
    workload_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    snapshot_date DATE NOT NULL,
    weekly_hours DOUBLE NOT NULL CHECK (weekly_hours BETWEEN 0 AND 100),
    overtime_hours DOUBLE NOT NULL CHECK (overtime_hours BETWEEN 0 AND 60),
    workload_level VARCHAR(20) NOT NULL
        CHECK (workload_level IN ('low','normal','high','critical')),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    UNIQUE KEY uq_workload_employee_date (employee_id, snapshot_date),
    INDEX idx_workload_employee_date (employee_id, snapshot_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compensation_bands (
    compensation_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    band_name VARCHAR(100) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotion_history (
    promotion_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    previous_role_id VARCHAR(64) NULL,
    new_role_id VARCHAR(64) NOT NULL,
    promotion_date DATE NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (previous_role_id) REFERENCES roles(role_id),
    FOREIGN KEY (new_role_id) REFERENCES roles(role_id),
    INDEX idx_promotion_employee_date (employee_id, promotion_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attrition_outcomes (
    outcome_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL UNIQUE,
    prediction_date DATE NOT NULL,
    horizon_months INT NOT NULL DEFAULT 6,
    termination_date DATE NULL,
    attrition_type VARCHAR(20) NOT NULL
        CHECK (attrition_type IN ('voluntary','involuntary','none')),
    ground_truth TINYINT NOT NULL CHECK (ground_truth IN (0,1)),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    CHECK (
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
    CHECK (horizon_months > 0),
    INDEX idx_outcome_prediction (prediction_date, ground_truth)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interventions (
    intervention_id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    created_date DATE NOT NULL,
    intervention_type VARCHAR(40) NOT NULL
        CHECK (intervention_type IN (
            'manager_conversation',
            'workload_review',
            'career_discussion',
            'hr_support'
        )),
    priority VARCHAR(20) NOT NULL
        CHECK (priority IN ('low','medium','high')),
    explanation TEXT NOT NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','reviewed','completed','cancelled')),
    simulated_outcome TEXT NULL,
    reviewed_by VARCHAR(100) NULL,
    reviewed_at DATETIME NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    INDEX idx_intervention_employee (employee_id, created_date)
) ENGINE=InnoDB;
