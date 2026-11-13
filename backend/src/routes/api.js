
const express = require("express");
const db = require("../config/db");
const {
    getPrioritizedEmployees
} = require("../services/retentionService");

const router = express.Router();

// Dashboard summary
router.get("/dashboard", (req, res) => {
    try {
        const employees = db.prepare(`
            SELECT COUNT(*) AS total FROM employees
        `).get();

        const surveys = db.prepare(`
            SELECT COUNT(*) AS missing
            FROM engagement_surveys
            WHERE survey_status = 'missing'
        `).get();

        const outcomes = db.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(ground_truth) AS voluntary_exits
            FROM attrition_outcomes
        `).get();

        const priorities = getPrioritizedEmployees();

        res.json({
            total_employees: employees.total,
            missing_surveys: surveys.missing,
            voluntary_exits: outcomes.voluntary_exits || 0,
            employees_reviewed: priorities.length,
            high_priority: priorities.filter(
                e => e.priority === "high"
            ).length,
            medium_priority: priorities.filter(
                e => e.priority === "medium"
            ).length,
            low_priority: priorities.filter(
                e => e.priority === "low"
            ).length
        });
    } catch (error) {
        res.status(500).json({ error: "Dashboard retrieval failed" });
    }
});

// Employee directory with search and pagination
router.get("/employees", (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(
            1, Number(req.query.limit) || 20
        ));

        const search = String(req.query.search || "").trim();
        const offset = (page - 1) * limit;

        const result = db.prepare(`
            SELECT e.employee_id, e.first_name, e.last_name,
                   e.hire_date, e.employment_status,
                   r.role_title, t.team_name
            FROM employees e
            JOIN roles r ON e.role_id = r.role_id
            JOIN teams t ON e.team_id = t.team_id
            WHERE e.employee_id LIKE @search
               OR e.first_name LIKE @search
               OR e.last_name LIKE @search
            ORDER BY e.employee_id
            LIMIT @limit OFFSET @offset
        `).all({
            search: `%${search}%`,
            limit,
            offset
        });

        res.json({
            page,
            limit,
            employees: result
        });
    } catch (error) {
        res.status(500).json({ error: "Employee retrieval failed" });
    }
});

// Explainable retention priorities
router.get("/retention/priorities", (req, res) => {
    try {
        const priorities = getPrioritizedEmployees();

        const requested = req.query.priority;
        const allowed = ["low", "medium", "high"];

        if (requested && !allowed.includes(requested)) {
            return res.status(400).json({
                error: "Priority must be low, medium or high"
            });
        }

        const filtered = requested
            ? priorities.filter(e => e.priority === requested)
            : priorities;

        res.json({
            prediction_date: "2024-12-01",
            total: filtered.length,
            employees: filtered.slice(0, 500)
        });
    } catch (error) {
        res.status(500).json({ error: "Priority calculation failed" });
    }
});

// Create supportive intervention
router.post("/interventions", (req, res) => {
    try {
        const {
            employee_id,
            intervention_type,
            priority,
            explanation
        } = req.body;

        const types = [
            "manager_conversation",
            "workload_review",
            "career_discussion",
            "hr_support"
        ];

        if (!employee_id || !intervention_type ||
            !priority || !explanation) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        if (!types.includes(intervention_type)) {
            return res.status(400).json({
                error: "Invalid intervention type"
            });
        }

        if (!["low", "medium", "high"].includes(priority)) {
            return res.status(400).json({
                error: "Invalid priority"
            });
        }

        if (typeof explanation !== "string" ||
            explanation.trim().length < 5 ||
            explanation.length > 500) {
            return res.status(400).json({
                error: "Explanation must be 5–500 characters"
            });
        }

        const employee = db.prepare(`
            SELECT employee_id FROM employees
            WHERE employee_id = ?
        `).get(employee_id);

        if (!employee) {
            return res.status(404).json({
                error: "Employee not found"
            });
        }

        const id = `INT-${Date.now()}`;

        db.prepare(`
            INSERT INTO interventions (
                intervention_id, employee_id, created_date,
                intervention_type, priority, explanation,
                review_status, simulated_outcome
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL)
        `).run(
            id,
            employee_id,
            new Date().toISOString().slice(0, 10),
            intervention_type,
            priority,
            explanation.trim()
        );

        res.status(201).json({
            message: "Supportive intervention created",
            intervention_id: id
        });

    } catch (error) {
        res.status(500).json({
            error: "Intervention creation failed"
        });
    }
});

// Data quality
router.get("/data-quality", (req, res) => {
    try {
        const foreignKeys = db.pragma("foreign_key_check");

        const missingSurveys = db.prepare(`
            SELECT COUNT(*) AS total
            FROM engagement_surveys
            WHERE survey_status = 'missing'
        `).get();

        const invalidDates = db.prepare(`
            SELECT COUNT(*) AS total
            FROM attrition_outcomes o
            JOIN employees e ON e.employee_id = o.employee_id
            WHERE o.termination_date < e.hire_date
        `).get();

        res.json({
            foreign_key_errors: foreignKeys.length,
            missing_surveys: missingSurveys.total,
            invalid_termination_dates: invalidDates.total,
            passed: foreignKeys.length === 0 &&
                    invalidDates.total === 0
        });
    } catch (error) {
        res.status(500).json({ error: "Quality check failed" });
    }
});

module.exports = router;
