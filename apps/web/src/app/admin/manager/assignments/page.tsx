'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, ErrorState, FullPageLoader } from '@lms/ui';
import { listCourses, type CourseRecord } from '../../../../lib/courses-client';
import { listTeamMembers, assignTeamTraining } from '../../../../lib/manager-client';
import { UserRecord } from '../../../../lib/users-client';
import { listDepartments, type DepartmentRecord } from '../../../../lib/departments-client';

export default function ManagerAssignmentsPage() {
  const router = useRouter();

  const [courses, setCourses] = React.useState<CourseRecord[] | null>(null);
  const [departments, setDepartments] = React.useState<DepartmentRecord[] | null>(null);
  const [members, setMembers] = React.useState<UserRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [selectedCourse, setSelectedCourse] = React.useState('');
  const [selectedDept, setSelectedDept] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState('');
  const [isMandatory, setIsMandatory] = React.useState(false);
  const [dueDate, setDueDate] = React.useState('');
  const [assigning, setAssigning] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [coursesData, depts] = await Promise.all([
        listCourses({ status: 'PUBLISHED', pageSize: 100 }),
        listDepartments(),
      ]);
      setCourses(coursesData.items);
      setDepartments(depts);
      if (depts[0]?.id) {
        setSelectedDept(depts[0].id);
        const membersData = await listTeamMembers({ departmentId: depts[0].id });
        setMembers(membersData.items);
      }
    } catch {
      setError('Failed to load courses or department data.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleDeptChange = async (deptId: string) => {
    setSelectedDept(deptId);
    setSelectedUser('');
    setMembers(null);
    try {
      const membersData = await listTeamMembers({ departmentId: deptId });
      setMembers(membersData.items);
    } catch {
      alert('Failed to load department members.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedUser) return;
    setAssigning(true);
    try {
      await assignTeamTraining({
        courseId: selectedCourse,
        userId: selectedUser,
        isMandatory,
        dueDate: dueDate || null,
      });
      alert('Training assigned successfully!');
      router.push('/admin/manager');
    } catch {
      alert('Failed to assign training. User may already be enrolled.');
    } finally {
      setAssigning(false);
    }
  };

  if (error) return <ErrorState onRetry={() => void load()} />;
  if (!courses || !departments) return <FullPageLoader label="Loading assign form" />;

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <header>
        <h1 className="text-h2 text-foreground">Assign Training</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Assign mandatory or optional courses to members of your managed departments.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-6">
        <form onSubmit={(e) => void handleAssign(e)} className="flex flex-col gap-4">
          {/* Select Course */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              required
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Select Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              required
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Team Member */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Team Member</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              disabled={!members}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">Select employee…</option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Checkbox */}
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="isMandatory"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="size-4 accent-primary"
            />
            <label htmlFor="isMandatory" className="text-body-sm font-medium text-foreground select-none">
              This training is mandatory
            </label>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-foreground">Due Date (Optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/manager')}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={assigning || !selectedCourse || !selectedUser}>
              {assigning ? 'Assigning…' : 'Assign Training'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
