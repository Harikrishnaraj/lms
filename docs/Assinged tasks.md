### **Phase 7 — User & Organization Administration** 

### **Task 10 — Department Management**

Implement department management.

Support:

\- Create department  
\- Edit department  
\- Archive department  
\- Assign users  
\- Assign manager  
\- Department details  
\- Department learning metrics placeholder only where supported by existing data

Respect tenant isolation and RBAC.

Build the HR/L\&D interface.  
---

# **Phase 8 — Course System**

**Task  11 — Course Management**  
   
Implement the Course domain.

Support:

\- Course creation  
\- Course editing  
\- Draft  
\- Published  
\- Archived  
\- Course metadata  
\- Difficulty  
\- Duration  
\- Description  
\- Learning objectives  
\- Instructor  
\- Visibility  
\- Categories

Create REST APIs and persistence.

Implement Trainer course-management UI.

Implement HR/Admin course-management views according to permissions.

Do not implement learning content yet.

### **Task 12 — Course Structure & Content**

Implement:

Course  
 ↓  
Modules  
 ↓  
Content Items

Content types initially supported:

\- Video  
\- Document  
\- Text  
\- Learning resource

Implement:

\- Create module  
\- Edit module  
\- Reorder modules  
\- Create content  
\- Edit content  
\- Reorder content  
\- Delete/archive content  
\- Publish validation

Use object-storage abstraction for uploaded assets.

Do not tightly couple the application to a specific storage vendor.  
---

# **Phase 9 — Learner Experience**

### **Task 13 — Course Catalog**

Implement the Learner Course Catalog.

Support:

\- Search  
\- Category filtering  
\- Skill filtering  
\- Difficulty  
\- Duration  
\- Course cards  
\- Course details  
\- Enrollment status

Connect the UI to real APIs.

Do not use static mock course data.

Implement:

\- loading  
\- empty  
\- error  
\- permission  
\- responsive states

### **Task 14 — Enrollment**

Implement enrollment.

Support:

\- Self-enrollment where allowed  
\- Admin assignment  
\- Manager assignment where permitted  
\- Enrollment status  
\- Due date  
\- Mandatory/optional  
\- Start date  
\- Completion date

Implement the Learner My Learning page.

### **Task 15 — Course Player**

Implement the complete learner course-player experience.

Support:

\- Module navigation  
\- Content navigation  
\- Video  
\- Documents  
\- Text  
\- Progress  
\- Mark complete  
\- Previous/next  
\- Resume learning

Persist learning progress.

A learner must be able to leave and return to a course without losing progress.

Implement appropriate authorization.  
---

# **Phase 10 — Learning Paths & Assignments**

### **Task 16 — Learning Paths**

Implement Learning Paths.

Support:

\- Create path  
\- Edit path  
\- Add courses  
\- Reorder courses  
\- Required/optional courses  
\- Publish  
\- Learner progress

Build:

\- Admin/L\&D management  
\- Learner learning-path experience

### **Task 17 — Assignments**

Implement learning assignments.

Support:

\- Assign course to employee  
\- Assign to department  
\- Assign to team  
\- Mandatory/optional  
\- Due date  
\- Assignment status

Implement:

\- HR/L\&D assignment workflow  
\- Manager assignment workflow  
\- Learner assignment view  
---

# **Phase 11 — Assessments**

### **Task 18 — Assessment Engine**

Implement the assessment system.

Support:

\- Assessment creation  
\- Questions  
\- Multiple-choice questions  
\- Options  
\- Correct answer  
\- Points  
\- Passing score  
\- Attempt limit  
\- Assessment status

Implement secure assessment submission.

Do not expose correct answers before submission.

### **Task 19 — Assessment Attempts & Results**

Implement:

Assessment attempt  
 ↓  
Submission  
 ↓  
Evaluation  
 ↓  
Result  
 ↓  
Pass / Fail  
 ↓  
Retry if permitted

Persist attempts.

Prevent duplicate/invalid submissions.

Implement learner assessment UI and trainer assessment management.  
---

# **Phase 12 — Certification**

### **Task 20 — Certificates**

Implement certificate issuance.

Eligibility should be based on the approved course completion and assessment rules.

Support:

\- Certificate record  
\- Certificate number  
\- Issue date  
\- Expiration where applicable  
\- Verification token  
\- Certificate status  
\- Certificate download

Certificate issuance must be idempotent.

Build learner certificate interface.

---

# **Phase 13 — Trainer Portal**

### **Task 21 — Complete Trainer Portal**

Complete the Trainer Portal using the existing backend capabilities.

Implement:

\- Trainer Dashboard  
\- My Courses  
\- Course Builder  
\- Content Manager  
\- Assessment Builder  
\- Learner Progress  
\- Submissions  
\- Feedback  
\- Course Analytics

Connect all views to real APIs.

Remove placeholder/mock data where real functionality exists.

Ensure trainer permissions are enforced server-side.  
---

# **Phase 14 — Manager Portal**

### **Task 22 — Manager Workspace**

Implement the Manager workspace.

Support:

\- Manager Dashboard  
\- My Team  
\- Employee learning details  
\- Team assignments  
\- Team progress  
\- Mandatory training  
\- Team reports

Managers must only access employees and learning data permitted by their organization and manager scope.

Do not give managers HR/Admin permissions unless explicitly defined by RBAC.  
---

# **Phase 15 — HR/L\&D Portal**

### **Task 23 — HR/L\&D Workspace**

Implement the HR/L\&D workspace.

Support:

