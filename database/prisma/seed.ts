import { PrismaClient, RoleKey } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'course:create', description: 'Create a new course' },
  { key: 'course:read', description: 'View course content' },
  { key: 'course:update', description: 'Edit an existing course' },
  { key: 'course:publish', description: 'Publish a course to learners' },
  { key: 'course:delete', description: 'Delete a course' },
  { key: 'enrollment:manage', description: "Enroll or unenroll learners, view a team's progress" },
  { key: 'report:view', description: 'View reports and dashboards' },
  { key: 'report:export', description: 'Export reports (e.g. compliance, CSV)' },
  { key: 'user:view', description: "View an organization's members and their roles" },
  { key: 'user:manage', description: "Assign or revoke an organization member's role" },
  { key: 'organization:manage', description: 'Edit organization settings (name, branding)' },
  { key: 'learning-path:manage', description: 'Create, edit, publish, and assign learning paths' },
] as const;

/**
 * The initial role -> permission matrix (TRD §10.2). This is the single
 * source of truth for what each of the 5 platform roles can do; see
 * apps/api/src/authorization/README.md for how it's enforced at request time.
 */
const ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  [RoleKey.LEARNER]: ['course:read'],
  [RoleKey.TRAINER]: ['course:create', 'course:read', 'course:update', 'course:publish', 'report:view'],
  [RoleKey.MANAGER]: ['course:read', 'report:view', 'enrollment:manage', 'user:view'],
  [RoleKey.HR_LD_ADMIN]: [
    'course:create',
    'course:read',
    'course:update',
    'course:publish',
    'course:delete',
    'enrollment:manage',
    'learning-path:manage',
    'report:view',
    'report:export',
    'user:view',
    'user:manage',
  ],
  [RoleKey.ORGANIZATION_ADMIN]: PERMISSIONS.map((permission) => permission.key),
};

