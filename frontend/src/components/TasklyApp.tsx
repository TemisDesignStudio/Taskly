"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Flag,
  Folder,
  GripVertical,
  Home,
  Layers3,
  MoreHorizontal,
  Pause,
  Plus,
  Play,
  Search,
  Settings,
  Sparkles,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import {
  INITIAL_COLUMNS,
  INITIAL_LABELS,
  LABEL_COLORS,
  USERS,
  createInitialTasks,
  filterAndSortTasks,
  formatElapsedTime,
  formatRunningTime,
  getElapsedTime,
  getBoardStats,
  getDueDateState,
  insertTaskAt,
  moveTask,
  type BoardColumn,
  type BoardUser,
  type ColumnId,
  type LabelColor,
  type LabelDefinition,
  type Priority,
  type SortOption,
  type Task,
  type TaskTimer,
  parseTimers,
} from "@/lib/board";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";

type View = "Dashboard" | "Analytics" | "Settings";
type ToastState = { message: string; canUndo: boolean } | null;
type TaskDraft = Pick<Task, "title" | "description" | "priority" | "dueDate" | "assigneeId" | "labels">;
type UndoState =
  | { kind: "move"; taskId: string; columnId: ColumnId; index: number }
  | { kind: "delete"; task: Task; index: number }
  | null;

const currentUserId = "emma";
const timerStorageKey = "taskly-time-tracking";

const priorityOrder: Priority[] = ["Low", "Medium", "High"];

function formatDueDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function Avatar({ user, size = "small" }: { user: BoardUser; size?: "small" | "large" }) {
  return (
    <span
      className={`avatar avatar--${user.color} avatar--${size}`}
      aria-label={user.name}
      title={user.name}
    >
      {user.initials}
    </span>
  );
}

