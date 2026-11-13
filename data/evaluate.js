
const db = require("../backend/src/config/db");
const { getPrioritizedEmployees } = require("../backend/src/services/retentionService");

const CUTOFF = "2024-12-01";
const HORIZON_END = "2025-06-01";

function metrics(actual, predicted) {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  actual.forEach((value, index) => {
    if (value === 1 && predicted[index] === 1) tp++;
    else if (value === 0 && predicted[index] === 1) fp++;
    else if (value === 0 && predicted[index] === 0) tn++;
    else fn++;
  });

  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  return {
    TP: tp,
    FP: fp,
    TN: tn,
    FN: fn,
    precision: precision.toFixed(4),
    recall: recall.toFixed(4),
    f1_score: f1.toFixed(4),
  };
}

try {
  const scored = getPrioritizedEmployees();

  const outcomes = db.prepare(`
    SELECT e.employee_id, o.horizon_months,
           o.termination_date, o.attrition_type, o.ground_truth
    FROM employees e
    JOIN attrition_outcomes o ON o.employee_id = e.employee_id
    WHERE e.hire_date <= ?
      AND o.prediction_date = ?
  `).all(CUTOFF, CUTOFF);

  if (scored.length !== 4978 || outcomes.length !== scored.length) {
    throw new Error(
      `Cohort mismatch: scored=${scored.length}, outcomes=${outcomes.length}`
    );
  }

  const outcomeMap = new Map(
    outcomes.map(item => [item.employee_id, item])
  );

  const actual = [];
  const high = [];
  const mediumHigh = [];

  for (const employee of scored) {
    const outcome = outcomeMap.get(employee.employee_id);

    if (!outcome || outcome.horizon_months !== 6) {
      throw new Error(`Missing outcome or invalid horizon: ${employee.employee_id}`);
    }

    const validPositive =
      outcome.attrition_type === "voluntary" &&
      outcome.ground_truth === 1 &&
      outcome.termination_date > CUTOFF &&
      outcome.termination_date <= HORIZON_END;

    const validNegative =
      outcome.ground_truth === 0 &&
      (
        (outcome.attrition_type === "none" &&
         outcome.termination_date === null) ||
        (outcome.attrition_type === "involuntary" &&
         outcome.termination_date > CUTOFF &&
         outcome.termination_date <= HORIZON_END)
      );

    if (!validPositive && !validNegative) {
      throw new Error(`Invalid outcome: ${employee.employee_id}`);
    }

    actual.push(validPositive ? 1 : 0);
    high.push(employee.priority === "high" ? 1 : 0);
    mediumHigh.push(
      employee.priority === "high" || employee.priority === "medium" ? 1 : 0
    );
  }

  const positives = actual.filter(value => value === 1).length;

  console.log("\n===== TEMPORAL EVALUATION REPORT =====");
  console.log("Prediction date:", CUTOFF);
  console.log("Outcome horizon:", "6 months");
  console.log("Employees evaluated:", scored.length);
  console.log("Actual voluntary exits:", positives);
  console.log("Attrition rate:", (positives / scored.length * 100).toFixed(2) + "%");

  console.log("\nHIGH PRIORITY ONLY");
  console.table(metrics(actual, high));

  console.log("\nMEDIUM + HIGH PRIORITY");
  console.table(metrics(actual, mediumHigh));

  console.log("\nEvaluation completed successfully.");
} catch (error) {
  console.error("EVALUATION FAILED:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
