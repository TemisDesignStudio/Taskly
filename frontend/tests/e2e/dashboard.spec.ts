import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("creates, edits, duplicates, deletes, and restores a task", async ({ page }) => {
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  const capture = page.locator(".quick-capture");
  await capture.getByRole("textbox", { name: "Task title" }).fill("Prepare launch moodboard");
  await capture.getByRole("textbox", { name: "Task details" }).fill("Collect a final set of visual references.");
  await capture.getByLabel("Priority").selectOption("High");
  await capture.getByLabel("Due date").fill("2026-12-01");
  await capture.getByLabel("Assignee").selectOption("maya");
  await capture.getByRole("button", { name: "Manage labels" }).click();
  await capture.getByRole("textbox", { name: "New label name" }).fill("Launch");
  await capture.getByRole("button", { name: "Add label" }).click();
  await expect(capture.getByRole("button", { name: "Manage labels" })).toContainText("Launch");
  await page.getByRole("button", { name: "Save task" }).click();
  const createdCard = page.locator('[data-task-id]').filter({ hasText: "Prepare launch moodboard" });
  await expect(createdCard.getByRole("button", { name: "Prepare launch moodboard", exact: true })).toBeVisible();
  await expect(createdCard.locator(".priority-control select")).toHaveValue("High");
  await expect(createdCard.locator(".due-date input[type=date]")).toHaveValue("2026-12-01");
  await expect(createdCard.locator(".assignee-control select")).toHaveValue("maya");
  await expect(createdCard.getByText("Launch", { exact: true })).toBeVisible();
  await expect(page.locator(".snapshot-stat").first()).toContainText("13");

  await page.getByRole("button", { name: "More options for Prepare launch moodboard", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit details" }).click();
  const card = page.locator('[data-task-id]').filter({ hasText: "Prepare launch moodboard" });
  await card.getByRole("textbox", { name: "Task title" }).fill("Launch moodboard");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Launch moodboard", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "More options for Launch moodboard", exact: true }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(page.getByRole("button", { name: "Copy of Launch moodboard", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "More options for Launch moodboard", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete task" }).click();
  await expect(page.locator(".toast")).toContainText("Task deleted");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Launch moodboard", exact: true })).toBeVisible();
});