function Sidebar({
  activeView,
  projectName,
  onNavigate,
}: {
  activeView: View;
  projectName: string;
  onNavigate: (view: View) => void;
}) {
  const navigation: { name: View; icon: typeof Home }[] = [
    { name: "Dashboard", icon: Home },
    { name: "Analytics", icon: BarChart3 },
    { name: "Settings", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <button className="brand-lockup" type="button" onClick={() => onNavigate("Dashboard")}>
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span>Taskly</span>
      </button>

      <nav className="primary-nav" aria-label="Main navigation">
        {navigation.map(({ name, icon: Icon }) => (
          <button
            className={`nav-item ${activeView === name ? "is-active" : ""}`}
            key={name}
            type="button"
            aria-current={activeView === name ? "page" : undefined}
            onClick={() => onNavigate(name)}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="project-shortcut" type="button" onClick={() => onNavigate("Dashboard")}>
          <span className="project-shortcut__icon">
            <Folder size={17} aria-hidden="true" />
          </span>
          <span className="project-shortcut__copy">
            <strong>{projectName}</strong>
            <span>Marketing &amp; Design</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function Header({
  activeView,
  projectName,
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  onAddTask,
}: {
  activeView: View;
  projectName: string;
  query: string;
  onQueryChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  onAddTask: () => void;
}) {
  const copy: Record<View, { title: ReactNode; subtitle: string }> = {
    Dashboard: {
      title: (
        <>
          Good morning, Emma <span className="wave-mark" aria-hidden="true"><Sparkles size={17} /></span>
        </>
      ),
      subtitle: "Here’s what’s happening with your project today.",
    },
    Analytics: { title: "Project analytics", subtitle: "A clear picture of progress across the board." },
    Settings: { title: "Project settings", subtitle: "Make this workspace feel like your own." },
  };

  return (
    <header className="page-header">
      <div className="page-heading">
        <span className="eyebrow">PRODUCT LAUNCH · CREATIVE STUDIO</span>
        <h1>{copy[activeView].title}</h1>
        <p>
          {activeView === "Dashboard" && <><strong className="header-project-name">{projectName}</strong><span className="header-subtitle-separator"> · </span></>}
          {copy[activeView].subtitle}
        </p>
      </div>
      <div className="header-controls">
        <label className="search-control">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <kbd aria-hidden="true">⌘ K</kbd>
        </label>
        <label className="sort-control">
          <ArrowDownWideNarrow size={16} aria-hidden="true" />
          <span className="sr-only">Sort tasks</span>
          <select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
          >
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
            <option value="manual">Board order</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <button className="button button--primary header-add" type="button" onClick={onAddTask}>
          <Plus size={17} aria-hidden="true" />
          <span>Add task</span>
        </button>
        <span className="profile-display" aria-label="Signed in as Emma Rodriguez">
          <Avatar user={USERS[0]} size="large" />
        </span>
      </div>
    </header>
  );
}

function BoardSnapshot({
  stats,
  projectName,
}: {
  stats: ReturnType<typeof getBoardStats>;
  projectName: string;
}) {
  return (
    <>
      <section className="snapshot-panel" aria-label="Board snapshot">
        <div className="snapshot-intro">
          <h2>Board snapshot</h2>
          <p>{projectName}</p>
        </div>
        <div className="snapshot-stat">
          <span className="snapshot-icon snapshot-icon--violet"><Layers3 size={18} /></span>
          <span><strong>{stats.total}</strong><small>Total tasks</small></span>
        </div>
        <div className="snapshot-stat">
          <span className="snapshot-icon snapshot-icon--orange"><Clock3 size={18} /></span>
          <span><strong>{stats.inProgress}</strong><small>In progress</small></span>
        </div>
        <div className="snapshot-stat">
          <span className="snapshot-icon snapshot-icon--sage"><Check size={19} /></span>
          <span><strong>{stats.done}</strong><small>Done</small></span>
        </div>
        <div className="snapshot-progress">
          <div className="snapshot-progress__heading">
            <strong>Project progress</strong>
            <span>{stats.progress}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Project progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.progress}
          >
            <span style={{ width: `${stats.progress}%` }} />
          </div>
        </div>
      </section>
      <div className="progress-caption" aria-live="polite">
        <span><Sparkles size={14} aria-hidden="true" /> Your team has completed {stats.progress}% of the project</span>
        <span>{stats.done} of {stats.total} tasks complete</span>
      </div>
    </>
  );
}

function LabelPicker({
  selected,
  definitions,
  onChange,
  onCreate,
  onRename,
  onColorChange,
  onRemove,
}: {
  selected: string[];
  definitions: LabelDefinition[];
  onChange: (labels: string[]) => void;
  onCreate: (name: string, color: LabelColor) => void;
  onRename: (oldName: string, newName: string) => void;
  onColorChange: (name: string, color: LabelColor) => void;
  onRemove: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>("violet");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<LabelColor>("violet");
  const [error, setError] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function addLabel() {
    const name = newName.trim();
    if (!name) {
      setError("Enter a label name.");
      return;
    }
    if (definitions.some((label) => label.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError("A label with that name already exists.");
      return;
    }
    onCreate(name, newColor);
    onChange([...selected, name]);
    setNewName("");
    setOpen(false);
    setError("");
  }

  function saveEdit() {
    if (!editingName) return;
    const name = draftName.trim();
    if (!name) {
      setError("Enter a label name.");
      return;
    }
    if (
      definitions.some(
        (label) =>
          label.name !== editingName &&
          label.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setError("A label with that name already exists.");
      return;
    }
    onRename(editingName, name);
    onColorChange(name, draftColor);
    onChange([...new Set(selected.map((label) => label === editingName ? name : label))]);
    setEditingName(null);
    setOpen(false);
    setError("");
  }

  return (
    <div
      className="label-picker task-card__interactive"
      ref={pickerRef}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <button
        className="label-picker__trigger"
        type="button"
        aria-label="Manage labels"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {selected.length ? selected.map((name) => {
          const definition = definitions.find((label) => label.name === name);
          return (
            <span className={`task-label tone-${definition?.color ?? "neutral"}`} key={name}>
              {name}
            </span>
          );
        }) : <span className="label-picker__placeholder">Add labels</span>}
      </button>
      {open && (
        <div className="label-popover" role="dialog" aria-label="Manage task labels">
          <strong>Labels</strong>
          <div className="label-popover__list">
            {definitions.map((label) => (
              <div className="label-popover__row" key={label.name}>
                {editingName === label.name ? (
                  <div className="label-edit-form">
                    <input
                      autoFocus
                      aria-label="Edit label name"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveEdit();
                        }
                      }}
                    />
                    <select
                      aria-label="Edit label color"
                      value={draftColor}
                      onChange={(event) => setDraftColor(event.target.value as LabelColor)}
                    >
                      {LABEL_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
                    </select>
                    <button type="button" aria-label="Save label" onClick={saveEdit}><Check size={13} /></button>
                    <button type="button" aria-label="Cancel label edit" onClick={() => setEditingName(null)}><X size={13} /></button>
                  </div>
                ) : (
                  <>
                    <label className="label-choice">
                      <input
                        type="checkbox"
                        checked={selected.includes(label.name)}
                        onChange={(event) => onChange(
                          event.target.checked
                            ? [...selected, label.name]
                            : selected.filter((item) => item !== label.name),
                        )}
                      />
                      <span className={`task-label tone-${label.color}`}>{label.name}</span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Edit label ${label.name}`}
                      onClick={() => {
                        setEditingName(label.name);
                        setDraftName(label.name);
                        setDraftColor(label.color);
                        setError("");
                      }}
                    >
                      <Settings size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove label ${label.name}`}
                      onClick={() => {
                        onRemove(label.name);
                        onChange(selected.filter((item) => item !== label.name));
                        setOpen(false);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="label-create-form">
            <input
              aria-label="New label name"
              placeholder="New label"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLabel();
                }
              }}
            />
            <select
              aria-label="New label color"
              value={newColor}
              onChange={(event) => setNewColor(event.target.value as LabelColor)}
            >
              {LABEL_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
            <button type="button" aria-label="Add label" onClick={addLabel}><Plus size={14} /></button>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

function QuickCapture({
  column,
  labelDefinitions,
  onCreateLabel,
  onRenameLabel,
  onLabelColorChange,
  onRemoveLabel,
  onSave,
  onCancel,
}: {
  column: BoardColumn;
  labelDefinitions: LabelDefinition[];
  onCreateLabel: (name: string, color: LabelColor) => void;
  onRenameLabel: (oldName: string, newName: string) => void;
  onLabelColorChange: (name: string, color: LabelColor) => void;
  onRemoveLabel: (name: string) => void;
  onSave: (draft: TaskDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [labels, setLabels] = useState<string[]>([]);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Add a task title to continue.");
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      assigneeId,
      labels,
    });
  }

  return (
    <form className="quick-capture" onSubmit={submit}>
      <label>
        <span className="sr-only">Task title</span>
        <input
          autoFocus
          aria-label="Task title"
          placeholder="Give this task a clear title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
        />
      </label>
      <div className="task-edit-fields task-card__interactive">
        <label className="task-edit-field">
          <span>Priority</span>
          <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {priorityOrder.toReversed().map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="task-edit-field">
          <span>Due date</span>
          <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="task-edit-field">
          <span>Assignee</span>
          <select aria-label="Assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {USERS.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </label>
        <LabelPicker
          selected={labels}
          definitions={labelDefinitions}
          onChange={setLabels}
          onCreate={onCreateLabel}
          onRename={onRenameLabel}
          onColorChange={onLabelColorChange}
          onRemove={onRemoveLabel}
        />
      </div>
      <label>
        <span className="sr-only">Task details</span>
        <textarea
          aria-label="Task details"
          placeholder="Add a few details..."
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="quick-capture__footer">
        <span>Adding to {column.name}</span>
        <div>
          <button className="button button--quiet" type="button" onClick={onCancel}>Cancel</button>
          <button className="button button--small-primary" type="submit">Save task</button>
        </div>
      </div>
    </form>
  );
}

function InlineEditor({
  task,
  labelDefinitions,
  onCreateLabel,
  onRenameLabel,
  onLabelColorChange,
  onRemoveLabel,
  onSave,
  onCancel,
}: {
  task: Task;
  labelDefinitions: LabelDefinition[];
  onCreateLabel: (name: string, color: LabelColor) => void;
  onRenameLabel: (oldName: string, newName: string) => void;
  onLabelColorChange: (name: string, color: LabelColor) => void;
  onRemoveLabel: (name: string) => void;
  onSave: (draft: TaskDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [labels, setLabels] = useState(task.labels);
  const [error, setError] = useState("");

  return (
    <form
      className="inline-editor"
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          setError("A task title is required.");
          return;
        }
        onSave({
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          assigneeId,
          labels,
        });
      }}
    >
      <label>
        <span className="sr-only">Task title</span>
        <input
          aria-label="Task title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
        />
      </label>
      <div className="task-edit-fields task-card__interactive">
        <label className="task-edit-field">
          <span>Priority</span>
          <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {priorityOrder.toReversed().map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="task-edit-field">
          <span>Due date</span>
          <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="task-edit-field">
          <span>Assignee</span>
          <select aria-label="Assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {USERS.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </label>
        <LabelPicker
          selected={labels}
          definitions={labelDefinitions}
          onChange={setLabels}
          onCreate={onCreateLabel}
          onRename={onRenameLabel}
          onColorChange={onLabelColorChange}
          onRemove={onRemoveLabel}
        />
      </div>
      <label>
        <span className="sr-only">Task details</span>
        <textarea
          aria-label="Task details"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="inline-editor__actions">
        <button className="button button--quiet" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button--small-primary" type="submit">Save</button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  columns,
  today,
  labelDefinitions,
  timer,
  timerNow,
  editTaskId,
  openMenu,
  menuRef,
  onOpenPeek,
  onToggleMenu,
  onMoveTo,
  onDuplicate,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onUpdateTask,
  onCreateLabel,
  onRenameLabel,
  onLabelColorChange,
  onRemoveLabel,
}: {
  task: Task;
  columns: BoardColumn[];
  today: string;
  labelDefinitions: LabelDefinition[];
  timer?: TaskTimer;
  timerNow: number;
  editTaskId: string | null;
  openMenu: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onOpenPeek: () => void;
  onToggleMenu: () => void;
  onMoveTo: (columnId: ColumnId) => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: (draft: TaskDraft) => void;
  onCancelEdit: () => void;
  onUpdateTask: (changes: Partial<Task>) => void;
  onCreateLabel: (name: string, color: LabelColor) => void;
  onRenameLabel: (oldName: string, newName: string) => void;
  onLabelColorChange: (name: string, color: LabelColor) => void;
  onRemoveLabel: (name: string) => void;
}) {
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", columnId: task.columnId } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.42 : 1,
  };
  const assignee = USERS.find((item) => item.id === task.assigneeId) ?? USERS[0];
  const dueState = getDueDateState(task.dueDate, today);

  return (
    <article
      ref={setNodeRef}
      className={`task-card ${isDragging ? "is-dragging" : ""}`}
      style={style}
      data-task-id={task.id}
      {...attributes}
      {...listeners}
    >
      <div
        className="task-card__heading task-card__interactive"
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <button className="task-card__title" type="button" onClick={onOpenPeek}>
          {task.title}
        </button>
        <button
          className="icon-button task-more"
          type="button"
          aria-label={`More options for ${task.title}`}
          aria-expanded={openMenu}
          onClick={onToggleMenu}
        >
          <MoreHorizontal size={17} aria-hidden="true" />
        </button>
      </div>

      {editTaskId === task.id ? (
        <InlineEditor
          task={task}
          labelDefinitions={labelDefinitions}
          onCreateLabel={onCreateLabel}
          onRenameLabel={onRenameLabel}
          onLabelColorChange={onLabelColorChange}
          onRemoveLabel={onRemoveLabel}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          {task.description && (
            <button
              className="task-card__description task-card__interactive"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              onClick={onOpenPeek}
            >
              {task.description}
            </button>
          )}
          <LabelPicker
            selected={task.labels}
            definitions={labelDefinitions}
            onChange={(labels) => onUpdateTask({ labels })}
            onCreate={onCreateLabel}
            onRename={onRenameLabel}
            onColorChange={onLabelColorChange}
            onRemove={onRemoveLabel}
          />
          <div className="task-card__divider" />
          <div
            className="task-meta task-card__interactive"
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <label className={`priority-control priority-badge priority-badge--${task.priority.toLowerCase()}`}>
              {task.priority === "High" ? <ArrowUp size={12} /> : task.priority === "Low" ? <ArrowDownWideNarrow size={12} /> : <span className="priority-equal">=</span>}
              <span className="sr-only">Priority</span>
              <select
                aria-label={`Priority for ${task.title}`}
                value={task.priority}
                onChange={(event) => onUpdateTask({ priority: event.target.value as Priority })}
              >
                {priorityOrder.toReversed().map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              {task.priority}
            </label>
            <label
              className={`due-date due-date--${dueState}`}
              title={`${dueState === "overdue" ? "Overdue · " : ""}${task.dueDate ? formatDueDate(task.dueDate) : "Set due date"}`}
            >
              <CalendarDays size={13} aria-hidden="true" />
              <span>{task.dueDate ? formatDueDate(task.dueDate) : "Add date"}</span>
              <input
                aria-label={`Due date for ${task.title}`}
                type="date"
                value={task.dueDate ?? ""}
                onChange={(event) => onUpdateTask({ dueDate: event.target.value || null })}
              />
            </label>
            {timer && (
              <span className={`timer-badge ${timer.startedAt === null ? "is-paused" : "is-running"}`}>
                <Timer size={12} aria-hidden="true" />
                <span>{timer.startedAt === null
                  ? formatElapsedTime(getElapsedTime(timer, timerNow))
                  : formatRunningTime(getElapsedTime(timer, timerNow))}
                </span>
              </span>
            )}
            <label className="assignee-control">
              <Avatar user={assignee} />
              <span className="sr-only">Assignee</span>
              <select
                aria-label={`Assignee for ${task.title}`}
                value={task.assigneeId}
                onChange={(event) => onUpdateTask({ assigneeId: event.target.value })}
              >
                {USERS.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
          </div>
        </>
      )}

      {openMenu && (
        <div
          className="task-menu-wrap task-card__interactive"
          ref={menuRef}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <div className="task-menu" role="menu" aria-label={`Actions for ${task.title}`}>
            <button type="button" role="menuitem" onClick={() => setMoveMenuOpen((open) => !open)}>
              <ArrowRight size={14} aria-hidden="true" />
              <span>Move to</span>
              <ChevronDown size={13} className="task-menu__chevron" aria-hidden="true" />
            </button>
            {moveMenuOpen && (
              <div className="move-submenu" role="group" aria-label="Move task to column">
                {columns.filter((column) => column.id !== task.columnId).map((column) => (
                  <button
                    type="button"
                    key={column.id}
                    onClick={() => {
                      onMoveTo(column.id);
                      setMoveMenuOpen(false);
                    }}
                  >
                    {column.name}
                  </button>
                ))}
              </div>
            )}
            <button type="button" role="menuitem" onClick={onDuplicate}>
              <Copy size={14} aria-hidden="true" />
              <span>Duplicate</span>
            </button>
            <button type="button" role="menuitem" onClick={onEdit}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Edit details</span>
            </button>
            <span className="task-menu__separator" />
            <button className="task-menu__danger" type="button" role="menuitem" onClick={onDelete}>
              <Trash2 size={14} aria-hidden="true" />
              <span>Delete task</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function BoardColumnView({
  column,
  columns,
  today,
  labelDefinitions,
  timers,
  timerNow,
  tasks,
  captureOpen,
  editTaskId,
  menuTaskId,
  menuRef,
  onAddTask,
  onRenameColumn,
  onSaveTask,
  onCancelCapture,
  onOpenPeek,
  onToggleMenu,
  onMoveTo,
  onDuplicate,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onUpdateTask,
  onCreateLabel,
  onRenameLabel,
  onLabelColorChange,
  onRemoveLabel,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  today: string;
  labelDefinitions: LabelDefinition[];
  timers: Record<string, TaskTimer>;
  timerNow: number;
  tasks: Task[];
  captureOpen: boolean;
  editTaskId: string | null;
  menuTaskId: string | null;
  menuRef: RefObject<HTMLDivElement | null>;
  onAddTask: () => void;
  onRenameColumn: (columnId: ColumnId, name: string) => void;
  onSaveTask: (draft: TaskDraft) => void;
  onCancelCapture: () => void;
  onOpenPeek: (taskId: string) => void;
  onToggleMenu: (taskId: string) => void;
  onMoveTo: (taskId: string, columnId: ColumnId) => void;
  onDuplicate: (task: Task) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSaveEdit: (taskId: string, draft: TaskDraft) => void;
  onCancelEdit: () => void;
  onUpdateTask: (taskId: string, changes: Partial<Task>) => void;
  onCreateLabel: (name: string, color: LabelColor) => void;
  onRenameLabel: (oldName: string, newName: string) => void;
  onLabelColorChange: (name: string, color: LabelColor) => void;
  onRemoveLabel: (name: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(column.name);
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  const accent = `column--${column.id}`;

  function saveColumnName() {
    const name = draftName.trim();
    if (name && name !== column.name) onRenameColumn(column.id, name);
    else setDraftName(column.name);
    setEditingName(false);
  }

  return (
    <section
      ref={setNodeRef}
      className={`board-column ${accent} ${isOver ? "is-over" : ""}`}
      aria-label={`${column.name} column`}
    >
      <div className="column-heading">
        <span className="column-dot" aria-hidden="true" />
        {editingName ? (
          <input
            className="column-heading__edit"
            aria-label={`Edit ${column.name} column name`}
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={saveColumnName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveColumnName();
              } else if (event.key === "Escape") {
                setDraftName(column.name);
                setEditingName(false);
              }
            }}
          />
        ) : (
          <button
            className="column-heading__name"
            type="button"
            aria-label={`Edit ${column.name} column name`}
            onClick={() => {
              setDraftName(column.name);
              setEditingName(true);
            }}
          >
            {column.name}
          </button>
        )}
        <span className="column-count">{tasks.length}</span>
        <button
          className="icon-button column-add"
          type="button"
          aria-label={`Add task to ${column.name}`}
          onClick={onAddTask}
        >
          <Plus size={17} aria-hidden="true" />
        </button>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="column-task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columns={columns}
              today={today}
              labelDefinitions={labelDefinitions}
              timer={timers[task.id]}
              timerNow={timerNow}
              editTaskId={editTaskId}
              openMenu={menuTaskId === task.id}
              menuRef={menuRef}
              onOpenPeek={() => onOpenPeek(task.id)}
              onToggleMenu={() => onToggleMenu(task.id)}
              onMoveTo={(columnId) => onMoveTo(task.id, columnId)}
              onDuplicate={() => onDuplicate(task)}
              onEdit={() => onEdit(task.id)}
              onDelete={() => onDelete(task.id)}
              onSaveEdit={(draft) => onSaveEdit(task.id, draft)}
              onCancelEdit={onCancelEdit}
              onUpdateTask={(changes) => onUpdateTask(task.id, changes)}
              onCreateLabel={onCreateLabel}
              onRenameLabel={onRenameLabel}
              onLabelColorChange={onLabelColorChange}
              onRemoveLabel={onRemoveLabel}
            />
          ))}
          {tasks.length === 0 && !captureOpen && (
            <div className="column-empty">
              <span className="column-empty__mark"><CircleHelp size={17} aria-hidden="true" /></span>
              <strong>All clear here</strong>
              <span>No tasks in this column yet.</span>
              <button type="button" onClick={onAddTask}>Create a task</button>
            </div>
          )}
          {captureOpen && (
            <QuickCapture
              column={column}
              labelDefinitions={labelDefinitions}
              onCreateLabel={onCreateLabel}
              onRenameLabel={onRenameLabel}
              onLabelColorChange={onLabelColorChange}
              onRemoveLabel={onRemoveLabel}
              onSave={onSaveTask}
              onCancel={onCancelCapture}
            />
          )}
        </div>
      </SortableContext>
      <button className="quick-add-button" type="button" onClick={onAddTask}>
        <Plus size={15} aria-hidden="true" />
        Quick add task
      </button>
    </section>
  );
}

function AddColumnControl({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button className="button button--add-column" type="button" onClick={() => setOpen(true)}>
        <Plus size={15} aria-hidden="true" />
        Add column
      </button>
    );
  }

  return (
    <form
      className="add-column-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError("Enter a column name.");
          return;
        }
        onAdd(name.trim());
        setName("");
        setError("");
        setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor="new-column-name">New column name</label>
      <input
        id="new-column-name"
        autoFocus
        placeholder="Column name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError("");
        }}
      />
      {error && <span className="field-error" role="alert">{error}</span>}
      <div>
        <button className="button button--quiet" type="button" onClick={() => setOpen(false)}>Cancel</button>
        <button className="button button--small-primary" type="submit">Add column</button>
      </div>
    </form>
  );
}

function TaskPeek({
  task,
  columns,
  labelDefinitions,
  timer,
  timerNow,
  onClose,
  onEdit,
  onDuplicate,
  onMove,
  onUpdate,
  onTimerStart,
  onTimerPause,
  onTimerResume,
  onCreateLabel,
  onRenameLabel,
  onLabelColorChange,
  onRemoveLabel,
}: {
  task: Task;
  columns: BoardColumn[];
  labelDefinitions: LabelDefinition[];
  timer?: TaskTimer;
  timerNow: number;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMove: (columnId: ColumnId) => void;
  onUpdate: (changes: Partial<Task>) => void;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerResume: () => void;
  onCreateLabel: (name: string, color: LabelColor) => void;
  onRenameLabel: (oldName: string, newName: string) => void;
  onLabelColorChange: (name: string, color: LabelColor) => void;
  onRemoveLabel: (name: string) => void;
}) {
  const user = USERS.find((item) => item.id === task.assigneeId) ?? USERS[0];
  const column = columns.find((item) => item.id === task.columnId);

  return (
    <div className="peek-backdrop" onMouseDown={onClose}>
      <section
        className="peek-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="peek-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="peek-panel__topline">
          <span><span className={`column-dot column-dot--${task.columnId}`} />{column?.name}</span>
          <button className="icon-button" type="button" aria-label="Close task details" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <h2 id="peek-title">{task.title}</h2>
        <p className="peek-description">{task.description || "No details have been added to this task yet."}</p>
        <section className="time-tracking" aria-label="Time tracking">
          <div className="time-tracking__summary">
            <span className="time-tracking__icon"><Timer size={15} aria-hidden="true" /></span>
            <span><strong>Time tracking</strong><small>Log time spent on this task</small></span>
            <strong className="time-tracking__value">
              {timer ? formatRunningTime(getElapsedTime(timer, timerNow)) : "00:00:00"}
            </strong>
          </div>
          <button
            className={`button ${timer?.startedAt !== null && timer ? "button--timer-pause" : "button--timer-start"}`}
            type="button"
            onClick={() => {
              if (!timer) onTimerStart();
              else if (timer.startedAt === null) onTimerResume();
              else onTimerPause();
            }}
          >
            {timer?.startedAt !== null && timer
              ? <><Pause size={14} aria-hidden="true" />Pause timer</>
              : <><Play size={14} aria-hidden="true" />{timer ? "Resume timer" : "Start timer"}</>}
          </button>
        </section>
        <div className="peek-divider" />
        <dl className="peek-details">
          <div>
            <dt><Flag size={14} aria-hidden="true" />Priority</dt>
            <dd>
              <select
                aria-label="Priority"
                value={task.priority}
                onChange={(event) => onUpdate({ priority: event.target.value as Priority })}
              >
                {priorityOrder.toReversed().map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </dd>
          </div>
          <div>
            <dt><CalendarDays size={14} aria-hidden="true" />Due date</dt>
            <dd>
              <input
                aria-label="Due date"
                type="date"
                value={task.dueDate ?? ""}
                onChange={(event) => onUpdate({ dueDate: event.target.value || null })}
              />
            </dd>
          </div>
          <div>
            <dt><Layers3 size={14} aria-hidden="true" />Labels</dt>
            <dd className="peek-label-list">
              <LabelPicker
                selected={task.labels}
                definitions={labelDefinitions}
                onChange={(labels) => onUpdate({ labels })}
                onCreate={onCreateLabel}
                onRename={onRenameLabel}
                onColorChange={onLabelColorChange}
                onRemove={onRemoveLabel}
              />
            </dd>
          </div>
          <div>
            <dt><CheckSquare size={14} aria-hidden="true" />Assignee</dt>
            <dd className="peek-assignee">
              <Avatar user={user} />
              <select
                aria-label="Assignee"
                value={task.assigneeId}
                onChange={(event) => onUpdate({ assigneeId: event.target.value })}
              >
                {USERS.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </dd>
          </div>
          <div>
            <dt><ArrowRight size={14} aria-hidden="true" />Move to</dt>
            <dd>
              <select
                aria-label="Move task to column"
                value={task.columnId}
                onChange={(event) => onMove(event.target.value as ColumnId)}
              >
                {columns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </dd>
          </div>
        </dl>
        <div className="peek-actions">
          <button className="button button--quiet" type="button" onClick={onDuplicate}>
            <Copy size={14} aria-hidden="true" />Duplicate
          </button>
          <button className="button button--small-primary" type="button" onClick={onEdit}>Edit task</button>
        </div>
      </section>
    </div>
  );
}

function AnalyticsView({
  tasks,
  columns,
  stats,
}: {
  tasks: Task[];
  columns: BoardColumn[];
  stats: ReturnType<typeof getBoardStats>;
}) {
  const priorities = priorityOrder.toReversed().map((priority) => ({
    priority,
    count: tasks.filter((task) => task.priority === priority).length,
  }));
  const largestCount = Math.max(1, ...columns.map((column) => tasks.filter((task) => task.columnId === column.id).length));

  return (
    <section className="analytics-view">
      <div className="analytics-topline">
        <div>
          <span className="eyebrow">PROJECT OVERVIEW</span>
          <h2>Progress at a glance</h2>
          <p>Live totals from every task on your board.</p>
        </div>
        <span className="analytics-live"><span />Live board data</span>
      </div>
      <div className="analytics-stat-grid">
        <div className="analytics-stat"><span className="analytics-stat__icon"><Layers3 size={17} /></span><small>Total tasks</small><strong>{stats.total}</strong><span>Across {columns.length} stages</span></div>
        <div className="analytics-stat"><span className="analytics-stat__icon analytics-stat__icon--orange"><Clock3 size={17} /></span><small>In progress</small><strong>{stats.inProgress}</strong><span>Currently moving</span></div>
        <div className="analytics-stat"><span className="analytics-stat__icon analytics-stat__icon--sage"><Check size={18} /></span><small>Completed</small><strong>{stats.done}</strong><span>{stats.progress}% of the project</span></div>
      </div>
      <div className="analytics-panels">
        <section className="analytics-panel">
          <div className="analytics-panel__heading"><div><h3>Tasks by stage</h3><p>Where work stands today</p></div><BarChart3 size={17} /></div>
          <div className="stage-bars">
            {columns.map((column) => {
              const count = tasks.filter((task) => task.columnId === column.id).length;
              return (
                <div className="stage-bar-row" key={column.id}>
                  <span>{column.name}</span>
                  <div className="stage-bar-track"><span className={`stage-bar-fill stage-bar-fill--${column.id}`} style={{ width: `${(count / largestCount) * 100}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="analytics-panel">
          <div className="analytics-panel__heading"><div><h3>Priority mix</h3><p>Tasks by urgency</p></div><Flag size={17} /></div>
          <div className="priority-mix">
            {priorities.map(({ priority, count }) => (
              <div className="priority-mix-row" key={priority}>
                <span className={`priority-badge priority-badge--${priority.toLowerCase()}`}>{priority}</span>
                <div className="stage-bar-track"><span className={`priority-mix-fill priority-mix-fill--${priority.toLowerCase()}`} style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }} /></div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="analytics-completion">
            <div className="analytics-completion__copy"><span>Overall completion</span><strong>{stats.progress}%</strong></div>
            <div className="progress-track"><span style={{ width: `${stats.progress}%` }} /></div>
          </div>
        </section>
      </div>
    </section>
  );
}

function SettingsView({
  projectName,
  columns,
  onSave,
}: {
  projectName: string;
  columns: BoardColumn[];
  onSave: (projectName: string, columns: BoardColumn[]) => void;
}) {
  const [name, setName] = useState(projectName);
  const [columnNames, setColumnNames] = useState(() => columns.map((column) => column.name));
  const [message, setMessage] = useState("");

  return (
    <form
      className="settings-view view-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || columnNames.some((columnName) => !columnName.trim())) {
          setMessage("Project and column names can’t be empty.");
          return;
        }
        onSave(name.trim(), columns.map((column, index) => ({ ...column, name: columnNames[index].trim() })));
        setMessage("Your project settings are saved.");
      }}
    >
      <div className="view-section-heading">
        <div><span className="eyebrow">WORKSPACE</span><h2>Make it yours</h2><p>Update your project name and the stages of work.</p></div>
        <span className="settings-icon"><Settings size={19} /></span>
      </div>
      <label className="settings-field">
        <span>Project name</span>
        <input value={name} onChange={(event) => { setName(event.target.value); setMessage(""); }} />
        <small>This name appears in your board snapshot.</small>
      </label>
      <fieldset className="column-settings">
        <legend>Board columns <span>{columns.length} stages · names are editable</span></legend>
        {columns.map((column, index) => (
          <label className="column-setting-row" key={column.id}>
            <span className="column-setting-index">0{index + 1}</span>
            <span className={`column-dot column-dot--${column.id}`} />
            <input
              aria-label={`Column ${index + 1} name`}
              value={columnNames[index]}
              onChange={(event) => {
                setColumnNames((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value));
                setMessage("");
              }}
            />
            <span className="fixed-column-label">Board stage</span>
          </label>
        ))}
      </fieldset>
      <div className="settings-footer">
        <span aria-live="polite">{message}</span>
        <button className="button button--primary" type="submit">Save changes</button>
      </div>
    </form>
  );
}

export default function TasklyApp() {
  const [today, setToday] = useState("2026-11-07");
  const [tasks, setTasks] = useState<Task[]>(() => createInitialTasks(new Date(2026, 10, 7)));
  const [columns, setColumns] = useState<BoardColumn[]>(INITIAL_COLUMNS);
  const [labelDefinitions, setLabelDefinitions] = useState<LabelDefinition[]>(INITIAL_LABELS);
  const [projectName, setProjectName] = useState("Product Launch");
  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const [captureColumnId, setCaptureColumnId] = useState<ColumnId | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [peekTaskId, setPeekTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [undo, setUndo] = useState<UndoState>(null);
  const [timers, setTimers] = useState<Record<string, TaskTimer>>({});
  const [timerNow, setTimerNow] = useState(0);
  const [timerStorageReady, setTimerStorageReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => getBoardStats(tasks), [tasks]);
  const sortedTasks = useMemo(() => filterAndSortTasks(tasks, query, sortBy), [tasks, query, sortBy]);
  const peekTask = tasks.find((task) => task.id === peekTaskId) ?? null;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      let stored: string | null;
      try {
        stored = window.localStorage.getItem(timerStorageKey);
      } catch {
        setToast({ message: "Timer storage is unavailable in this browser.", canUndo: false });
        return;
      }

      if (stored) {
        try {
          setTimers(parseTimers(stored));
        } catch {
          setToast({ message: "Saved timer data could not be restored.", canUndo: false });
        }
      }
      setTimerNow(Date.now());
      setTimerStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!timerStorageReady) return;
    try {
      window.localStorage.setItem(timerStorageKey, JSON.stringify(timers));
    } catch {
      window.setTimeout(
        () => setToast({ message: "Timer changes could not be saved in this browser.", canUndo: false }),
        0,
      );
    }
  }, [timers, timerStorageReady]);

  useEffect(() => {
    if (!Object.values(timers).some((timer) => timer.startedAt !== null)) return;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timers]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const reference = new Date();
      const dateKey = [
        reference.getFullYear(),
        String(reference.getMonth() + 1).padStart(2, "0"),
        String(reference.getDate()).padStart(2, "0"),
      ].join("-");
      setToday(dateKey);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setUndo(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!menuTaskId && !peekTaskId) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuTaskId(null);
        setPeekTaskId(null);
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (menuTaskId && !menuRef.current?.contains(event.target as Node)) setMenuTaskId(null);
      if (peekTaskId && !peekRef.current?.contains(event.target as Node)) setPeekTaskId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuTaskId, peekTaskId]);

  useEffect(() => {
    function onShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search tasks"]')?.focus();
      }
    }
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  const showToast = useCallback((message: string, canUndo = false) => {
    setToast({ message, canUndo });
  }, []);

  function openCapture(columnId: ColumnId) {
    setActiveView("Dashboard");
    setCaptureColumnId(columnId);
    setEditTaskId(null);
    setPeekTaskId(null);
    setMenuTaskId(null);
  }

  function navigate(view: View) {
    setActiveView(view);
    setCaptureColumnId(null);
    setEditTaskId(null);
    setMenuTaskId(null);
    setPeekTaskId(null);
  }

  function createTask(draft: TaskDraft) {
    if (!captureColumnId) return;
    const task: Task = {
      id: crypto.randomUUID(),
      ...draft,
      columnId: captureColumnId,
      createdAt: Date.now(),
    };
    setTasks((current) => [...current, task]);
    setCaptureColumnId(null);
    showToast("Task created");
  }

  function addColumn(name: string) {
    const column: BoardColumn = { id: `column-${crypto.randomUUID()}`, name };
    setColumns((current) => [...current, column]);
    showToast(`Column added: ${name}`);
  }

  function createLabel(name: string, color: LabelColor) {
    setLabelDefinitions((current) => [...current, { name, color }]);
  }

  function renameLabel(oldName: string, newName: string) {
    setLabelDefinitions((current) => current.map((label) => (
      label.name === oldName ? { ...label, name: newName } : label
    )));
    setTasks((current) => current.map((task) => ({
      ...task,
      labels: [...new Set(task.labels.map((label) => label === oldName ? newName : label))],
    })));
  }

  function changeLabelColor(name: string, color: LabelColor) {
    setLabelDefinitions((current) => current.map((label) => (
      label.name === name ? { ...label, color } : label
    )));
  }

  function removeLabel(name: string) {
    setLabelDefinitions((current) => current.filter((label) => label.name !== name));
    setTasks((current) => current.map((task) => ({
      ...task,
      labels: task.labels.filter((label) => label !== name),
    })));
  }

  function updateTask(taskId: string, changes: Partial<Task>) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...changes } : task));
  }

  function startTimer(taskId: string) {
    setTimers((current) => ({
      ...current,
      [taskId]: current[taskId] ?? { elapsedMs: 0, startedAt: Date.now() },
    }));
    setTimerNow(Date.now());
  }

  function pauseTimer(taskId: string) {
    setTimers((current) => {
      const timer = current[taskId];
      if (!timer || timer.startedAt === null) return current;
      const now = Date.now();
      return {
        ...current,
        [taskId]: { elapsedMs: getElapsedTime(timer, now), startedAt: null },
      };
    });
    setTimerNow(Date.now());
  }

  function resumeTimer(taskId: string) {
    setTimers((current) => {
      const timer = current[taskId];
      if (!timer || timer.startedAt !== null) return current;
      return { ...current, [taskId]: { ...timer, startedAt: Date.now() } };
    });
    setTimerNow(Date.now());
  }

  function deleteTask(taskId: string) {
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) return;
    const task = tasks[index];
    setUndo({ kind: "delete", task, index });
    setTasks((current) => current.filter((item) => item.id !== taskId));
    setMenuTaskId(null);
    setPeekTaskId(null);
    showToast("Task deleted", true);
  }

  function moveWithUndo(taskId: string, targetColumnId: ColumnId, targetIndex?: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (task.columnId === targetColumnId && targetIndex === undefined) {
      setPeekTaskId(null);
      return;
    }
    const sourceColumnTasks = tasks.filter((item) => item.columnId === task.columnId);
    const previousIndex = sourceColumnTasks.findIndex((item) => item.id === taskId);
    const nextTasks = moveTask(tasks, taskId, targetColumnId, targetIndex);
    if (nextTasks.every((item, index) => item.id === tasks[index]?.id && item.columnId === tasks[index]?.columnId)) {
      setMenuTaskId(null);
      return;
    }
    setUndo({ kind: "move", taskId, columnId: task.columnId, index: previousIndex });
    setTasks(nextTasks);
    setMenuTaskId(null);
    setPeekTaskId(null);
    const targetName = columns.find((column) => column.id === targetColumnId)?.name ?? "column";
    showToast(`Task moved to ${targetName}`, true);
  }

  function duplicateTask(task: Task) {
    const copy: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `Copy of ${task.title}`,
      labels: [...task.labels],
      createdAt: Date.now(),
    };
    setTasks((current) => {
      const index = current.findIndex((item) => item.id === task.id);
      return insertTaskAt(current, copy, index + 1);
    });
    setMenuTaskId(null);
    setPeekTaskId(null);
    showToast("Task duplicated");
  }

  function undoLastAction() {
    if (!undo) return;
    if (undo.kind === "delete") {
      setTasks((current) => insertTaskAt(current, undo.task, undo.index));
      showToast("Task restored");
    } else {
      setTasks((current) => moveTask(current, undo.taskId, undo.columnId, undo.index));
      showToast("Move undone");
    }
    setUndo(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find((task) => task.id === active.id);
    if (!activeTask) return;

    const overData = over.data.current as { type?: string; columnId?: ColumnId } | undefined;
    const targetColumnId = overData?.columnId;
    if (!targetColumnId) return;

    const orderedTasks = filterAndSortTasks(tasks, "", sortBy);
    const sourceTasks = orderedTasks.filter((task) => task.columnId === activeTask.columnId);
    const previousIndex = sourceTasks.findIndex((task) => task.id === activeTask.id);
    const targetTasks = orderedTasks.filter(
      (task) => task.columnId === targetColumnId && task.id !== activeTask.id,
    );
    const overTask = overData?.type === "task"
      ? orderedTasks.find((task) => task.id === String(over.id))
      : undefined;
    let targetIndex = targetTasks.length;

    if (overTask) {
      targetIndex = targetTasks.findIndex((task) => task.id === overTask.id);
      const translated = active.rect.current.translated;
      if (targetIndex >= 0 && translated) {
        const activeCenter = translated.top + translated.height / 2;
        const overCenter = over.rect.top + over.rect.height / 2;
        if (activeCenter > overCenter) targetIndex += 1;
      }
    }

    const nextTasks = moveTask(orderedTasks, activeTask.id, targetColumnId, targetIndex);
    const unchanged = nextTasks.every(
      (task, index) =>
        task.id === orderedTasks[index]?.id &&
        task.columnId === orderedTasks[index]?.columnId,
    );
    if (unchanged) return;

    setUndo({
      kind: "move",
      taskId: activeTask.id,
      columnId: activeTask.columnId,
      index: previousIndex,
    });
    setTasks(nextTasks);
    setSortBy("manual");
    setMenuTaskId(null);
    setPeekTaskId(null);
    const targetName = columns.find((column) => column.id === targetColumnId)?.name ?? "column";
    showToast(`Task moved to ${targetName}`, true);
  }

  function saveSettings(name: string, nextColumns: BoardColumn[]) {
    setProjectName(name);
    setColumns(nextColumns);
    showToast("Project settings saved");
  }

  function startEdit(taskId: string) {
    setCaptureColumnId(null);
    setEditTaskId(taskId);
    setMenuTaskId(null);
    setPeekTaskId(null);
  }

  function saveEdit(taskId: string, draft: TaskDraft) {
    updateTask(taskId, draft);
    setEditTaskId(null);
    showToast("Task updated");
  }

  const boardTasks = (columnId: ColumnId) => sortedTasks.filter((task) => task.columnId === columnId);
  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} projectName={projectName} onNavigate={navigate} />
      <main className="main-panel">
        <Header
          activeView={activeView}
          projectName={projectName}
          query={query}
          onQueryChange={setQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onAddTask={() => openCapture("inbox")}
        />

        {activeView === "Dashboard" && (
          <div className="dashboard-content">
            <BoardSnapshot stats={stats} projectName={projectName} />
            <div className="board-toolbar">
              <div className="board-view-label">
                <span className="board-view-icon"><Layers3 size={15} aria-hidden="true" /></span>
                <strong>Board</strong>
              </div>
              <div className="board-toolbar__right">
                <span className="board-count"><strong>{stats.total}</strong> tasks</span>
              </div>
            </div>

            <DndContext
              id="taskly-board"
              sensors={sensors}
              collisionDetection={(args) => {
                const pointerCollisions = pointerWithin(args);
                return pointerCollisions.length ? pointerCollisions : rectIntersection(args);
              }}
              onDragEnd={handleDragEnd}
            >
              <div className="board-scroll">
                <div className="board-grid">
                  {columns.map((column) => (
                    <BoardColumnView
                      key={column.id}
                      column={column}
                      columns={columns}
                      today={today}
                      labelDefinitions={labelDefinitions}
                      timers={timers}
                      timerNow={timerNow}
                      tasks={boardTasks(column.id)}
                      captureOpen={captureColumnId === column.id}
                      editTaskId={editTaskId}
                      menuTaskId={menuTaskId}
                      menuRef={menuRef}
                      onAddTask={() => openCapture(column.id)}
                      onRenameColumn={(columnId, name) => {
                        setColumns((current) => current.map((item) => item.id === columnId ? { ...item, name } : item));
                      }}
                      onSaveTask={createTask}
                      onCancelCapture={() => setCaptureColumnId(null)}
                      onOpenPeek={setPeekTaskId}
                      onToggleMenu={(taskId) => setMenuTaskId((current) => current === taskId ? null : taskId)}
                      onMoveTo={moveWithUndo}
                      onDuplicate={duplicateTask}
                      onEdit={startEdit}
                      onDelete={deleteTask}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => setEditTaskId(null)}
                      onUpdateTask={updateTask}
                      onCreateLabel={createLabel}
                      onRenameLabel={renameLabel}
                      onLabelColorChange={changeLabelColor}
                      onRemoveLabel={removeLabel}
                    />
                  ))}
                  <AddColumnControl onAdd={addColumn} />
                </div>
              </div>
            </DndContext>
            <div className="board-footnote"><GripVertical size={13} aria-hidden="true" />Drag a card to move it between stages</div>
          </div>
        )}

        {activeView === "Analytics" && <AnalyticsView tasks={tasks} columns={columns} stats={stats} />}
        {activeView === "Settings" && (
          <SettingsView projectName={projectName} columns={columns} onSave={saveSettings} />
        )}

        <footer className="page-footer">
          <span>Made for thoughtful work</span>
          <span><span className="footer-dot" />All changes are stored in this session only</span>
        </footer>
      </main>

      {peekTask && (
        <div ref={peekRef}>
          <TaskPeek
            task={peekTask}
            columns={columns}
            labelDefinitions={labelDefinitions}
            timer={timers[peekTask.id]}
            timerNow={timerNow}
            onClose={() => setPeekTaskId(null)}
            onEdit={() => startEdit(peekTask.id)}
            onDuplicate={() => duplicateTask(peekTask)}
            onMove={(columnId) => moveWithUndo(peekTask.id, columnId)}
            onUpdate={(changes) => updateTask(peekTask.id, changes)}
            onTimerStart={() => startTimer(peekTask.id)}
            onTimerPause={() => pauseTimer(peekTask.id)}
            onTimerResume={() => resumeTimer(peekTask.id)}
            onCreateLabel={createLabel}
            onRenameLabel={renameLabel}
            onLabelColorChange={changeLabelColor}
            onRemoveLabel={removeLabel}
          />
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast__check"><Check size={13} aria-hidden="true" /></span>
          <span className="toast__message">{toast.message}</span>
          {toast.canUndo && undo && (
            <button type="button" className="toast__undo" onClick={undoLastAction}>Undo</button>
          )}
          <button
            className="icon-button toast__close"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => { setToast(null); setUndo(null); }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
