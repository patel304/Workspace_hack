# API Reference

Base URL in local development: `http://localhost:5001/api`

All endpoints below are mounted under `/api`.

## `GET /health`

Returns a basic backend health response from the Express server.

## `GET /dashboard`

Returns total employee count, missing survey count, voluntary exit count, number of employees assessed, and priority counts.

## `GET /employees`

Query parameters:
- `page` (default 1)
- `limit` (default 20; maximum 100)
- `search` (matches employee ID, first name, last name)

Response contains `page`, `limit`, `total`, and `employees`.

## `GET /retention/priorities`

Query parameters:
- `page` (default 1)
- `limit` (default 20; maximum 100)
- `priority` (optional: `low`, `medium`, `high`)

Response contains `prediction_date`, `page`, `limit`, `total`, and `employees`.

## `POST /interventions`

JSON body:
```json
{
  "employee_id": "EMP-000001",
  "intervention_type": "manager_conversation",
  "priority": "medium",
  "explanation": "Offer a voluntary check-in to understand support needs."
}
```

`intervention_type`: `manager_conversation`, `workload_review`, `career_discussion`, `hr_support`.

`priority`: `low`, `medium`, `high`.

The route validates the employee and inserts the intervention with a creation date and review status.

## `GET /interventions`

Returns up to 500 intervention records with employee names and intervention details, plus summary counts in the current implementation.

## `GET /analytics/summary`

Returns:
- `teams`: employee and voluntary-exit counts grouped by team.
- `attrition`: counts grouped by attrition outcome type.
- `monthly`: voluntary exits grouped by termination month.

## `GET /metrics/model`

Returns the evaluation date, horizon, evaluated count, actual exits, high-only and medium+high confusion-matrix metrics, and priority distribution.

Metrics are calculated by comparing the priority output with the corresponding `attrition_outcomes` ground-truth records. Interpret as retrospective synthetic-data evaluation only.

## `GET /data-quality`

Returns orphan/reference checks, missing survey count, invalid termination-date count, and an overall `passed` flag.

## Error behavior

Routes return JSON error messages and HTTP error status codes for validation or server failures. The API currently does not implement authentication or role-based authorization.