test("supports quick move and drag-and-drop from the card body between columns", async ({ page }) => {
  const taskTitle = "Competitor design review";
  await page.getByRole("button", { name: `More options for ${taskTitle}`, exact: true }).click();
  await page.getByRole("menuitem", { name: "Move to" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const doneColumn = page.locator(".column--done");
  await expect(doneColumn.getByRole("button", { name: taskTitle, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".column--inbox").getByRole("button", { name: taskTitle, exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1500, height: 900 });
  const source = await page.locator(".column--inbox [data-task-id]").filter({ hasText: taskTitle }).boundingBox();
  const target = await page.locator(".column--review").boundingBox();
  expect(source).not.toBeNull();
  expect(target).not.toBeNull();
  if (!source || !target) throw new Error("Unable to locate the drag source or destination.");
  await page.mouse.move(source.x + source.width / 2, source.y + source.height - 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 8, source.y + source.height - 6, { steps: 4 });
  await page.mouse.move(target.x + target.width / 2, target.y + 70, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator(".column--review").getByRole("button", { name: taskTitle, exact: true })).toBeVisible();
});

test("reorders a card from the bottom to the top of its column", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.getByLabel("Sort tasks").selectOption("manual");
  const column = page.locator(".column--in-progress");
  const sourceCard = column.locator("[data-task-id]").last();
  const targetCard = column.locator("[data-task-id]").first();
  const source = await sourceCard.boundingBox();
  const target = await targetCard.boundingBox();
  expect(source).not.toBeNull();
  expect(target).not.toBeNull();
  if (!source || !target) throw new Error("Unable to locate cards for reordering.");
  const sourceTitle = (await sourceCard.getAttribute("data-task-id")) ?? "";
  await page.mouse.move(source.x + source.width / 2, source.y + source.height - 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height - 9, { steps: 4 });
  await page.mouse.move(target.x + target.width / 2, target.y + 4, { steps: 18 });
  await page.mouse.up();
  await expect(column.locator("[data-task-id]").first()).toHaveAttribute("data-task-id", sourceTitle);
});

test("searches, sorts, and opens an editable task peek", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search tasks" }).fill("whitespace");
  await expect(page.locator(".task-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Brand research & market analysis", exact: true })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search tasks" }).fill("");
  await page.getByLabel("Sort tasks").selectOption("priority");
  await expect(page.locator(".column--inbox .task-card").first()).toContainText("High");
  await expect(page.getByText("Focus", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Brand research & market analysis", exact: true }).click();
  const peek = page.getByRole("dialog");
  await expect(peek).toBeVisible();
  await peek.getByLabel("Assignee").selectOption("james");
  await expect(peek.getByLabel("Assignee")).toHaveValue("james");
  await page.keyboard.press("Escape");
  await expect(peek).toBeHidden();
});

test("card fields can be edited directly without opening the task peek", async ({ page }) => {
  const taskTitle = "Competitor design review";
  const card = page.locator(".column--inbox [data-task-id]").filter({ hasText: taskTitle });
  await card.locator(".priority-control select").selectOption("Low");
  await expect(card.locator(".priority-control select")).toHaveValue("Low");
  await card.locator(".due-date input[type=date]").fill("2026-12-01");
  await expect(card.locator(".due-date input[type=date]")).toHaveValue("2026-12-01");
  await card.locator(".assignee-control select").selectOption("maya");
  await expect(card.locator(".assignee-control select")).toHaveValue("maya");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await card.getByRole("button", { name: `More options for ${taskTitle}`, exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit details" }).click();
  const editor = card.locator(".inline-editor");
  const editorBounds = await editor.boundingBox();
  const dueDateBounds = await editor.getByLabel("Due date").boundingBox();
  expect(editorBounds).not.toBeNull();
  expect(dueDateBounds).not.toBeNull();
  if (!editorBounds || !dueDateBounds) throw new Error("Unable to measure the task editor and due date field.");
  expect(dueDateBounds.x + dueDateBounds.width).toBeLessThanOrEqual(editorBounds.x + editorBounds.width + 1);
});

test("renames a column inline and keeps the new name in settings", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Inbox column name" }).click();
  const nameInput = page.getByRole("textbox", { name: "Edit Inbox column name" });
  await nameInput.fill("Incoming");
  await nameInput.press("Enter");
  await expect(page.getByRole("region", { name: "Incoming column" })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Column 1 name")).toHaveValue("Incoming");
});

test("keeps the remaining views working and updates project settings", async ({ page }) => {
  await expect(page.getByRole("button", { name: "My Tasks" })).toHaveCount(0);
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Progress at a glance" })).toBeVisible();
  await expect(page.locator(".analytics-stat").first()).toContainText("12");

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Project name").fill("Northstar Launch");
  await page.getByLabel("Column 1 name").fill("Incoming");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your project settings are saved.")).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.locator("header").getByText("Northstar Launch")).toBeVisible();
  await expect(page.getByRole("region", { name: "Incoming column" })).toBeVisible();
});

test("adds and renames a fixed-width column with board-only horizontal scrolling", async ({ page }) => {
  await page.getByRole("button", { name: "Add column" }).click();
  await page.getByRole("textbox", { name: "New column name" }).fill("Ready to ship");
  await page.getByRole("button", { name: "Add column", exact: true }).last().click();
  const addedColumn = page.getByRole("region", { name: "Ready to ship column" });
  await expect(addedColumn).toBeVisible();
  const scrollMetrics = await page.locator(".board-scroll").evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Column 6 name").fill("Ready");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("region", { name: "Ready column" })).toBeVisible();
});

test("manages shared labels and persists running task timers across reloads", async ({ page }) => {
  const taskTitle = "Brand research & market analysis";
  await page.getByRole("button", { name: taskTitle, exact: true }).click();
  const peek = page.getByRole("dialog");
  await peek.getByRole("button", { name: "Manage labels" }).click();
  await peek.getByRole("button", { name: "Edit label Research" }).click();
  await peek.getByRole("textbox", { name: "Edit label name" }).fill("Discovery");
  await peek.getByRole("button", { name: "Save label" }).click();
  await expect(peek.getByText("Discovery", { exact: true })).toBeVisible();
  await peek.getByRole("button", { name: "Manage labels" }).click();
  await peek.getByRole("button", { name: "Remove label Strategy" }).click();
  await expect(peek.getByText("Strategy", { exact: true })).toHaveCount(0);
  await expect(peek.getByRole("heading", { name: taskTitle })).toBeVisible();

  await peek.getByRole("button", { name: "Duplicate" }).click();
  const copy = page.locator(".column--inbox [data-task-id]").filter({ hasText: `Copy of ${taskTitle}` });
  await expect(copy).toBeVisible();
  await expect(copy.locator(".timer-badge")).toHaveCount(0);
  await page.getByRole("button", { name: taskTitle, exact: true }).click();
  const timerPeek = page.getByRole("dialog");
  await timerPeek.getByRole("button", { name: "Start timer" }).click();
  await expect(timerPeek.getByText("00:00:00")).toBeVisible();
  await page.waitForTimeout(1100);
  await timerPeek.getByRole("button", { name: "Close task details" }).click();
  await expect(page.locator(".column--inbox [data-task-id]").filter({ hasText: taskTitle }).locator(".timer-badge")).toContainText("00:00:");
  await page.reload();
  const card = page.locator(".column--inbox [data-task-id]").filter({ hasText: taskTitle });
  await expect(card.locator(".timer-badge.is-running")).toBeVisible();
  await card.getByRole("button", { name: taskTitle, exact: true }).click();
  const reopenedPeek = page.getByRole("dialog");
  await expect(reopenedPeek.getByRole("button", { name: "Pause timer" })).toBeVisible();
  await reopenedPeek.getByRole("button", { name: "Pause timer" }).click();
  await expect(card.locator(".timer-badge.is-paused")).toBeVisible();
  await reopenedPeek.getByRole("button", { name: "Resume timer" }).click();
  await expect(reopenedPeek.getByRole("button", { name: "Pause timer" })).toBeVisible();
});

test("keeps the board usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Good morning, Emma" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator(".board-scroll")).toHaveCSS("overflow-x", "auto");
  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
});
