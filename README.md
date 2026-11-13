# WorkforceIQ — Workforce Retention Intelligence System

WorkforceIQ is a workforce analytics prototype that uses historical workforce signals to identify employees who may benefit from supportive human review. It combines a rule-based retention-priority score, workforce analytics, intervention recording, and data-quality checks.

> **Responsible-use note:** WorkforceIQ is a decision-support prototype. It must not be used to make automated employment, termination, promotion, compensation, or disciplinary decisions. A priority score is not a prediction about an individual's intent or a guarantee that someone will leave. Any follow-up must be voluntary, supportive, contextual, and led by an authorized human.

## Current capabilities

- Dashboard with workforce totals and rule-based priority distribution.
- Employee directory with API-supported search and pagination.
- Retention priority assessment with priority filtering and API pagination.
- Supportive intervention creation and intervention history.
- Analytics summary by team, attrition outcome, and month.
- Retrospective model/rule evaluation metrics.
- Data-quality checks for referential integrity and date consistency.
- Basic system-health page using successful API/database query as a connectivity signal.

## Technology

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MySQL, accessed through `mysql2`
- **Evaluation/data preparation:** JavaScript, `better-sqlite3` (used by the dataset/evaluation scripts)

## Repository layout

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
│   └── schema.mysql.sql
├── data/
│   ├── generate.js
│   ├── generate_improved.js
│   ├── validate.js
│   ├── evaluate.js
│   └── evaluate_improved.js
└── docs/
```

## Prerequisites

- Node.js and npm
- MySQL server (the project was developed against MySQL 9.4 on macOS)
- A MySQL account permitted to create/use the project database

## Setup

### 1. Create the database

Create the database once:

```sql
CREATE DATABASE workforce_retention
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. Create the tables

From the project root, apply the MySQL schema:

```bash
mysql -u root -p workforce_retention < database/schema.mysql.sql
```

If the tables and migrated records already exist, **do not rerun migration or data-generation scripts**. The schema uses `CREATE TABLE IF NOT EXISTS`, but this is not a substitute for a reviewed migration plan.

### 3. Configure backend environment

Create `backend/.env` locally. Do not commit this file:

```env
PORT=5001
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_local_mysql_password
MYSQL_DATABASE=workforce_retention
```

The backend connection pool reads these variables from `backend/src/config/db.js`.

### 4. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 5. Start the backend

```bash
cd backend
npm run dev
```

The API listens on `http://localhost:5001` by default.

### 6. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).

### 7. Production build

```bash
cd frontend
npm run build
```

The production output is generated in `frontend/dist`.

## API reference

All routes are mounted under `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Basic backend health response |
| GET | `/api/dashboard` | Workforce and priority summary |
| GET | `/api/employees?page=1&limit=10&search=` | Employee directory, search and pagination |
| GET | `/api/retention/priorities?page=1&limit=10&priority=low` | Priority results, filter and pagination |
| POST | `/api/interventions` | Create a supportive intervention |
| GET | `/api/interventions` | Retrieve intervention history |
| GET | `/api/analytics/summary` | Team, outcome and monthly analytics |
| GET | `/api/metrics/model` | Retrospective evaluation metrics |
| GET | `/api/data-quality` | Data integrity summary |

### Create intervention example

```json
{
  "employee_id": "EMP-000001",
  "intervention_type": "manager_conversation",
  "priority": "medium",
  "explanation": "Offer a voluntary check-in to understand workload and support needs."
}
```

Supported `intervention_type` values: `manager_conversation`, `workload_review`, `career_discussion`, `hr_support`.

Supported priority values: `low`, `medium`, `high`.

The current database schema uses `review_status` values `pending`, `reviewed`, `completed`, and `cancelled`. The current API supports creating and listing interventions; a dedicated status-update endpoint is not currently documented as implemented.

## Retention scoring overview

The current rule-based score is assembled from the signals in the retention service:

- Engagement score below 2.5: +35.
- Engagement score below 3.2 (and at least 2.5): +20.
- Average weekly hours at least 50: +30.
- Average weekly hours at least 45 (and below 50): +15.
- Tenure from 12 to less than 24 months: +10.
- Tenure of at least 24 months without a promotion, or at least 24 months since the last promotion: +15.
- Score is capped at 100.
- Priority bands: high at 60 or above; medium at 30–59; low below 30.

Missing engagement surveys are not assigned an engagement penalty. They should be interpreted as missing information, not evidence of disengagement.

## Current evaluation snapshot

The current API's retrospective evaluation response reports:

- 4,951 evaluated employees
- 563 actual voluntary exits
- High-only: precision 0.3774, recall 0.0355, F1 0.0649
- Medium+high: precision 0.1904, recall 0.5506, F1 0.2830

These metrics are from the project's synthetic dataset and the selected evaluation setup. They are not evidence of real-world predictive validity, fairness, or operational readiness. In particular, the high-only threshold has low recall, while the medium+high grouping has many false positives. A human review process and further validation are necessary.

## Data and safety notes

- The project dataset is synthetic.
- The dashboard and priority output are intended for demonstration and research.
- Do not upload real employee personal data to a public demo.
- Do not use protected characteristics or inferred sensitive traits in scoring.
- Do not interpret missing survey responses as negative sentiment.
- Keep `.env`, database credentials, and local database files out of version control.
- Never rerun generators or migration scripts against a populated database unless their behavior has been reviewed and a separate backup/restore plan exists.

## Testing and verification

Manual verification was completed locally on 13 November 2026. All eight API smoke-test endpoints returned HTTP 200. Additional checks passed for invalid intervention payloads (400), invalid employee IDs (404), invalid priority filters (400), pagination across distinct pages, low/high priority filtering, intervention-history retrieval, and dashboard baseline consistency. The frontend production build and all eight application tabs were also checked; the intervention workflow and System Health screen were manually reviewed.

The backend currently has no configured automated test script (`backend/package.json` exposes `start` and `dev` only). These results are manual checks, not a complete automated regression, load, security, or production-readiness test. See [docs/TESTING.md](docs/TESTING.md) for the detailed test cases, observed counts, reproduction commands, and remaining coverage gaps.

## Known limitations / future work

- Authentication and role-based access control are not implemented.
- Intervention status update/edit workflow is not implemented as a dedicated API.
- System Health is a basic connectivity check, not full observability.
- The retention score is rule-based and should not be described as a validated machine-learning model.
- Synthetic-data metrics may not generalize to real organizations.
- Further tests, documentation review, security hardening, and deployment configuration are required before any real-world use.
