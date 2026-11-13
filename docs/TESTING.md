# WorkforceIQ — Testing and Verification Report

**Verification date:** 13 November 2026  
**Environment:** Local macOS development environment; Node.js/Express backend, React/Vite frontend, and MySQL database.  
**Scope:** Manual API smoke tests, input-validation checks, pagination/filter checks, frontend verification, and a dashboard-baseline check.

## 1. Summary

The manual checks listed below passed in the local development environment. All eight tested API endpoints returned HTTP 200. Invalid requests were rejected with the expected client-error responses, pagination returned distinct records across pages, and priority filters returned records matching the requested priority.

This is a **manual verification report**, not evidence of a complete automated regression suite, load test, penetration test, or production-readiness assessment.

## 2. API endpoint smoke tests

The following endpoints returned HTTP 200 during the verification run:

| Endpoint | Result |
|---|---|
| `GET /api/health` | PASS — 200 |
| `GET /api/dashboard` | PASS — 200 |
| `GET /api/employees` | PASS — 200 |
| `GET /api/retention/priorities` | PASS — 200 |
| `GET /api/interventions` | PASS — 200 |
| `GET /api/analytics/summary` | PASS — 200 |
| `GET /api/metrics/model` | PASS — 200 |
| `GET /api/data-quality` | PASS — 200 |

Command used:

```bash
for endpoint in health dashboard employees retention/priorities interventions analytics/summary metrics/model data-quality; do
  echo "Testing: $endpoint"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5001/api/$endpoint"
done
```

## 3. Validation and error handling

| Scenario | Expected/observed result | Status |
|---|---|---|
| `POST /api/interventions` with an empty JSON object `{}` | HTTP 400; `Employee, intervention type, priority and description are required` | PASS |
| Retention priority filter set to `priority=invalid` | HTTP 400; `Priority must be low, medium or high` | PASS |
| Create intervention for `employee_id=INVALID-ID` | HTTP 404; `Employee not found` | PASS |

The invalid-employee request used a valid-looking intervention type, priority, and explanation, but a deliberately nonexistent employee ID. The API rejected it.

## 4. Pagination and priority-filter checks

### Pagination

Requests for `page=1&limit=5` and `page=2&limit=5` both returned five employees. The employee IDs differed between the two pages, and both responses reported a total of 4,951 evaluated employees.

### Priority filters

| Filter | Reported total | Sample response check |
|---|---:|---|
| `priority=low` | 3,323 | Returned sample records all had `priority: "low"` |
| `priority=high` | 53 | Returned sample records all had `priority: "high"` |

The invalid priority value was separately checked and correctly rejected with HTTP 400.

## 5. Intervention history and workflow

- `GET /api/interventions` returned intervention history successfully.
- The response contained 1,552 intervention records at the time of this check.
- Returned records included employee ID/name, intervention type, priority, explanation/description, creation date, and review status.
- The frontend intervention creation and history workflow had previously been manually verified, including confirming that a created intervention remained visible after refreshing the page.

Some historical intervention descriptions contained short placeholder/test-like text. They were left unchanged to preserve existing records; this report does not treat their content as a functional failure.

## 6. Dashboard baseline / data integrity spot check

After the invalid-request tests, the dashboard endpoint returned the following values:

| Metric | Observed value |
|---|---:|
| Total employees | 10,000 |
| Missing surveys | 14,274 |
| Voluntary exits | 563 |
| Employees reviewed | 4,951 |
| High priority | 53 |
| Medium priority | 1,575 |
| Low priority | 3,323 |

These values matched the previously established dashboard baseline. This is a targeted consistency check, not a full database audit or proof that every table remained unchanged.

## 7. Frontend and build verification

The following checks were completed during the development session:

- Frontend production build completed successfully using `npm run build`.
- The eight application tabs were opened and visually checked: Dashboard, Employees, Retention Priorities, Interventions, Analytics, Model Performance, Data Quality, and System Health.
- Intervention creation/history and the System Health screen were checked in the browser.

The frontend build was completed before this final API validation session; no new frontend code changes were made as part of these tests.

## 8. Reproduction commands

Start the backend:

```bash
cd backend
npm run dev
```

In another terminal, check endpoint status codes:

```bash
for endpoint in health dashboard employees retention/priorities interventions analytics/summary metrics/model data-quality; do
  echo "Testing: $endpoint"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5001/api/$endpoint"
done
```

Check pagination:

```bash
curl -s "http://localhost:5001/api/retention/priorities?page=1&limit=5"
curl -s "http://localhost:5001/api/retention/priorities?page=2&limit=5"
```

Check a valid priority filter:

```bash
curl -s "http://localhost:5001/api/retention/priorities?page=1&limit=5&priority=low"
```

Check invalid priority handling:

```bash
curl -i "http://localhost:5001/api/retention/priorities?page=1&limit=5&priority=invalid"
```

Check dashboard totals:

```bash
curl -s http://localhost:5001/api/dashboard | python3 -m json.tool
```

## 9. Automated-test status and remaining coverage

The backend `npm run` command currently lists only:

- `npm start` — `node server.js`
- `npm run dev` — `nodemon server.js`

No backend test script is currently configured in `backend/package.json`. Therefore, no automated backend test suite was run as part of this verification.

Not covered by this report:

- Automated unit/integration regression tests.
- Load, stress, concurrency, or performance testing.
- Security/penetration testing and authentication/authorization review.
- Exhaustive validation of every request field and boundary value.
- Full browser automation across every frontend interaction.
- Production deployment and monitoring verification.

## 10. Responsible-use and data-handling notes

- The dataset is synthetic; these checks do not establish real-world predictive validity.
- The retention score is rule-based and should not be described as a validated machine-learning model.
- Do not use scores to automate hiring, termination, promotion, compensation, or disciplinary decisions.
- Preserve the existing MySQL dataset. Do not run destructive reset, truncate, drop, or data-generation commands as part of routine verification.
