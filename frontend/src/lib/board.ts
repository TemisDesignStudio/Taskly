export type ColumnId = string;
export type Priority = "Low" | "Medium" | "High";
export type SortOption = "manual" | "dueDate" | "priority" | "newest";
export type LabelColor = "violet" | "lilac" | "peach" | "sand" | "rose" | "sage" | "neutral";

export type LabelDefinition = {
  name: string;
  color: LabelColor;
};

export type TaskTimer = {
  elapsedMs: number;
  startedAt: number | null;
};

export type BoardColumn = {
  id: ColumnId;
  name: string;
};

export type BoardUser = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  columnId: ColumnId;
  labels: string[];
  priority: Priority;
  dueDate: string | null;
  assigneeId: string;
  createdAt: number;
};

export type BoardStats = {
  total: number;
  inProgress: number;
  done: number;
  progress: number;
};

export const INITIAL_COLUMNS: BoardColumn[] = [
  { id: "inbox", name: "Inbox" },
  { id: "todo", name: "To Do" },
  { id: "in-progress", name: "In Progress" },
  { id: "review", name: "Review" },
  { id: "done", name: "Done" },
];

export const USERS: BoardUser[] = [
  { id: "emma", name: "Emma Rodriguez", initials: "ER", color: "lilac" },
  { id: "james", name: "James Chen", initials: "JC", color: "sand" },
  { id: "maya", name: "Maya Patel", initials: "MP", color: "sage" },
  { id: "oliver", name: "Oliver Grant", initials: "OG", color: "rose" },
];

export const LABEL_COLORS: LabelColor[] = [
  "violet",
  "lilac",
  "peach",
  "sand",
  "rose",
  "sage",
  "neutral",
];

export const INITIAL_LABELS: LabelDefinition[] = [
  { name: "Research", color: "violet" },
  { name: "Strategy", color: "peach" },
  { name: "Design", color: "violet" },
  { name: "UX/UI", color: "lilac" },
  { name: "Content", color: "sand" },
  { name: "Marketing", color: "rose" },
  { name: "Branding", color: "lilac" },
  { name: "Campaign", color: "neutral" },
  { name: "Development", color: "peach" },
  { name: "Review", color: "lilac" },
  { name: "Setup", color: "sage" },
];

function dateOffset(days: number, reference: Date): string {
  const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialTasks(reference: Date): Task[] {
  const now = reference.getTime();
  const ago = (days: number) => now - days * 86_400_000;

  return [
    {
      id: "task-brand-research",
      title: "Brand research & market analysis",
      description: "Map the category, identify whitespace and share a concise opportunity report with the team.",
      columnId: "inbox",
      labels: ["Research", "Strategy"],
      priority: "High",
      dueDate: dateOffset(3, reference),
      assigneeId: "emma",
      createdAt: ago(1),
    },
    {
      id: "task-competitor-review",
      title: "Competitor design review",
      description: "Gather visual references from five relevant brands and call out patterns worth challenging.",
      columnId: "inbox",
      labels: ["Design"],
      priority: "Medium",
      dueDate: dateOffset(7, reference),
      assigneeId: "james",
      createdAt: ago(2),
    },
    {
      id: "task-website-wireframes",
      title: "Website wireframes",
      description: "Shape the core landing page and product flow before moving into visual design.",
      columnId: "todo",
      labels: ["Design", "UX/UI"],
      priority: "High",
      dueDate: dateOffset(2, reference),
      assigneeId: "maya",
      createdAt: ago(3),
    },
    {
      id: "task-content-plan",
      title: "Content plan for launch",
      description: "Align the launch story across the website, email and social channels.",
      columnId: "todo",
      labels: ["Content", "Marketing"],
      priority: "Medium",
      dueDate: dateOffset(8, reference),
      assigneeId: "oliver",
      createdAt: ago(4),
    },
    {
      id: "task-brand-assets",
      title: "Update brand assets",
      description: "Prepare the approved logo exports and shared asset library for the launch team.",
      columnId: "todo",
      labels: ["Branding"],
      priority: "Low",
      dueDate: dateOffset(12, reference),
      assigneeId: "emma",
      createdAt: ago(5),
    },
    {
      id: "task-campaign-assets",
      title: "Create campaign assets",
      description: "Design a flexible set of social, web and email creative for the product launch campaign.",
      columnId: "in-progress",
      labels: ["Design", "Campaign"],
      priority: "High",
      dueDate: dateOffset(1, reference),
      assigneeId: "maya",
      createdAt: ago(6),
    },
    {
      id: "task-landing-page",
      title: "Implement landing page",
      description: "Build the launch page from the approved wireframes and component library.",
      columnId: "in-progress",
      labels: ["Development"],
      priority: "Medium",
      dueDate: dateOffset(4, reference),
      assigneeId: "emma",
      createdAt: ago(7),
    },
    {
      id: "task-analytics",
      title: "Set up analytics tracking",
      description: "Define launch events and verify that the measurement plan covers key conversion steps.",
      columnId: "in-progress",
      labels: ["Development"],
      priority: "Low",
      dueDate: dateOffset(9, reference),
      assigneeId: "james",
      createdAt: ago(8),
    },
    {
      id: "task-ui-review",
      title: "Final UI review",
      description: "Review responsive layouts, polish details and record any final changes before approval.",
      columnId: "review",
      labels: ["Design", "Review"],
      priority: "High",
      dueDate: dateOffset(2, reference),
      assigneeId: "emma",
      createdAt: ago(9),
    },
    {
      id: "task-marketing-assets",
      title: "Prepare marketing assets",
      description: "Package the final campaign graphics in the requested formats and sizes.",
      columnId: "review",
      labels: ["Marketing"],
      priority: "Medium",
      dueDate: dateOffset(6, reference),
      assigneeId: "oliver",
      createdAt: ago(10),
    },
    {
      id: "task-final-approval",
      title: "Approve final designs",
      description: "Confirm the final set of brand and launch deliverables with the client.",
      columnId: "done",
      labels: ["Design"],
      priority: "Medium",
      dueDate: dateOffset(-2, reference),
      assigneeId: "emma",
      createdAt: ago(11),
    },
    {
      id: "task-launch-prep",
      title: "Launch preparation",
      description: "Run the handoff checklist and confirm all launch materials are ready to publish.",
      columnId: "done",
      labels: ["Setup"],
      priority: "Low",
      dueDate: dateOffset(-4, reference),
      assigneeId: "james",
      createdAt: ago(12),
    },
  ];
}

export function getBoardStats(tasks: Task[]): BoardStats {
  const total = tasks.length;
  const done = tasks.filter((task) => task.columnId === "done").length;

  return {
    total,
    inProgress: tasks.filter((task) => task.columnId === "in-progress").length,
    done,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function filterAndSortTasks(
  tasks: Task[],
  query: string,
  sortBy: SortOption,
): Task[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = tasks.filter((task) => {
    if (!normalizedQuery) return true;
    return `${task.title} ${task.description}`.toLocaleLowerCase().includes(normalizedQuery);
  });

  return filtered
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      let order = 0;
      if (sortBy === "manual") {
        order = 0;
      } else if (sortBy === "dueDate") {
        if (left.task.dueDate && right.task.dueDate) {
          order = left.task.dueDate.localeCompare(right.task.dueDate);
        } else if (left.task.dueDate) {
          order = -1;
        } else if (right.task.dueDate) {
          order = 1;
        }
      } else if (sortBy === "priority") {
        const rank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
        order = rank[left.task.priority] - rank[right.task.priority];
      } else {
        order = right.task.createdAt - left.task.createdAt;
      }

      return order || left.index - right.index;
    })
    .map(({ task }) => task);
}

export function insertTaskAt(tasks: Task[], task: Task, index: number): Task[] {
  const next = [...tasks];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, task);
  return next;
}

