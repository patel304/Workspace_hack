# Hackathon Demo Script

Suggested demo duration: 5–7 minutes.

## 1. Introduce the problem (30–45 seconds)

"Workforce information often sits across different systems: engagement, workload, tenure, promotions, and attrition. WorkforceIQ brings these signals into one transparent analytics workflow to help teams identify where supportive human review may be useful."

## 2. Show the data foundation (45 seconds)

- Explain that the prototype uses a synthetic workforce dataset.
- Show the relational MySQL schema and its connected entities.
- Mention referential integrity and selected validation checks.

## 3. Show the dashboard (45 seconds)

- Total employee count.
- Employees assessed.
- Low, medium, and high priority distribution.
- Missing survey count.

## 4. Show employee directory and priorities (60 seconds)

- Search by employee ID or name in the directory.
- Demonstrate employee pagination.
- Filter retention priorities and move between pages.
- Open one example and explain that the score is a transparent rule-based signal.

## 5. Explain the scoring (60 seconds)

Walk through the factors:
- Engagement score.
- Average weekly hours.
- Tenure.
- Time since promotion.

Emphasize that missing survey values do not receive a negative score.

## 6. Show interventions (45 seconds)

- Select an employee.
- Record a supportive intervention.
- Refresh and show that it persists in history.
- Explain that the intervention is a human-led support record, not an automated employment action.

## 7. Show analytics and model evaluation (60 seconds)

- Team-level voluntary exits and monthly trend.
- Explain precision, recall, F1, and the confusion matrix.
- Be candid: current evaluation is on synthetic data and has limitations. The high-only rule has low recall; medium+high increases recall but also produces many false positives.

## 8. Close (20 seconds)

"WorkforceIQ is a transparent prototype for prioritizing supportive human review. It is not an automated employment decision system, and further validation, privacy controls, and security work would be required before real-world use."

## Questions to prepare for

**Is this machine learning?**  
The current retention-priority calculation is rule-based. The evaluation endpoint measures how those priority groupings compare with synthetic ground-truth outcomes; it does not establish a production-ready ML model.

**Can it predict who will resign?**  
It produces priority signals from synthetic historical data. It cannot reliably predict an individual's future behavior and should not be presented as a definitive prediction.

**What happens when a survey is missing?**  
Missing survey responses are treated as missing information, not as negative engagement.

**Can managers automatically take action?**  
No. The intended workflow is human review and supportive intervention. The current prototype records interventions; it does not automate employment decisions.

**What are the current limitations?**  
Synthetic data, no authentication/role access controls, limited intervention workflow, basic system-health checks, and no real-world validation.


## Testing evidence to mention to judges

You can accurately say: "We manually smoke-tested all eight API endpoints; each returned HTTP 200. We also checked invalid-input handling, pagination, priority filters, intervention history, and dashboard consistency. The frontend production build and all eight tabs were checked."

Be transparent that the backend does not currently have an automated test script configured. Do not describe these manual checks as a complete automated test suite, load test, security audit, or production validation. The detailed record is in [TESTING.md](TESTING.md).
