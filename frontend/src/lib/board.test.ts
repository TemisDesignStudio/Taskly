import { describe, expect, it } from "vitest";
import {
  createInitialTasks,
  filterAndSortTasks,
  getBoardStats,
  getDueDateState,
  insertTaskAt,
  moveTask,
  formatElapsedTime,
  formatRunningTime,
  getElapsedTime,
  parseTimers,
} from "./board";

describe("board calculations", () => {
  it("calculates progress and counts from the task state", () => {
    const tasks = createInitialTasks(new Date(2026, 10, 7));
    expect(getBoardStats(tasks)).toEqual({
      total: 12,
      inProgress: 3,
      done: 2,
      progress: 17,
    });
    expect(getBoardStats([])).toEqual({
      total: 0,
      inProgress: 0,
      done: 0,
      progress: 0,
    });
  });

  it("searches titles and descriptions without changing source tasks", () => {
    const tasks = createInitialTasks(new Date(2026, 10, 7));
    expect(filterAndSortTasks(tasks, "whitespace", "newest").map((task) => task.id)).toEqual([
      "task-brand-research",
    ]);
    expect(filterAndSortTasks(tasks, "  DESIGN  ", "newest")).toHaveLength(4);
    expect(tasks).toHaveLength(12);
  });

  it("sorts dates, priorities, and newest tasks with stable ties", () => {
    const tasks = createInitialTasks(new Date(2026, 10, 7));
    expect(filterAndSortTasks(tasks, "", "dueDate")[0].id).toBe("task-launch-prep");
    expect(filterAndSortTasks(tasks, "", "priority")[0].priority).toBe("High");
    expect(filterAndSortTasks(tasks, "", "newest")[0].id).toBe("task-brand-research");
  });

  it("moves a task across columns and restores it at a requested position", () => {
    const tasks = createInitialTasks(new Date(2026, 10, 7));
    const moved = moveTask(tasks, "task-brand-research", "done", 1);
    expect(moved.find((task) => task.id === "task-brand-research")?.columnId).toBe("done");
    expect(moved.filter((task) => task.columnId === "done").map((task) => task.id)).toEqual([
      "task-final-approval",
      "task-brand-research",
      "task-launch-prep",
    ]);

    const restored = insertTaskAt(
      moved.filter((task) => task.id !== "task-brand-research"),
      tasks[0],
      0,
    );
    expect(restored[0].id).toBe("task-brand-research");
  });

  it("reorders a task within its current column", () => {
    const tasks = createInitialTasks(new Date(2026, 10, 7));
    const moved = moveTask(tasks, "task-campaign-assets", "in-progress", 0);
    expect(moved.filter((task) => task.columnId === "in-progress").map((task) => task.id)).toEqual([
      "task-campaign-assets",
      "task-landing-page",
      "task-analytics",
    ]);
  });

  it("moves tasks into dynamically added columns without losing other column order", () => {
    const tasks = createInitialTasks(new Date(2026, 10, 7));
    const moved = moveTask(tasks, "task-brand-research", "column-custom", 0);
    expect(moved.find((task) => task.id === "task-brand-research")?.columnId).toBe("column-custom");
    expect(moved.filter((task) => task.columnId === "inbox").map((task) => task.id)).toEqual([
      "task-competitor-review",
    ]);
  });

  it("calculates and formats elapsed timer time from timestamps", () => {
    const running = { elapsedMs: 15 * 60_000, startedAt: 1_000 };
    expect(getElapsedTime(running, 1_000 + 70 * 60_000)).toBe(85 * 60_000);
    expect(formatElapsedTime(85 * 60_000)).toBe("1h 25m");
    expect(formatElapsedTime(2 * 86_400_000 + 3 * 3_600_000)).toBe("2d 3h");
    expect(formatRunningTime(84_350)).toBe("00:01:24");
  });

  it("restores valid timer records and rejects malformed storage", () => {
    expect(parseTimers('{"task-1":{"elapsedMs":60000,"startedAt":100}}')).toEqual({
      "task-1": { elapsedMs: 60000, startedAt: 100 },
    });
    expect(() => parseTimers('{"task-1":{"elapsedMs":-1,"startedAt":null}}')).toThrow();
    expect(() => parseTimers("[]")).toThrow();
  });

  it("marks overdue and near-future dates without flagging later dates", () => {
    const today = "2026-11-07";
    expect(getDueDateState("2026-11-06", today)).toBe("overdue");
    expect(getDueDateState("2026-11-10", today)).toBe("soon");
    expect(getDueDateState("2026-11-11", today)).toBe("upcoming");
    expect(getDueDateState(null, today)).toBe("none");
  });
});
