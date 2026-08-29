# Assignments

Task 17. A bulk-assignment record: "HR assigned Course X to Department Y,
mandatory, due in 30 days." The record itself is an audit trail, not a
second status-tracking system -- see "What this table is (and isn't)"
below.

## Endpoints

| Route | Purpose |
|---|---|
| `POST /organizations/me/assignments` | Assign a course or learning path to a user or department |
| `GET /organizations/me/assignments` | List assignment records (Manager sees only their own) |
| `GET /organizations/me/assignments/:id` | One record with its resolved recipients |

All three require `enrollment:manage` -- the same permission
`EnrollmentsController#assign` already uses for single-user course
assignment, held by Manager, HR/L&D Admin, and Organization Admin, exactly
the actors Task 17 names ("HR/L&D assignment workflow", "Manager
assignment workflow").

## Scope: COURSE or LEARNING_PATH; USER or DEPARTMENT

Task 17's own text says "assign course to employee / department / team."
This implementation also accepts `targetType: LEARNING_PATH` -- a
deliberate scope extension, not a literal reading of the task: Task 16
(built alongside this one) already needs an admin/manager path-assignment
capability, and giving it its own bespoke endpoint would fragment the
audit trail into two places instead of one. See `learning-paths/README.md`
for the cascade this triggers (`LearningPathsService.assignPath`).

"Team" has no dedicated model in this schema yet -- `scopeType: DEPARTMENT`
doubles as team-assignment, the same convention `enrollments/README.md`
already documents for Manager scope (`Department.managerId`).

`scopeType: DEPARTMENT` resolves to every `ACTIVE` user in that department
at the moment the assignment is created -- it is a one-time fan-out, not a
standing rule; a user who joins the department afterward is not
retroactively enrolled. `INACTIVE`/`INVITED` members are skipped, since an
assignment shouldn't create an enrollment obligation for someone who isn't
actually working yet or anymore.

## What this table is (and isn't)

`Assignment` stores the *request* (who assigned what, to whom/which
department, when, mandatory/due-date). It does not store per-recipient
status -- that already lives on the `Enrollment` (or
`LearningPathEnrollment`) row each recipient gets via
`EnrollmentsService.upsertAssignedEnrollment` /
`LearningPathsService.assignPath`. "Assignment status" per learner is
just that row's `status`, visible wherever Enrollments/My Learning already
render it -- there's no separate "assignment status" enum to keep in sync.

This also means there's no learner-facing `/assignments` view: the effect
of being assigned something is that it appears in the learner's existing
My Learning (`GET /enrollments/mine`) or My Learning Paths
(`GET /learning-path-catalog/mine`) list, with `source: ADMIN` or
`MANAGER`, `isMandatory`, and `dueDate` already present on those rows.

## List vs. detail

`GET /assignments` does not resolve recipients per row (would be an
N-department-lookup query on every page load for no reason a list view
needs) -- `recipients: []` on every item, `recipientCount` is the number
to show. `GET /assignments/:id` resolves the full recipient list on
demand.

## Manager scope

Same rule as `EnrollmentsService.assign`: a Manager may only target a user
whose department they manage, or a department they manage directly
(`Department.managerId`). `GET /assignments` and `GET /assignments/:id`
additionally scope a Manager to assignments *they created* -- they don't
see HR's org-wide assignment history, only their own team's.