export function moveTask(
  tasks: Task[],
  taskId: string,
  targetColumnId: ColumnId,
  targetIndex?: number,
): Task[] {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return tasks;

  const targetTasks = tasks.filter((item) => item.columnId === targetColumnId && item.id !== taskId);
  const movedTask = { ...task, columnId: targetColumnId };
  targetTasks.splice(
    Math.max(0, Math.min(targetIndex ?? targetTasks.length, targetTasks.length)),
    0,
    movedTask,
  );

  const columns = [...new Set(tasks.map((item) => item.columnId))];
  if (!columns.includes(targetColumnId)) columns.push(targetColumnId);
  return columns.flatMap((columnId) => {
    if (columnId === targetColumnId) return targetTasks;
    return tasks.filter((item) => item.columnId === columnId && item.id !== taskId);
  });
}

export function getElapsedTime(timer: TaskTimer, now: number): number {
  return timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt));
}

export function formatElapsedTime(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatRunningTime(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseTimers(value: string): Record<string, TaskTimer> {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    throw new Error("Stored timers must be an object.");
  }

  const timers: Record<string, TaskTimer> = {};
  for (const [taskId, candidate] of Object.entries(parsed)) {
    if (!isRecord(candidate)) {
      throw new Error(`Stored timer for ${taskId} is invalid.`);
    }
    if (
      typeof candidate.elapsedMs !== "number" ||
      !Number.isFinite(candidate.elapsedMs) ||
      candidate.elapsedMs < 0 ||
      (candidate.startedAt !== null &&
        (typeof candidate.startedAt !== "number" ||
          !Number.isFinite(candidate.startedAt) ||
          candidate.startedAt < 0))
    ) {
      throw new Error(`Stored timer for ${taskId} is invalid.`);
    }
    timers[taskId] = {
      elapsedMs: candidate.elapsedMs,
      startedAt: candidate.startedAt,
    };
  }
  return timers;
}

export function getDueDateState(
  dueDate: string | null,
  todayValue: string,
): "none" | "overdue" | "soon" | "upcoming" {
  if (!dueDate) return "none";
  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const [todayYear, todayMonth, todayDay] = todayValue.split("-").map(Number);
  const today = new Date(todayYear, todayMonth - 1, todayDay);
  const daysUntil = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 3) return "soon";
  return "upcoming";
}
