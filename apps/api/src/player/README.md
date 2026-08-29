# Course Player

Task 15. The learner-facing view of one `Enrollment`'s course structure and
progress: modules → content items, per-item completion, and a computed
resume position — plus the mutation that advances progress.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /organizations/me/enrollments/:enrollmentId/player` | Course structure (modules + `ACTIVE` content items, in position order) merged with this enrollment's per-item progress and a `resumeContentItemId` |
| `POST /organizations/me/enrollments/:enrollmentId/content/:contentItemId/progress` | Mark a content item `IN_PROGRESS` (opened) or `COMPLETED` (finished); returns the refreshed player view |

Both are nested under an enrollment, not a course, because everything here
— progress, resume position, completion — is a property of one learner's
*relationship* to a course, not the course itself. A trainer/admin editing
course structure uses `CoursesController`/`ContentItemsController` instead.

## Access control

No `@Permissions()` decorator — access is delegated entirely to
`EnrollmentsService.getById`, which enforces the same rule as
`GET /enrollments/:id`: the enrolled learner, or staff with
`enrollment:manage` whose scope covers that learner (manager scope via
`Department.managerId`, same as everywhere else in Enrollments). This keeps
"who can open this enrollment's player" a single source of truth instead of
a second copy of the ownership rule.

## Progress model

`ContentProgress` is keyed by `(enrollmentId, contentItemId)`, not
`(userId, contentItemId)` — so if a learner is ever unenrolled and
re-enrolled in the same course, they start that course over with fresh
progress under the new `Enrollment` row, rather than silently resuming old
history. This is a deliberate scope decision, not an oversight; revisit if
a future task wants "resume across re-enrollment."

A learner can only move progress forward through this API — to
`IN_PROGRESS` or `COMPLETED` (see `MarkContentProgressDto`). There is no
"unmark" endpoint; `NOT_STARTED` is simply the absence of a
`ContentProgress` row.

## Enrollment status rollup

`PlayerService.markProgress` calls a private `rollUpEnrollmentStatus` after
every mutation:

- `NOT_STARTED` → `IN_PROGRESS` (`startedAt` set) the first time any content
  item in the course is touched.
- → `COMPLETED` (`completedAt` set) once every `ACTIVE` content item in the
  course's modules has a `COMPLETED` `ContentProgress` row for this
  enrollment.

The rollup only ever moves forward — a `COMPLETED` enrollment is left alone
even if the learner revisits a content item afterwards. Archived
(`ContentItemStatus.ARCHIVED`) content items are excluded from both the
denominator and the player response, so archiving content after a learner
has completed a course can't retroactively "uncomplete" them.

## Resume position

`resumeContentItemId` is the first content item, in module/content
position order, whose progress status is not `COMPLETED` — `null` once
everything is done (or the course has no content yet). This is what "leave
and return without losing progress" means server-side: the client never
has to remember where the learner was, it just asks the player endpoint.

## Playback URLs

`VIDEO`/`DOCUMENT`/`RESOURCE` content items resolve `playbackUrl` via
`StoragePort.getDownloadUrl(storageKey)` on every player read (never
persisted) — same storage abstraction `ContentItemsController` uses for
uploads, so playback stays vendor-agnostic (local disk in dev, S3-compatible
in production). `TEXT` items instead return `textBody` inline; there is no
`storageKey` for them.
