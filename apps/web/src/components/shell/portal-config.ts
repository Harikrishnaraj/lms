import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  Compass,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
  UsersRound,
  Search,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

/**
 * The 4 concrete portals the shell is rendered for. `admin` is the umbrella
 * portal; which admin *workspace* is active is a second dimension the shell
 * shows in the sidebar and a workspace switcher.
 *
 * Portal identity is derived from the URL by app/**\/layout.tsx, not from
 * the caller's role — a user with multiple roles can navigate between
 * portals by URL, and the guard layer (added when auth is wired up
 * client-side) will 403 them out if they land somewhere they can't reach.
 */
export type Portal = 'learner' | 'trainer' | 'admin';
export type AdminWorkspace = 'manager' | 'hr' | 'organization';

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface PortalConfig {
  portal: Portal;
  /** Portal-level workspace, only set for /admin/{manager|hr|organization}. */
  workspace?: AdminWorkspace;
  /** Shown in the sidebar header + browser tab title suffix. */
  label: string;
  /** Sidebar navigation groups, ordered top-to-bottom. */
  nav: NavGroup[];
}

// ---- Learner ----
const LEARNER_CONFIG: PortalConfig = {
  portal: 'learner',
  label: 'Learner',
  nav: [
    {
      items: [
        { label: 'Dashboard', href: '/learner', icon: LayoutDashboard },
        { label: 'Search', href: '/learner/search', icon: Search },
        { label: 'Browse catalog', href: '/learner/catalog', icon: Compass },
        { label: 'My learning', href: '/learner/courses', icon: BookOpen },
        { label: 'Learning paths', href: '/learner/paths', icon: GraduationCap },
        { label: 'Assessments', href: '/learner/assessments', icon: ClipboardList },
        { label: 'Certificates', href: '/learner/certificates', icon: Trophy },
        { label: 'Calendar', href: '/learner/calendar', icon: Calendar },
        { label: 'Discussions', href: '/learner/discussions', icon: MessagesSquare },
      ],
    },
  ],
};

// ---- Trainer ----
const TRAINER_CONFIG: PortalConfig = {
  portal: 'trainer',
  label: 'Trainer',
  nav: [
    {
      items: [
        { label: 'Dashboard', href: '/trainer', icon: LayoutDashboard },
        { label: 'Courses', href: '/trainer/courses', icon: BookOpen },
        { label: 'Assessments', href: '/trainer/assessments', icon: ClipboardList },
        { label: 'Submissions', href: '/trainer/submissions', icon: CheckSquare },
        { label: 'Analytics', href: '/trainer/analytics', icon: BarChart3 },
      ],
    },
  ],
};

// ---- Admin: Manager workspace ----
const ADMIN_MANAGER_CONFIG: PortalConfig = {
  portal: 'admin',
  workspace: 'manager',
  label: 'Manager',
  nav: [
    {
      items: [
        { label: 'Overview', href: '/admin/manager', icon: LayoutDashboard },
        { label: 'My team', href: '/admin/manager/team', icon: UsersRound },
        { label: 'Assignments', href: '/admin/manager/assignments', icon: ClipboardList },
        { label: 'Team reports', href: '/admin/manager/reports', icon: FileBarChart },
      ],
    },
  ],
};

// ---- Admin: HR / L&D workspace ----
const ADMIN_HR_CONFIG: PortalConfig = {
  portal: 'admin',
  workspace: 'hr',
  label: 'HR / L&D',
  nav: [
    {
      items: [
        { label: 'Overview', href: '/admin/hr', icon: LayoutDashboard },
        { label: 'Users', href: '/admin/hr/users', icon: Users },
        { label: 'Departments', href: '/admin/hr/departments', icon: Building2 },
        { label: 'Courses', href: '/admin/hr/courses', icon: BookOpen },
        { label: 'Learning paths', href: '/admin/hr/learning-paths', icon: GraduationCap },
        { label: 'Assignments', href: '/admin/hr/assignments', icon: ClipboardList },
        { label: 'Compliance', href: '/admin/hr/compliance', icon: ShieldCheck },
        { label: 'Analytics', href: '/admin/hr/analytics', icon: BarChart3 },
      ],
    },
  ],
};

// ---- Admin: Organization workspace ----
const ADMIN_ORG_CONFIG: PortalConfig = {
  portal: 'admin',
  workspace: 'organization',
  label: 'Organization',
  nav: [
    {
      items: [
        { label: 'Overview', href: '/admin/organization', icon: LayoutDashboard },
        { label: 'Settings', href: '/admin/organization/settings', icon: Settings },
        { label: 'Roles & permissions', href: '/admin/organization/roles', icon: UserCog },
        { label: 'Audit log', href: '/admin/organization/audit', icon: ShieldCheck },
      ],
    },
  ],
};

export const PORTAL_CONFIGS = {
  learner: LEARNER_CONFIG,
  trainer: TRAINER_CONFIG,
  'admin:manager': ADMIN_MANAGER_CONFIG,
  'admin:hr': ADMIN_HR_CONFIG,
  'admin:organization': ADMIN_ORG_CONFIG,
} as const;

export const ADMIN_WORKSPACES: { key: AdminWorkspace; label: string; href: string }[] = [
  { key: 'manager', label: 'Manager', href: '/admin/manager' },
  { key: 'hr', label: 'HR / L&D', href: '/admin/hr' },
  { key: 'organization', label: 'Organization', href: '/admin/organization' },
];

export const PORTAL_SWITCHER: { key: Portal; label: string; href: string }[] = [
  { key: 'learner', label: 'Learner portal', href: '/learner' },
  { key: 'trainer', label: 'Trainer portal', href: '/trainer' },
  { key: 'admin', label: 'Administration', href: '/admin/manager' },
];
