'use client';

import * as React from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CourseCard,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  EmptyState,
  ErrorState,
  FormField,
  FullPageLoader,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  Pagination,
  ProgressBar,
  ProgressRing,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toast,
  ToastProvider,
  ToastViewport,
} from '@lms/ui';
import { GraduationCap, Mail } from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border pb-10">
      <h2 className="text-h3 text-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export default function StyleGuidePage() {
  const [search, setSearch] = React.useState('learner onboarding');
  const [page, setPage] = React.useState(4);
  const [toastOpen, setToastOpen] = React.useState(false);

  return (
    <ToastProvider swipeDirection="right">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-foreground">LMS Design System</h1>
          <p className="text-body-lg text-muted-foreground">
            Shared component library — Corporate Modern visual language.
          </p>
        </header>

        <Section title="Buttons">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </Section>

        <Section title="Inputs">
          <div className="flex w-64 flex-col gap-3">
            <Input placeholder="Default state" />
            <Input placeholder="Focus me" autoFocus />
            <Input placeholder="Disabled" disabled />
            <Input state="error" defaultValue="invalid@" placeholder="Error state" />
            <Input state="success" defaultValue="valid@example.com" placeholder="Success state" />
          </div>
        </Section>

        <Section title="Forms">
          <div className="flex w-80 flex-col gap-4">
            <FormField id="email" label="Work email" required hint="Use your organization email address.">
              <Input type="email" placeholder="you@company.com" startIcon={<Mail className="size-4" />} />
            </FormField>
            <FormField id="email-error" label="Work email" error="This email is already registered.">
              <Input type="email" state="error" defaultValue="taken@company.com" />
            </FormField>
            <FormField id="email-success" label="Work email" success="Email verified.">
              <Input type="email" state="success" defaultValue="verified@company.com" />
            </FormField>
          </div>
        </Section>

        <Section title="Selects">
          <div className="w-64">
            <Select defaultValue="trainer">
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learner">Learner</SelectItem>
                <SelectItem value="trainer">Trainer</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="hr-ld-admin">HR/L&D Administrator</SelectItem>
                <SelectItem value="org-admin">Organization Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Search">
          <div className="w-72">
            <SearchInput
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search courses..."
            />
          </div>
        </Section>

        <Section title="Cards">
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Compliance Training</CardTitle>
              <CardDescription>Required for all employees</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar value={65} showValue />
            </CardContent>
            <CardFooter>
              <Button size="sm">Continue</Button>
            </CardFooter>
          </Card>
          <CourseCard
            className="w-72"
            title="Leadership Fundamentals"
            subtitle="6 modules · 3h 20m"
            footer={<ProgressBar value={100} />}
          />
        </Section>

        <Section title="Tables">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Alex Johnson</TableCell>
                <TableCell>
                  <Badge variant="primary">Trainer</Badge>
                </TableCell>
                <TableCell>82%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Priya Nair</TableCell>
                <TableCell>
                  <Badge variant="accent">Manager</Badge>
                </TableCell>
                <TableCell>54%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Sam Rivera</TableCell>
                <TableCell>
                  <Badge>Learner</Badge>
                </TableCell>
                <TableCell>100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="overview" className="w-full max-w-md">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-body-sm text-muted-foreground">Course overview content.</p>
            </TabsContent>
            <TabsContent value="modules">
              <p className="text-body-sm text-muted-foreground">Module list content.</p>
            </TabsContent>
            <TabsContent value="discussion">
              <p className="text-body-sm text-muted-foreground">Discussion thread content.</p>
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Badges">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="accent">Learning Path</Badge>
          <Badge variant="success">Completed</Badge>
          <Badge variant="warning">Due soon</Badge>
          <Badge variant="error">Overdue</Badge>
          <Badge variant="outline">Draft</Badge>
        </Section>

        <Section title="Alerts">
          <div className="flex w-full flex-col gap-3">
            <Alert variant="info" title="Heads up">
              New courses were added to your learning path.
            </Alert>
            <Alert variant="success" title="Saved">
              Your changes have been saved.
            </Alert>
            <Alert variant="warning" title="Action needed">
              Your compliance training is due in 3 days.
            </Alert>
            <Alert variant="error" title="Something went wrong">
              We couldn&apos;t save your changes. Please try again.
            </Alert>
          </div>
        </Section>

        <Section title="Modals">
          <Modal>
            <ModalTrigger asChild>
              <Button variant="secondary">Open modal</Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Unenroll from course?</ModalTitle>
                <ModalDescription>This will remove your progress. This cannot be undone.</ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <ModalClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </ModalClose>
                <ModalClose asChild>
                  <Button variant="destructive">Unenroll</Button>
                </ModalClose>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Section>

        <Section title="Drawers">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="secondary">Open drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Filter courses</DrawerTitle>
                <DrawerDescription>Narrow down the course catalog.</DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-1 flex-col gap-3">
                <p className="text-body-sm text-muted-foreground">Filter controls go here.</p>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DrawerClose>
                <DrawerClose asChild>
                  <Button>Apply</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Section>

        <Section title="Breadcrumbs">
          <Breadcrumbs
            items={[{ label: 'Courses', href: '#' }, { label: 'Leadership Fundamentals', href: '#' }, { label: 'Module 3' }]}
          />
        </Section>

        <Section title="Pagination">
          <Pagination page={page} pageCount={12} onPageChange={setPage} />
        </Section>

        <Section title="Progress indicators">
          <div className="flex w-64 flex-col gap-4">
            <ProgressBar value={40} label="In progress" showValue />
            <ProgressBar value={100} label="Completed" showValue />
          </div>
          <ProgressRing value={72} />
          <ProgressRing value={100} />
        </Section>

        <Section title="Avatars">
          <Avatar fallback="AJ" size="sm" />
          <Avatar fallback="PN" />
          <Avatar fallback={<GraduationCap className="size-5" />} size="lg" />
          <Avatar fallback="XL" size="xl" />
        </Section>

        <Section title="Notifications">
          <Button variant="secondary" onClick={() => setToastOpen(true)}>
            Trigger notification
          </Button>
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant="success"
            title="Course published"
            description="Leadership Fundamentals is now live for all learners."
          />
        </Section>

        <Section title="Empty states">
          <EmptyState
            title="No courses yet"
            description="Courses assigned to you will appear here."
            action={<Button size="sm">Browse catalog</Button>}
            className="w-full"
          />
        </Section>

        <Section title="Loading states">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner />
              <Spinner size="lg" />
            </div>
            <div className="flex w-64 flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <div className="w-full max-w-sm rounded-lg border border-border">
            <FullPageLoader label="Loading courses" />
          </div>
        </Section>

        <Section title="Error states">
          <ErrorState className="w-full" onRetry={() => undefined} />
        </Section>
      </main>
      <ToastViewport />
    </ToastProvider>
  );
}
