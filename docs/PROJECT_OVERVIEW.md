# WorkforceIQ — Project Overview

## Problem

Organizations may have workforce signals spread across engagement surveys, workload records, tenure history, promotions, and attrition outcomes. Reviewing these signals manually can be difficult. WorkforceIQ demonstrates how those records can be brought together into a transparent, rule-based prioritization workflow for supportive human review.

## Objective

Build a reproducible prototype that:
1. Integrates related workforce records in a relational database.
2. Calculates transparent retention-priority scores from pre-outcome signals.
3. Displays workforce and team-level summaries.
4. Records supportive interventions.
5. Exposes data-quality and retrospective evaluation information.

## Workflow

```text
Synthetic workforce data
        |
        v
Relational MySQL database
        |
        v
Retention signal aggregation
(tenure, engagement, workload, promotion history)
        |
        v
Transparent rule-based score
        |
        v
Low / Medium / High priority bands
        |
        v
Human review and supportive intervention recording
        |
        v
Analytics, evaluation and data-quality views
```

## Main data entities

The MySQL schema defines ten core tables:

- `teams`
- `roles`
- `employees`
- `tenure_snapshots`
- `engagement_surveys`
- `workload_snapshots`
- `compensation_bands`
- `promotion_history`
- `attrition_outcomes`
- `interventions`

The schema uses primary keys, foreign keys, uniqueness constraints, checks, and indexes to preserve relationships and constrain selected values.

## Scoring logic

The score is explainable and additive. Engagement, average workload, tenure, and promotion recency contribute points according to thresholds documented in the root README. The score is capped at 100 and grouped into low, medium, and high priority bands.

A missing survey is treated as missing data. It is not treated as a low engagement score.

## Human-centered operating principle

A priority band is a prompt to consider whether a supportive conversation may be useful. It is not a decision or instruction about an employee. Human context, consent, and appropriate organizational process must take precedence over the score.
