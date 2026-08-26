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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
