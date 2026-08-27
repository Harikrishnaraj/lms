'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Archive, FileText, Plus, RotateCcw } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  FormField,
  Input,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@lms/ui';
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_OPTIONS,
  createContentItem,
  createModule,
  listContentItems,
  listModules,
  reorderContentItems,
  reorderModules,
  setContentItemStatus,
  STORAGE_BACKED_TYPES,
  updateModule,
  type ContentItemRecord,
  type ContentType,
  type ModuleRecord,
} from '../../lib/course-content-client';

/** Modules + content items builder, mounted below a course's metadata form. */
export function CourseBuilder({ courseId }: { courseId: string }) {
  const [modules, setModules] = React.useState<ModuleRecord[] | null>(null);
  const [addModuleOpen, setAddModuleOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setModules(await listModules(courseId));
  }, [courseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!modules) {
    return (
      <Card>
        <CardContent className="flex justify-center p-10">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    const reordered = [...modules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setModules(await reorderModules(courseId, reordered.map((m) => m.id)));
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-h4 text-foreground">Modules</h2>
          <Button type="button" size="sm" onClick={() => setAddModuleOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add module
          </Button>
        </div>

        {modules.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" aria-hidden="true" />}
            title="No modules yet"
            description="Add a module to start building this course's content."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {modules.map((m, i) => (
              <ModuleSection
                key={m.id}
                module={m}
                isFirst={i === 0}
                isLast={i === modules.length - 1}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                onRenamed={(title) => setModules((prev) => prev!.map((x) => (x.id === m.id ? { ...x, title } : x)))}
              />
            ))}
          </div>
        )}
      </CardContent>

      <AddModuleModal
        open={addModuleOpen}
        onOpenChange={setAddModuleOpen}
        onCreated={(m) => setModules((prev) => [...(prev ?? []), m])}
        courseId={courseId}
      />
    </Card>
  );
}

function AddModuleModal({
  open,
  onOpenChange,
  onCreated,
  courseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (m: ModuleRecord) => void;
  courseId: string;
}) {
  const [title, setTitle] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add module</ModalTitle>
        </ModalHeader>
        <FormField id="module-title" label="Title" required>
          <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
        </FormField>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={submitting}
            disabled={!title.trim()}
            onClick={async () => {
              setSubmitting(true);
              try {
                const created = await createModule(courseId, title.trim());
                onCreated(created);
                setTitle('');
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Add module
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ModuleSection({
  module: mod,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRenamed,
}: {
  module: ModuleRecord;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRenamed: (title: string) => void;
}) {
  const [items, setItems] = React.useState<ContentItemRecord[] | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(mod.title);
  const [addContentOpen, setAddContentOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setItems(await listContentItems(mod.id));
  }, [mod.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!items) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(await reorderContentItems(mod.id, reordered.map((c) => c.id)));
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-body font-medium text-foreground hover:underline"
          onClick={() => {
            setRenameValue(mod.title);
            setRenameOpen(true);
          }}
        >
          {mod.title}
        </button>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" disabled={isFirst} onClick={onMoveUp} aria-label="Move module up">
            <ArrowUp className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={isLast} onClick={onMoveDown} aria-label="Move module down">
            <ArrowDown className="size-4" />
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAddContentOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add content
          </Button>
        </div>
      </div>

      {items === null ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-body-sm text-muted-foreground">No content items yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline">{CONTENT_TYPE_LABEL[item.type]}</Badge>
                <span className={item.status === 'ARCHIVED' ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {item.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => moveItem(i, -1)} aria-label="Move content up">
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={i === items.length - 1} onClick={() => moveItem(i, 1)} aria-label="Move content down">
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={item.status === 'ACTIVE' ? 'Archive content item' : 'Restore content item'}
                  onClick={async () => {
                    const updated = await setContentItemStatus(item.id, item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE');
                    setItems((prev) => prev!.map((x) => (x.id === item.id ? updated : x)));
                  }}
                >
                  {item.status === 'ACTIVE' ? <Archive className="size-4" /> : <RotateCcw className="size-4" />}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RenameModuleModal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        moduleId={mod.id}
        value={renameValue}
        onChange={setRenameValue}
        onRenamed={onRenamed}
      />
      <AddContentItemModal
        open={addContentOpen}
        onOpenChange={setAddContentOpen}
        moduleId={mod.id}
        onCreated={(c) => setItems((prev) => [...(prev ?? []), c])}
      />
    </div>
  );
}

function RenameModuleModal({
  open,
  onOpenChange,
  moduleId,
  value,
  onChange,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  value: string;
  onChange: (v: string) => void;
  onRenamed: (title: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Rename module</ModalTitle>
        </ModalHeader>
        <FormField id={`rename-${moduleId}`} label="Title" required>
          <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
        </FormField>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={submitting}
            disabled={!value.trim()}
            onClick={async () => {
              setSubmitting(true);
              try {
                const updated = await updateModule(moduleId, value.trim());
                onRenamed(updated.title);
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function AddContentItemModal({
  open,
  onOpenChange,
  moduleId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  onCreated: (c: ContentItemRecord) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState<ContentType>('TEXT');
  const [textBody, setTextBody] = React.useState('');
  const [storageKey, setStorageKey] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const isStorageBacked = STORAGE_BACKED_TYPES.includes(type);
  const canSubmit = title.trim() && (isStorageBacked ? storageKey.trim() : textBody.trim());

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add content item</ModalTitle>
        </ModalHeader>
        <div className="flex flex-col gap-4">
          <FormField id="content-title" label="Title" required>
            <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
          </FormField>
          <FormField id="content-type" label="Type" required>
            <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONTENT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {isStorageBacked ? (
            <FormField id="content-storage-key" label="Storage key" required hint="Mock upload — the real flow requests an upload target and PUTs the file.">
              <Input value={storageKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStorageKey(e.target.value)} placeholder="e.g. demo/file.pdf" />
            </FormField>
          ) : (
            <FormField id="content-text-body" label="Body" required>
              <textarea
                id="content-text-body"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </FormField>
          )}
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={submitting}
            disabled={!canSubmit}
            onClick={async () => {
              setSubmitting(true);
              try {
                const created = await createContentItem(moduleId, {
                  title: title.trim(),
                  type,
                  storageKey: isStorageBacked ? storageKey.trim() : undefined,
                  textBody: !isStorageBacked ? textBody.trim() : undefined,
                });
                onCreated(created);
                setTitle('');
                setTextBody('');
                setStorageKey('');
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Add content item
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
