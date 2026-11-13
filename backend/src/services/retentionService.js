const db = require("../config/db");

const CUTOFF = "2024-12-01";

function getEmployeeSignals() {
  return db
    .prepare(
      `
        SELECT
            e.employee_id,
            e.first_name,
            e.last_name,
            r.role_title,
            t.team_name,

            (
              SELECT ts.tenure_months
              FROM tenure_snapshots ts
              WHERE ts.employee_id = e.employee_id
              AND ts.snapshot_date <= ?
              ORDER BY ts.snapshot_date DESC
              LIMIT 1
            ) AS tenure_months,
            (
                SELECT es.engagement_score
                FROM engagement_surveys es
                WHERE es.employee_id = e.employee_id
                AND es.survey_status = 'completed'
                AND es.survey_date <= ?
                ORDER BY es.survey_date DESC
                LIMIT 1
            ) AS engagement_score,

            (
    SELECT AVG(recent.weekly_hours)
    FROM (
        SELECT ws.weekly_hours
        FROM workload_snapshots ws
        WHERE ws.employee_id = e.employee_id
        AND ws.snapshot_date <= ?
        ORDER BY ws.snapshot_date DESC
        LIMIT 3
    ) AS recent
) AS average_weekly_hours,
            (
                SELECT MAX(ph.promotion_date)
                FROM promotion_history ph
                WHERE ph.employee_id = e.employee_id
                AND ph.promotion_date <= ?
            ) AS last_promotion

        FROM employees e
        JOIN roles r ON e.role_id = r.role_id
        JOIN teams t ON e.team_id = t.team_id

        WHERE e.hire_date <= ?
        AND EXISTS (
            SELECT 1 FROM tenure_snapshots ts
            WHERE ts.employee_id = e.employee_id
            AND ts.snapshot_date <= ?
        )
    `
    )
    .all(CUTOFF, CUTOFF, CUTOFF, CUTOFF, CUTOFF, CUTOFF);
}

function calculatePriority(employee) {
  let score = 0;
  const reasons = [];

  if (
    employee.engagement_score !== null &&
    employee.engagement_score !== undefined
  ) {
    if (employee.engagement_score < 2.5) {
      score += 35;
      reasons.push("Low engagement");
    } else if (employee.engagement_score < 3.2) {
      score += 20;
      reasons.push("Moderate engagement concern");
    }
  } else {
    reasons.push("Engagement survey unavailable");
  }

  if (employee.average_weekly_hours >= 50) {
    score += 30;
    reasons.push("High average weekly workload");
  } else if (employee.average_weekly_hours >= 45) {
    score += 15;
    reasons.push("Elevated weekly workload");
  }

  if (employee.tenure_months >= 24) {
    if (!employee.last_promotion) {
      score += 15;
      reasons.push("No promotion recorded during extended tenure");
    } else {
      const monthsSincePromotion =
        (new Date(CUTOFF) - new Date(employee.last_promotion)) /
        (1000 * 60 * 60 * 24 * 30.44);
  
      if (monthsSincePromotion >= 24) {
        score += 15;
        reasons.push("Long time since last promotion");
      }
    }
  }

  if (employee.tenure_months >= 12 && employee.tenure_months <= 24) {
    score += 10;
    reasons.push("Employee in 1–2 year tenure range");
  }

  score = Math.min(score, 100);

  return {
    score,
    priority: score >= 60 ? "high" : score >= 30 ? "medium" : "low",
    reasons,
  };
}

function getPrioritizedEmployees() {
  return getEmployeeSignals()
    .map((employee) => {
      const result = calculatePriority(employee);

      return {
        ...employee,
        ...result,
        prediction_date: CUTOFF,
        recommendation:
          "Supportive human review recommended; not an employment decision.",
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  getPrioritizedEmployees,
  calculatePriority,
};
