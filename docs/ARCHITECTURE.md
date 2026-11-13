# WorkforceIQ — System Architecture

## 1. Purpose

WorkforceIQ is a workforce-retention intelligence prototype. It brings together employee, tenure, engagement, workload, compensation, promotion-history and attrition-outcome data to help HR and managers identify cases that may benefit from a supportive review.

It is a **decision-support tool**, not an automated employment decision system. A priority score must not be used by itself to make termination, promotion, compensation or disciplinary decisions.

## 2. High-level architecture

```text
                         WorkforceIQ
                              |
             +----------------+----------------+
             |                                 |
        React Frontend                    Express API
        (Vite / Tailwind)                 (Node.js)
             |                                 |
             | HTTP / JSON                     | mysql2 connection pool
             v                                 v
     Dashboard and modules              MySQL Database
     - Dashboard                        workforce_retention
     - Employees                              |
     - Retention Priorities                    |
     - Interventions                           |
     - Analytics                               |
     - Model Performance                       |
     - Data Quality                            |
     - System Health                            |
                                               |
                                  10 relational data tables
```

## 3. Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, Vite, Tailwind CSS | User interface, navigation, forms, tables and visual summaries |
| Backend | Node.js, Express | REST API, request validation and business logic |
| Database access | mysql2/promise | Connection pooling and SQL queries |
| Database | MySQL 9.4 (InnoDB) | Persistent relational storage |
| Data preparation | JavaScript data-generation and validation scripts | Synthetic data generation and quality checks |
| Evaluation | JavaScript evaluation scripts | Retrospective evaluation against synthetic ground truth |

## 4. Main backend request flow

1. A user opens a page or performs an action in the React application.
2. The frontend sends an HTTP request to the backend API under `/api`.
3. Express routes the request to the relevant handler in `backend/src/routes/api.js`.
4. The route queries or updates MySQL through the shared pool in `backend/src/config/db.js`.
5. The API returns JSON.
6. React updates the displayed page or shows a success/error message.

Frontend development URL: `http://localhost:5173`  
Backend API base URL: `http://localhost:5001/api`

## 5. Database design

The MySQL schema is maintained in `database/schema.mysql.sql`. The database contains these ten tables:

| Table | Purpose |
|---|---|
| `teams` | Organizational teams |
| `roles` | Job roles |
| `employees` | Employee master records |
| `tenure_snapshots` | Employee tenure-related snapshots |
| `engagement_surveys` | Engagement survey records |
| `workload_snapshots` | Workload-related snapshots |
| `compensation_bands` | Compensation-band information |
| `promotion_history` | Historical promotion records |
| `attrition_outcomes` | Recorded attrition outcomes |
| `interventions` | Supportive review/intervention records |

The tables are relational and use InnoDB. Refer to the SQL schema for the authoritative column definitions, keys and constraints.

## 6. Application modules and API mapping

| Frontend module | Main API route(s) |
|---|---|
| Dashboard | `GET /api/dashboard` |
| Employees | `GET /api/employees` |
| Retention Priorities | `GET /api/retention/priorities` |
| Interventions | `GET /api/interventions`, `POST /api/interventions` |
| Analytics | `GET /api/analytics/summary` |
| Model Performance | `GET /api/metrics/model` |
| Data Quality | `GET /api/data-quality` |
| System Health | `GET /api/health` and dashboard/API reachability check |

All routes are mounted under `/api`. Query parameters for employee and retention-priority listing include pagination; retention priorities also support a priority filter.

## 7. Retention-priority logic and evaluation

The current prototype uses rule-based scoring/priority categories. It is not a deployed or independently validated predictive model.

The retrospective metrics endpoint compares priority categories with synthetic attrition outcomes. The documented evaluation is based on 4,951 evaluated records and 563 voluntary exits. The reported high-only and medium-plus-high metrics are retrospective synthetic-data results; they should not be presented as real-world model accuracy or a guarantee of future attrition.

Missing engagement surveys are a data-availability condition. They must not automatically be interpreted as low engagement or as evidence that an employee is at risk.

## 8. Intervention workflow

1. A user reviews a retention-priority record.
2. The user may create a supportive intervention such as a manager conversation, workload review, career discussion or HR support.
3. The intervention is stored in the `interventions` table.
4. The Interventions page displays intervention history and supports searching/filtering the records returned by the API.

Interventions are intended to initiate supportive conversations, not to label employees or trigger punitive action. The current API supports creation and listing; a dedicated status-update workflow is not part of the documented implementation.

## 9. Data scale and current environment

The migrated MySQL database was verified with these row counts:

- Teams: 5
- Roles: 6
- Employees: 10,000
- Tenure snapshots: 118,938
- Engagement surveys: 118,938
- Workload snapshots: 118,938
- Compensation bands: 10,000
- Promotion history: 5,383
- Attrition outcomes: 4,951
- Interventions: 1,549

Total migrated rows: 393,408.

These records are synthetic. They are useful for demonstrating the workflow and testing the prototype, but they do not establish production performance or generalizability.

## 10. Security, privacy and responsible use

- Keep database credentials in `backend/.env`; do not commit `.env`.
- Use `.env.example` for safe configuration documentation.
- Do not expose employee-level data in public demos unless it is synthetic or properly de-identified.
- Do not use priority scores as the sole basis for employment decisions.
- Review data completeness and quality before interpreting analytics.
- Human review and context are required before any supportive action.
- The current prototype does not implement authentication or role-based access control; do not describe it as production-secure.

## 11. Known limitations

- Dataset is synthetic.
- Retrospective evaluation does not prove future predictive performance.
- Authentication and role-based access control are not implemented.
- No dedicated intervention status-update endpoint is documented.
- Retention-priority search in the frontend may be limited to the currently loaded page, while pagination and priority filtering are handled by the backend.
- The employee selector in the intervention form is limited to the records loaded by the frontend.
- The health page is a basic reachability check, not full infrastructure monitoring.

## 12. Repository map

```text
CandidateWorkspace/
├── backend/
│   ├── server.js
│   └── src/
│       ├── config/db.js
│       ├── routes/api.js
│       └── services/retentionService.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── pages/Interventions.jsx
├── database/
│   ├── schema.sql
│   ├── schema.mysql.sql
│   └── workforce_improved.db
├── data/
│   ├── generate.js
│   ├── generate_improved.js
│   ├── validate.js
│   ├── evaluate.js
│   └── ground_truth/
└── docs/
```

This is a logical project map; use the actual repository tree as the final authority if files have since changed.
