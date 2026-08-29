# Learning Paths

Task 16. An ordered collection of Courses, with its own publish workflow,
learner browsing/joining, and progress derived from the member courses'
`Enrollment` rows.

## Endpoints

| Route | Purpose | Access |
|---|---|---|
| `GET/POST /organizations/me/learning-paths` | Admin list (any status) / create (starts `DRAFT`) | `learning-path:manage` |
| `GET/PATCH /organizations/me/learning-paths/:id` | Admin detail / edit title-description | `learning-path:manage` |
| `PATCH /organizations/me/learning-paths/:id/status` | Publish or archive | `learning-path:manage` |
| `POST/DELETE /organizations/me/learning-paths/:id/courses[/:courseId]` | Add / remove a member course | `learning-path:manage` |
| `PATCH /organizations/me/learning-paths/:id/courses/reorder` | Full reorder (submit every course id) | `learning-path:manage` |
| `GET /organizations/me/learning-path-catalog` | Browse `PUBLISHED` paths, merged with the caller's progress | `course:read` (everyone) |
| `GET /organizations/me/learning-path-catalog/mine` | The caller's own paths, with progress | `course:read` |
| `GET /organizations/me/learning-path-catalog/:id` | One `PUBLISHED` path, with progress | `course:read` |
| `POST /organizations/me/learning-path-catalog/:id/enroll` | Self-join a `PUBLISHED` path | `course:read` |

Same admin/learner split as `CoursesController`/`CatalogController` (Task
11/13) — but the admin side is gated on `learning-path:manage`, a new,
narrower permission held only by HR/L&D Admin and Organization Admin (see
`seed.ts`), not the wider `course:read` the courses admin surface uses —
Task 16 scopes path authoring to "Admin/L&D management" specifically.

## Why progress isn't stored

`LearningPathEnrollment` records *that* a learner is on a path (mandatory
flag, due date, who assigned it) but has no `status`/`startedAt`/
`completedAt` of its own. Path progress is computed at read time
(`LearningPathsService.getProgress`) by joining the path's member courses
against that learner's `Enrollment` rows:

- `COMPLETED` once every **required** course's enrollment is `COMPLETED`.
- `IN_PROGRESS` once any member course (required or optional) has any
  enrollment at all.
- `NOT_STARTED` otherwise.

This mirrors the "derive rather than persist a clock-dependent value"
approach the `Enrollment.dueDate` overdue check already uses, and avoids a
second progress-tracking system that could drift from `Enrollment` — the
one place that's actually updated by the Course Player (Task 15).

## Joining a path cascades course enrollment

`LearningPathsService.assignPath` is the single join path for self-enroll,
and (Task 17) staff assignment: it upserts the `LearningPathEnrollment`
row, then calls `EnrollmentsService.upsertAssignedEnrollment` for every
**required** member course, so the existing Course Player / My Learning
surfaces work on path-sourced enrollments exactly like any other. Optional
courses are never auto-enrolled — a learner opts into those separately
(e.g. via the catalog), same as any other course.

`upsertAssignedEnrollment` deliberately skips the PUBLIC-visibility gate
`EnrollmentsController#selfEnroll` enforces, since a path may legitimately
bundle a PRIVATE course — the path's own `PUBLISHED` status is what vouches
for it being reachable. It still requires the course itself to be
`PUBLISHED`, enforced at path-publish time (see below) rather than at
join time, since by publish the path can no longer reference a course
that isn't ready.

## Publish validation

A path needs at least one course, and every **required** course must
itself be `status: PUBLISHED` (optional courses are exempt). Mirrors
`CoursesService`'s low-bar publish check for consistency, and is what
makes the join-time assumption above ("required courses are always
publishable") hold.

## Un-enrollment

Not implemented in this pass — Task 16's own checklist doesn't ask for it,
unlike Task 14's Enrollment cancel. A learner who joins a path stays on it;
revisit if a later task needs it.
