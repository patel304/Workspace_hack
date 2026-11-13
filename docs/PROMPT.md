# WorkforceIQ — Reusable Project Prompt

Use this prompt when asking an AI coding assistant to understand, explain, review or continue work on the existing WorkforceIQ hackathon project.

---

## Master prompt

You are helping me continue an existing hackathon project named **WorkforceIQ — Workforce Retention Intelligence System**.

### Project goal

WorkforceIQ is a workforce-retention decision-support prototype. It combines employee, tenure, engagement, workload, compensation, promotion-history and attrition-outcome data to help HR/managers identify employees who may benefit from a supportive review.

It is **not** an automated employment decision system. Never recommend using a score alone to make termination, promotion, compensation or disciplinary decisions.

### Existing technology

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: MySQL 9.4 with InnoDB
- Database driver: mysql2/promise
- Data preparation and evaluation: JavaScript scripts
- Frontend API base: `http://localhost:5001/api`

### Existing project structure

```text
CandidateWorkspace/
├── backend/
│   ├── server.js
│   ├── src/config/db.js
│   ├── src/routes/api.js
│   └── src/services/retentionService.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── pages/Interventions.jsx
├── database/
│   ├── schema.sql
│   └── schema.mysql.sql
├── data/
│   ├── generate.js
│   ├── generate_improved.js
│   ├── validate.js
│   ├── evaluate.js
│   └── ground_truth/
└── docs/
```

### Existing API routes

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/employees?page=1&limit=10&search=`
- `GET /api/retention/priorities?page=1&limit=10&priority=low`
- `POST /api/interventions`
- `GET /api/interventions`
- `GET /api/analytics/summary`
- `GET /api/metrics/model`
- `GET /api/data-quality`

### Existing database tables

`teams`, `roles`, `employees`, `tenure_snapshots`, `engagement_surveys`, `workload_snapshots`, `compensation_bands`, `promotion_history`, `attrition_outcomes`, `interventions`.

### Verified project facts

- MySQL database: `workforce_retention`
- Employees: 10,000
- Total migrated rows: 393,408
- Interventions are persisted in MySQL and remain after refresh.
- Backend retention-priority pagination was verified for page 1 and page 2.
- Frontend Vite build passed after the recent App.jsx and Interventions.jsx changes.
- The API's retrospective evaluation is based on synthetic data: 4,951 evaluated records and 563 voluntary exits.
- The model/priority logic is rule-based; retrospective synthetic-data metrics are not proof of real-world predictive accuracy.
- The current prototype has no authentication/RBAC and no dedicated intervention status-update endpoint.

### Critical data-safety rules

1. Do not start the project from scratch.
2. Do not delete, drop, truncate or overwrite the existing MySQL data.
3. Do not run any generator reset option or regenerate the existing movement/ground-truth data.
4. Do not rerun the SQLite-to-MySQL migration against the populated database unless a safe, explicit migration plan is prepared.
5. Do not ask me to reveal my database password or paste `.env`.
6. Keep `.env` out of Git.
7. Do not change schemas or large parts of the application without first inspecting the existing implementation.
8. Do not invent API routes, columns, files, test results or model capabilities.

### How you should work

- First inspect the relevant existing files and current implementation.
- Preserve working features and the current database.
- Give me one practical step at a time.
- When code changes are needed, specify the exact file path.
- Prefer complete, ready-to-paste file replacements when that is safer than multiple small edits.
- Do not assume a file exists; ask me to show the folder/file or inspect the project archive when necessary.
- After a change, provide the exact command to run and tell me what successful output should look like.
- Keep explanations concise and beginner-friendly.
- I often reply with “done” or “next”; continue from the last verified step rather than restarting.

### Responsible-use requirements

- Treat retention priority as a prompt for supportive human review only.
- Do not equate missing survey data with negative engagement.
- Explain that the dataset is synthetic.
- Clearly label retrospective evaluation as synthetic-data evaluation.
- Do not claim production readiness, fairness validation, causal inference or guaranteed attrition prediction unless independently demonstrated.

### Current task

[Replace this line with the exact task you want the assistant to perform.]

Before changing anything, summarize the files you need to inspect and the smallest safe plan. Then proceed step by step.
