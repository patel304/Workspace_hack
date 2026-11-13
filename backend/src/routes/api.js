
const express = require("express");
const db = require("../config/db");

const {
  getPrioritizedEmployees
} = require("../services/retentionService");

const router = express.Router();

// Dashboard summary
router.get("/dashboard", async (req, res) => {
  try {
    const [[employees]] = await db.execute(
      "SELECT COUNT(*) AS total FROM employees"
    );

    const [[surveys]] = await db.execute(`
      SELECT COUNT(*) AS missing
      FROM engagement_surveys
      WHERE survey_status = 'missing'
    `);

    const [[outcomes]] = await db.execute(`
      SELECT COALESCE(SUM(ground_truth), 0) AS voluntary_exits
      FROM attrition_outcomes
    `);

    const priorities = await getPrioritizedEmployees();

    res.json({
      total_employees: Number(employees.total),
      missing_surveys: Number(surveys.missing),
      voluntary_exits: Number(outcomes.voluntary_exits),
      employees_reviewed: priorities.length,
      high_priority: priorities.filter(e => e.priority === "high").length,
      medium_priority: priorities.filter(e => e.priority === "medium").length,
      low_priority: priorities.filter(e => e.priority === "low").length
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Dashboard retrieval failed" });
  }
});

// Employee directory
router.get("/employees", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || "").trim();
    const offset = (page - 1) * limit;
    const searchValue = `%${search}%`;

    const [employees] = await db.execute(`
      SELECT e.employee_id, e.first_name, e.last_name,
             e.hire_date, e.employment_status,
             r.role_title, t.team_name
      FROM employees e
      JOIN roles r ON e.role_id = r.role_id
      JOIN teams t ON e.team_id = t.team_id
      WHERE e.employee_id LIKE ?
         OR e.first_name LIKE ?
         OR e.last_name LIKE ?
      ORDER BY e.employee_id
      LIMIT ? OFFSET ?
    `, [searchValue, searchValue, searchValue, limit, offset]);

    const [[count]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM employees e
      WHERE e.employee_id LIKE ?
         OR e.first_name LIKE ?
         OR e.last_name LIKE ?
    `, [searchValue, searchValue, searchValue]);

    res.json({
      page,
      limit,
      total: Number(count.total),
      employees
    });
  } catch (error) {
    console.error("Employee retrieval error:", error);
    res.status(500).json({ error: "Employee retrieval failed" });
  }
});

// Retention priorities

// Retention priorities with backend pagination
router.get("/retention/priorities", async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

      const requested = req.query.priority;
      const allowed = ["low", "medium", "high"];

      if (requested && !allowed.includes(requested)) {
        return res.status(400).json({
          error: "Priority must be low, medium or high"
        });
      }

      const priorities = await getPrioritizedEmployees();

      const filtered = requested
        ? priorities.filter(e => e.priority === requested)
        : priorities;

      const total = filtered.length;
      const offset = (page - 1) * limit;
      const employees = filtered.slice(offset, offset + limit);

      res.json({
        prediction_date: "2024-12-01",
        page,
        limit,
        total,
        employees
      });
    } catch (error) {
      console.error("Priority calculation error:", error);
      res.status(500).json({
        error: "Priority calculation failed"
      });
    }
  });


// Create supportive intervention
router.post("/interventions", async (req, res) => {
  try {
    const {
        employee_id,
        intervention_type,
        priority,
        review_status
      } = req.body || {};

      const explanation = req.body.explanation || req.body.description || "";

    const typeMap = {
      "Manager Check-in": "manager_conversation",
      "Career Development": "career_discussion",
      "Compensation Review": "hr_support",
      "Workload Adjustment": "workload_review",
      "Training and Upskilling": "career_discussion",
      "Mentorship": "career_discussion",
      "Employee Recognition": "hr_support",
      "Other": "hr_support",
      manager_conversation: "manager_conversation",
      workload_review: "workload_review",
      career_discussion: "career_discussion",
      hr_support: "hr_support"
    };

    const statusMap = {
      planned: "pending",
      in_progress: "reviewed",
      completed: "completed",
      cancelled: "cancelled",
      pending: "pending",
      reviewed: "reviewed"
    };

    const mappedType = typeMap[intervention_type];
    const mappedStatus = statusMap[review_status || req.body.status || "planned"];

    if (!employee_id || !mappedType || !priority || !explanation) {
      return res.status(400).json({
        error: "Employee, intervention type, priority and description are required"
      });
    }

    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    if (!mappedStatus) {
      return res.status(400).json({ error: "Invalid intervention status" });
    }

    if (typeof explanation !== "string" ||
        explanation.trim().length < 5 ||
        explanation.length > 500) {
      return res.status(400).json({
        error: "Description must be 5–500 characters"
      });
    }

    const [employee] = await db.execute(
      "SELECT employee_id FROM employees WHERE employee_id = ?",
      [employee_id]
    );

    if (!employee.length) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const id = `INT-${Date.now()}`;

    await db.execute(`
      INSERT INTO interventions (
        intervention_id, employee_id, created_date,
        intervention_type, priority, explanation,
        review_status, simulated_outcome
      )
      VALUES (?, ?, CURDATE(), ?, ?, ?, ?, NULL)
    `, [
      id,
      employee_id,
      mappedType,
      priority,
      explanation.trim(),
      mappedStatus
    ]);

    res.status(201).json({
      message: "Supportive intervention created",
      intervention_id: id
    });
  } catch (error) {
    console.error("Intervention creation error:", error);
    res.status(500).json({
      error: "Intervention creation failed",
      details: error.message
    });
  }
});

// Get interventions and summary
router.get("/interventions", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        i.intervention_id,
        i.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        i.created_date,
        i.intervention_type,
        i.priority,
        i.explanation,
        i.review_status,
        CASE
          WHEN i.review_status = 'pending' THEN 'planned'
          WHEN i.review_status = 'reviewed' THEN 'in_progress'
          ELSE i.review_status
        END AS status,
        i.explanation AS description
      FROM interventions i
      JOIN employees e ON i.employee_id = e.employee_id
      ORDER BY i.created_date DESC, i.intervention_id DESC
      LIMIT 500
    `);

    const [[counts]] = await db.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(review_status = 'pending') AS planned,
        SUM(review_status = 'completed') AS completed
      FROM interventions
    `);

    res.json({
      total: Number(counts.total),
      planned: Number(counts.planned || 0),
      completed: Number(counts.completed || 0),
      interventions: rows
    });
  } catch (error) {
    console.error("Intervention retrieval error:", error);
    res.status(500).json({
      error: "Intervention retrieval failed",
      details: error.message
    });
  }
});


/* ANALYTICS SUMMARY */
router.get("/analytics/summary", async (req, res) => {
    try {
      const [teams] = await db.execute(`
        SELECT
          t.team_name,
          COUNT(DISTINCT e.employee_id) AS employees,
          COUNT(DISTINCT CASE
            WHEN o.attrition_type = 'voluntary'
            THEN e.employee_id
          END) AS voluntary_exits
        FROM teams t
        LEFT JOIN employees e ON e.team_id = t.team_id
        LEFT JOIN attrition_outcomes o ON o.employee_id = e.employee_id
        GROUP BY t.team_id, t.team_name
        ORDER BY employees DESC
      `);

      const [attrition] = await db.execute(`
        SELECT attrition_type, COUNT(*) AS total
        FROM attrition_outcomes
        GROUP BY attrition_type
      `);

      const [monthly] = await db.execute(`
        SELECT
          DATE_FORMAT(termination_date, '%Y-%m') AS month,
          COUNT(*) AS exits
        FROM attrition_outcomes
        WHERE attrition_type = 'voluntary'
          AND termination_date IS NOT NULL
        GROUP BY DATE_FORMAT(termination_date, '%Y-%m')
        ORDER BY month
      `);

      res.json({ teams, attrition, monthly });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({
        error: "Analytics retrieval failed",
        details: error.message
      });
    }
  });

  /* MODEL PERFORMANCE */
  router.get("/metrics/model", async (req, res) => {
    try {
      const predictions = await getPrioritizedEmployees();

      const [labels] = await db.execute(`
        SELECT employee_id, ground_truth
        FROM attrition_outcomes
        WHERE prediction_date = '2024-12-01'
          AND horizon_months = 6
      `);

      const actual = new Map(
        labels.map(row => [
          row.employee_id,
          Number(row.ground_truth)
        ])
      );

      const evaluated = predictions
        .filter(row => actual.has(row.employee_id))
        .map(row => ({
          ...row,
          actual: actual.get(row.employee_id)
        }));

      const calculateMetrics = (isPositive) => {
        let tp = 0;
        let fp = 0;
        let tn = 0;
        let fn = 0;

        evaluated.forEach(row => {
          const predicted = isPositive(row);
          const truth = row.actual === 1;

          if (predicted && truth) tp++;
          else if (predicted && !truth) fp++;
          else if (!predicted && !truth) tn++;
          else fn++;
        });

        const precision = tp + fp ? tp / (tp + fp) : 0;
        const recall = tp + fn ? tp / (tp + fn) : 0;
        const f1 = precision + recall
          ? (2 * precision * recall) / (precision + recall)
          : 0;

        return {
          tp,
          fp,
          tn,
          fn,
          precision: Number(precision.toFixed(4)),
          recall: Number(recall.toFixed(4)),
          f1_score: Number(f1.toFixed(4))
        };
      };

      res.json({
        prediction_date: "2024-12-01",
        horizon_months: 6,
        evaluated: evaluated.length,
        actual_exits: evaluated.filter(row => row.actual === 1).length,
        high_only: calculateMetrics(row => row.priority === "high"),
        medium_high: calculateMetrics(
          row => row.priority === "high" || row.priority === "medium"
        ),
        priority_distribution: {
          high: predictions.filter(row => row.priority === "high").length,
          medium: predictions.filter(row => row.priority === "medium").length,
          low: predictions.filter(row => row.priority === "low").length
        },
        note: "Retrospective evaluation on synthetic data; not validated production predictions."
      });
    } catch (error) {
      console.error("Model metrics error:", error);
      res.status(500).json({
        error: "Model metrics unavailable",
        details: error.message
      });
    }
  });


// Data quality
router.get("/data-quality", async (req, res) => {
  try {
    const [orphanChecks] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM employees e LEFT JOIN roles r ON e.role_id = r.role_id WHERE r.role_id IS NULL) +
        (SELECT COUNT(*) FROM employees e LEFT JOIN teams t ON e.team_id = t.team_id WHERE t.team_id IS NULL) +
        (SELECT COUNT(*) FROM tenure_snapshots s LEFT JOIN employees e ON s.employee_id = e.employee_id WHERE e.employee_id IS NULL) +
        (SELECT COUNT(*) FROM engagement_surveys s LEFT JOIN employees e ON s.employee_id = e.employee_id WHERE e.employee_id IS NULL) +
        (SELECT COUNT(*) FROM workload_snapshots s LEFT JOIN employees e ON s.employee_id = e.employee_id WHERE e.employee_id IS NULL) +
        (SELECT COUNT(*) FROM compensation_bands c LEFT JOIN employees e ON c.employee_id = e.employee_id WHERE e.employee_id IS NULL) +
        (SELECT COUNT(*) FROM promotion_history p LEFT JOIN employees e ON p.employee_id = e.employee_id WHERE e.employee_id IS NULL) +
        (SELECT COUNT(*) FROM attrition_outcomes o LEFT JOIN employees e ON o.employee_id = e.employee_id WHERE e.employee_id IS NULL) +
        (SELECT COUNT(*) FROM interventions i LEFT JOIN employees e ON i.employee_id = e.employee_id WHERE e.employee_id IS NULL)
        AS total
    `);

    const [[missingSurveys]] = await db.execute(`
      SELECT COUNT(*) AS total FROM engagement_surveys
      WHERE survey_status = 'missing'
    `);

    const [[invalidDates]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM attrition_outcomes o
      JOIN employees e ON e.employee_id = o.employee_id
      WHERE o.termination_date < e.hire_date
    `);

    const foreignKeyErrors = Number(orphanChecks[0].total);

    res.json({
      foreign_key_errors: foreignKeyErrors,
      missing_surveys: Number(missingSurveys.total),
      invalid_termination_dates: Number(invalidDates.total),
      passed: foreignKeyErrors === 0 && Number(invalidDates.total) === 0
    });
  } catch (error) {
    console.error("Data quality error:", error);
    res.status(500).json({ error: "Quality check failed" });
  }
});

module.exports = router;