const ROLES: { key: RoleKey; name: string; description: string }[] = [
  { key: RoleKey.LEARNER, name: 'Learner', description: 'Enrolls in and completes courses' },
  { key: RoleKey.TRAINER, name: 'Trainer', description: 'Authors and publishes course content' },
  { key: RoleKey.MANAGER, name: 'Manager', description: "Views their team's learning progress and reports" },
  {
    key: RoleKey.HR_LD_ADMIN,
    name: 'HR/L&D Administrator',
    description: 'Manages course content, enrollments, and organization members',
  },
  {
    key: RoleKey.ORGANIZATION_ADMIN,
    name: 'Organization Administrator',
    description: 'Full administrative control over the organization',
  },
];

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  });
  console.log(`Seeded organization: ${organization.name} (${organization.id})`);

  const permissionsByKey = new Map<string, { id: string }>();
  for (const permission of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
    permissionsByKey.set(row.key, row);
  }
  console.log(`Seeded ${permissionsByKey.size} permissions`);

  for (const role of ROLES) {
    const roleRow = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });

    const permissionKeys = ROLE_PERMISSIONS[role.key];
    for (const permissionKey of permissionKeys) {
      const permission = permissionsByKey.get(permissionKey);
      if (!permission) {
        throw new Error(`Seed error: role ${role.key} references unknown permission ${permissionKey}`);
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleRow.id, permissionId: permission.id } },
        update: {},
        create: { roleId: roleRow.id, permissionId: permission.id },
      });
    }
    console.log(`Seeded role: ${role.name} (${permissionKeys.length} permissions)`);
  }

  const orgAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: RoleKey.ORGANIZATION_ADMIN } });
  const demoMembership = await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: 'auth0|demo-admin' } },
    update: {},
    create: {
      organizationId: organization.id,
      userId: 'auth0|demo-admin',
      roleId: orgAdminRole.id,
    },
  });
  console.log(`Seeded membership: auth0|demo-admin as Organization Administrator (${demoMembership.id})`);

  const departments = [
    { name: 'Engineering' },
    { name: 'People Ops' },
    { name: 'Sales' },
  ];
  const departmentsByName = new Map<string, { id: string }>();
  for (const department of departments) {
    const row = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: department.name } },
      update: {},
      create: { organizationId: organization.id, name: department.name },
    });
    departmentsByName.set(row.name, row);
  }
  console.log(`Seeded ${departmentsByName.size} departments`);

  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'alex.johnson@demo-org.example' } },
    update: {},
    create: {
      organizationId: organization.id,
      externalId: 'auth0|demo-admin',
      email: 'alex.johnson@demo-org.example',
      firstName: 'Alex',
      lastName: 'Johnson',
      jobTitle: 'Head of People',
      departmentId: departmentsByName.get('People Ops')!.id,
      status: 'ACTIVE',
    },
  });
  console.log('Seeded user: alex.johnson@demo-org.example (linked to auth0|demo-admin)');

  // --- Task 13/14 fixtures: catalog + enrollment need at least one
  // PUBLISHED + PUBLIC course, and a learner/manager pair in the same
  // department to exercise manager-scoped assignment. ---

  const managerRole = await prisma.role.findUniqueOrThrow({ where: { key: RoleKey.MANAGER } });
  const trainerRole = await prisma.role.findUniqueOrThrow({ where: { key: RoleKey.TRAINER } });
  const learnerRole = await prisma.role.findUniqueOrThrow({ where: { key: RoleKey.LEARNER } });

  const engineering = departmentsByName.get('Engineering')!;

  const priya = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'priya.nair@demo-org.example' } },
    update: {},
    create: {
      organizationId: organization.id,
      externalId: 'auth0|demo-manager',
      email: 'priya.nair@demo-org.example',
      firstName: 'Priya',
      lastName: 'Nair',
      jobTitle: 'Engineering Manager',
      departmentId: engineering.id,
      status: 'ACTIVE',
    },
  });
  await prisma.department.update({ where: { id: engineering.id }, data: { managerId: priya.id } });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: 'auth0|demo-manager' } },
    update: {},
    create: { organizationId: organization.id, userId: 'auth0|demo-manager', roleId: managerRole.id },
  });

  const sam = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'sam.rivera@demo-org.example' } },
    update: {},
    create: {
      organizationId: organization.id,
      externalId: 'auth0|demo-trainer',
      email: 'sam.rivera@demo-org.example',
      firstName: 'Sam',
      lastName: 'Rivera',
      jobTitle: 'Senior Trainer',
      departmentId: engineering.id,
      status: 'ACTIVE',
    },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: 'auth0|demo-trainer' } },
    update: {},
    create: { organizationId: organization.id, userId: 'auth0|demo-trainer', roleId: trainerRole.id },
  });

  const jordan = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'jordan.lee@demo-org.example' } },
    update: {},
    create: {
      organizationId: organization.id,
      externalId: 'auth0|demo-learner',
      email: 'jordan.lee@demo-org.example',
      firstName: 'Jordan',
      lastName: 'Lee',
      jobTitle: 'Software Engineer',
      departmentId: engineering.id,
      status: 'ACTIVE',
    },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: 'auth0|demo-learner' } },
    update: {},
    create: { organizationId: organization.id, userId: 'auth0|demo-learner', roleId: learnerRole.id },
  });
  console.log('Seeded manager/trainer/learner demo users (Priya, Sam, Jordan)');

  const complianceCategory = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Compliance' } },
    update: {},
    create: { organizationId: organization.id, name: 'Compliance' },
  });

  const safetyCourse = await prisma.course.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: organization.id,
      title: 'Workplace Safety Basics',
      description: 'Annual mandatory workplace safety refresher.',
      status: 'PUBLISHED',
      difficulty: 'BEGINNER',
      durationMinutes: 30,
      learningObjectives: ['Identify common workplace hazards', 'Know the incident reporting process'],
      visibility: 'PUBLIC',
      instructorId: sam.id,
      categories: { connect: [{ id: complianceCategory.id }] },
    },
  });

  const safetyModule = await prisma.module.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      organizationId: organization.id,
      courseId: safetyCourse.id,
      title: 'Getting Started',
      position: 0,
    },
  });

  await prisma.contentItem.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      organizationId: organization.id,
      moduleId: safetyModule.id,
      title: 'Welcome & Overview',
      type: 'TEXT',
      position: 0,
      status: 'ACTIVE',
      textBody: 'Welcome to Workplace Safety Basics. This course covers the essentials every employee needs to know.',
    },
  });
  await prisma.contentItem.upsert({
    where: { id: '00000000-0000-4000-8000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000004',
      organizationId: organization.id,
      moduleId: safetyModule.id,
      title: 'Reporting a Hazard',
      type: 'TEXT',
      position: 1,
      status: 'ACTIVE',
      textBody: 'If you notice a hazard, report it to your manager and log it in the safety register within 24 hours.',
    },
  });

  // Second module so the course player (Task 15) has more than one module
  // to navigate through, not just one module with two items.
  const emergencyModule = await prisma.module.upsert({
    where: { id: '00000000-0000-4000-8000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000005',
      organizationId: organization.id,
      courseId: safetyCourse.id,
      title: 'Emergency Procedures',
      position: 1,
    },
  });

  await prisma.contentItem.upsert({
    where: { id: '00000000-0000-4000-8000-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000006',
      organizationId: organization.id,
      moduleId: emergencyModule.id,
      title: 'Evacuation Routes',
      type: 'TEXT',
      position: 0,
      status: 'ACTIVE',
      textBody: 'Know your nearest two exits. Evacuation routes are posted at every floor exit and stairwell.',
    },
  });
  console.log('Seeded course: Workplace Safety Basics (PUBLISHED, PUBLIC) — 2 modules, 3 content items');

  const jordanEnrollment = await prisma.enrollment.upsert({
    where: { organizationId_userId_courseId: { organizationId: organization.id, userId: jordan.id, courseId: safetyCourse.id } },
    update: {},
    create: {
      organizationId: organization.id,
      userId: jordan.id,
      courseId: safetyCourse.id,
      status: 'IN_PROGRESS',
      isMandatory: false,
      source: 'SELF',
      startedAt: new Date(),
    },
  });

  await prisma.contentProgress.upsert({
    where: { enrollmentId_contentItemId: { enrollmentId: jordanEnrollment.id, contentItemId: '00000000-0000-4000-8000-000000000003' } },
    update: {},
    create: {
      organizationId: organization.id,
      enrollmentId: jordanEnrollment.id,
      contentItemId: '00000000-0000-4000-8000-000000000003',
      status: 'COMPLETED',
      completedAt: new Date(),
      lastAccessedAt: new Date(),
    },
  });
  console.log('Seeded enrollment: jordan.lee self-enrolled in Workplace Safety Basics (1 of 3 items complete, IN_PROGRESS)');

  // --- Task 16/17 fixtures: a second course, a Learning Path bundling both
  // courses, a path assignment (Task 16) and a department-scope course
  // assignment (Task 17). Kept separate from the safetyCourse/jordanEnrollment
  // fixtures above rather than folding safetyCourse into the path as a
  // required course, so the existing "jordan self-enrolled, SELF source"
  // story stays untouched -- safetyCourse is included in the path as
  // OPTIONAL, which the path-join cascade never touches. ---

  const privacyCourse = await prisma.course.upsert({
    where: { id: '00000000-0000-4000-8000-000000000007' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000007',
      organizationId: organization.id,
      title: 'Data Privacy Essentials',
      description: 'How to handle customer and employee data responsibly.',
      status: 'PUBLISHED',
      difficulty: 'BEGINNER',
      durationMinutes: 20,
      learningObjectives: ['Recognize personal data', 'Know when to escalate a data request'],
      visibility: 'PUBLIC',
      instructorId: sam.id,
      categories: { connect: [{ id: complianceCategory.id }] },
    },
  });

  const privacyModule = await prisma.module.upsert({
    where: { id: '00000000-0000-4000-8000-000000000008' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000008',
      organizationId: organization.id,
      courseId: privacyCourse.id,
      title: 'The Basics',
      position: 0,
    },
  });

  await prisma.contentItem.upsert({
    where: { id: '00000000-0000-4000-8000-000000000009' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000009',
      organizationId: organization.id,
      moduleId: privacyModule.id,
      title: 'What Counts as Personal Data',
      type: 'TEXT',
      position: 0,
      status: 'ACTIVE',
      textBody: 'Personal data is any information that can identify an individual, directly or indirectly.',
    },
  });
  console.log('Seeded course: Data Privacy Essentials (PUBLISHED, PUBLIC) — 1 module, 1 content item');

  const onboardingPath = await prisma.learningPath.upsert({
    where: { id: '00000000-0000-4000-8000-00000000000a' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-00000000000a',
      organizationId: organization.id,
      title: 'New Engineer Onboarding',
      description: 'Everything a new engineering hire completes in their first month.',
      status: 'PUBLISHED',
      createdById: (await prisma.user.findUniqueOrThrow({ where: { organizationId_email: { organizationId: organization.id, email: 'alex.johnson@demo-org.example' } } })).id,
    },
  });

  await prisma.learningPathCourse.upsert({
    where: { learningPathId_courseId: { learningPathId: onboardingPath.id, courseId: safetyCourse.id } },
    update: {},
    create: {
      organizationId: organization.id,
      learningPathId: onboardingPath.id,
      courseId: safetyCourse.id,
      position: 0,
      isRequired: false,
    },
  });
  await prisma.learningPathCourse.upsert({
    where: { learningPathId_courseId: { learningPathId: onboardingPath.id, courseId: privacyCourse.id } },
    update: {},
    create: {
      organizationId: organization.id,
      learningPathId: onboardingPath.id,
      courseId: privacyCourse.id,
      position: 1,
      isRequired: true,
    },
  });
  console.log('Seeded learning path: New Engineer Onboarding (PUBLISHED) — Workplace Safety Basics [optional], Data Privacy Essentials [required]');

  const alex = await prisma.user.findUniqueOrThrow({
    where: { organizationId_email: { organizationId: organization.id, email: 'alex.johnson@demo-org.example' } },
  });

  const pathDueDate = new Date();
  pathDueDate.setDate(pathDueDate.getDate() + 21);

  await prisma.learningPathEnrollment.upsert({
    where: { organizationId_userId_learningPathId: { organizationId: organization.id, userId: jordan.id, learningPathId: onboardingPath.id } },
    update: {},
    create: {
      organizationId: organization.id,
      userId: jordan.id,
      learningPathId: onboardingPath.id,
      isMandatory: true,
      source: 'ADMIN',
      assignedById: alex.id,
      dueDate: pathDueDate,
    },
  });
  // Cascades to an Enrollment in every REQUIRED path course, mirroring what
  // LearningPathsService.assignPath does at request time.
  await prisma.enrollment.upsert({
    where: { organizationId_userId_courseId: { organizationId: organization.id, userId: jordan.id, courseId: privacyCourse.id } },
    update: { isMandatory: true, dueDate: pathDueDate, source: 'ADMIN', assignedById: alex.id },
    create: {
      organizationId: organization.id,
      userId: jordan.id,
      courseId: privacyCourse.id,
      isMandatory: true,
      dueDate: pathDueDate,
      source: 'ADMIN',
      assignedById: alex.id,
    },
  });
  await prisma.assignment.upsert({
    where: { id: '00000000-0000-4000-8000-00000000000b' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-00000000000b',
      organizationId: organization.id,
      targetType: 'LEARNING_PATH',
      learningPathId: onboardingPath.id,
      scopeType: 'USER',
      userId: jordan.id,
      isMandatory: true,
      dueDate: pathDueDate,
      createdById: alex.id,
      recipientCount: 1,
    },
  });
  console.log('Seeded assignment: alex.johnson assigned New Engineer Onboarding path to jordan.lee (mandatory, due in 21 days)');

  // Manager (Priya) assigns Data Privacy Essentials to her whole department
  // (Task 17 department/"team" scope) -- demonstrates the recipient
  // resolution fan-out; Priya and Sam get fresh enrollments, Jordan's is
  // updated in place (already exists from the path cascade above).
  const engineeringMembers = await prisma.user.findMany({
    where: { organizationId: organization.id, departmentId: engineering.id, status: 'ACTIVE' },
    select: { id: true },
  });
  for (const member of engineeringMembers) {
    await prisma.enrollment.upsert({
      where: { organizationId_userId_courseId: { organizationId: organization.id, userId: member.id, courseId: privacyCourse.id } },
      update: { isMandatory: true, source: 'MANAGER', assignedById: priya.id },
      create: {
        organizationId: organization.id,
        userId: member.id,
        courseId: privacyCourse.id,
        isMandatory: true,
        source: 'MANAGER',
        assignedById: priya.id,
      },
    });
  }
  await prisma.assignment.upsert({
    where: { id: '00000000-0000-4000-8000-00000000000c' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-00000000000c',
      organizationId: organization.id,
      targetType: 'COURSE',
      courseId: privacyCourse.id,
      scopeType: 'DEPARTMENT',
      departmentId: engineering.id,
      isMandatory: true,
      createdById: priya.id,
      recipientCount: engineeringMembers.length,
    },
  });
  console.log(`Seeded assignment: priya.nair assigned Data Privacy Essentials to Engineering (${engineeringMembers.length} recipients)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