\- Dashboard  
\- Employees  
\- Departments  
\- Courses  
\- Learning Programs  
\- Learning Paths  
\- Assignments  
\- Training  
\- Compliance  
\- Reports  
\- Analytics  
\- Notifications

Use real database/API data.

Respect tenant and RBAC boundaries.  
---

# **Phase 16 — Organization Admin**

### **Task 24 — Organization Administration**

Implement the Organization Administrator workspace.

Support:

\- Organization dashboard  
\- Organization profile  
\- Users  
\- Roles  
\- Permissions  
\- Integrations  
\- Security settings  
\- Audit logs  
\- System settings  
\- Subscription area if included in the approved scope

Organization administrators must only administer their own organization.  
---

# **Phase 17 — Notifications**

### **Task 25 — Notification System**

Implement the notification architecture.

Support:

\- In-app notifications  
\- Read/unread  
\- Notification preferences  
\- Course assignment  
\- Assessment notification  
\- Completion notification  
\- Certificate notification  
\- Administrative announcement

Use background processing for asynchronous notification delivery.

Create a provider abstraction for external email delivery.  
---

# **Phase 18 — Search**

### **Task 26 — Search**

Implement global search.

Initially use PostgreSQL-backed search unless the TRD has been updated to introduce a dedicated search engine.

Search supported entities:

\- Courses  
\- Learning Paths  
\- Content where permitted  
\- Users where permitted

Respect tenant isolation and permissions.

Add:

\- Suggestions  
\- Filters  
\- Empty state  
\- No-results state  
---

# **Phase 19 — Analytics & Reporting**

### **Task 27 — Learning Analytics**

Implement the learning analytics foundation.

Track supported learning events such as:

\- Course enrollment  
\- Course start  
\- Content completion  
\- Course completion  
\- Assessment attempt  
\- Assessment result  
\- Certificate issuance

Build dashboards appropriate to:

Learner  
Trainer  
Manager  
HR/L\&D  
Organization Admin

Do not invent metrics that cannot be derived reliably from stored data.  
---

# **Phase 20 — Audit**

### **Task 28 — Audit Logging**

Implement audit logging for significant administrative and security-sensitive actions.

Track:

\- Authentication events  
\- User changes  
\- Role changes  
\- Permission changes  
\- Course publishing  
\- Course changes  
\- Assignment changes  
\- Certificate issuance  
\- Organization settings  
\- Administrative actions

Implement:

\- audit persistence  
\- audit API  
\- organization-admin audit UI  
\- filtering  
\- search  
---

# **Phase 21 — AI**

### **Task 29 — AI Foundation**

Do **not**  build all AI features at once.Start with the abstraction.

Implement the LMS AI module boundary.

Create a provider-agnostic AI service interface.

The AI module must support future capabilities:

\- Learning recommendations  
\- Learning-path generation  
\- Content tagging  
\- Natural-language search  
\- AI tutor  
\- Adaptive assessments

For this task:

\- Implement the abstraction.  
\- Implement configuration.  
\- Implement request validation.  
\- Implement authorization.  
\- Implement tenant isolation.  
\- Implement usage/error logging.

Do not add speculative AI features yet.

Then implement each AI capability separately.

---

# **Phase 22 — Security Hardening**

### **Task 30 — Security Review**

Perform a security review of the entire LMS.

Specifically test:

\- Authentication  
\- Authorization  
\- RBAC  
\- Tenant isolation  
\- IDOR vulnerabilities  
\- Input validation  
\- File upload security  
\- API authorization  
\- Session handling  
\- Rate limiting  
\- Sensitive information exposure  
\- Audit logging

Attempt cross-tenant access using automated tests.

Fix confirmed vulnerabilities.

Do not weaken security to make tests pass.  
---

# **Phase 23 — Production Readiness**

### **Task 31 — Testing**

Run a complete testing pass.

Include:

\- Type checking  
\- Linting  
\- Unit tests  
\- Integration tests  
\- API tests  
\- Database tests  
\- RBAC tests  
\- Tenant isolation tests  
\- End-to-end tests

Critical end-to-end journey:

Login  
 ↓  
Organization  
 ↓  
Learner Dashboard  
 ↓  
Course Catalog  
 ↓  
Course Details  
 ↓  
Enrollment  
 ↓  
Course Player  
 ↓  
Assessment  
 ↓  
Result  
 ↓  
Certificate

Fix failures rather than suppressing them.

\---

\# Phase 24 — Final QA

\#\#\# Task 32 — Product QA

\`\`\`text  
Perform a full product QA pass against the PRD, TRD and App Flow.

Create:

docs/qa/requirements-traceability.md

For every major PRD requirement, record:

Requirement  
Implementation  
API  
UI  
Database  
Test  
Status

Identify:

\- Missing functionality  
\- Partial functionality  
\- Broken flows  
\- UX inconsistencies  
\- Authorization problems  
\- Missing states  
\- Technical debt

Do not claim the product is complete if a requirement is not implemented.  
---

# **Phase 25 — Deployment**

### **Task 33 — Deployment Preparation**

Prepare the LMS for production deployment.

Implement/document:

\- Production environment configuration  
\- Container builds  
\- Database migrations  
\- Redis configuration  
\- Object storage configuration  
\- Secrets management  
\- Health checks  
\- Logging  
\- Monitoring  
\- CI/CD  
\- Backup strategy  
\- Rollback strategy

Do not hardcode cloud-provider-specific infrastructure unless explicitly approved.

Create:

docs/deployment/production-runbook.md  
