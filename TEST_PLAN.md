## Scope

Validate the AI Agent Todo List MVP across:

- Core task CRUD behavior
- Priority, category, tag, and status controls
- Filtering and search behavior
- Sera Copilot conversational parsing
- AI task breakdown and focus digest generation
- Drag-and-drop plaintext and JSON batch import
- Offline/browser persistence through localStorage
- API failure and slow-response handling
- Responsive behavior on desktop and mobile widths

## Out of Scope

- Multi-user sync
- Relational database persistence
- Authentication
- Cross-device task sync
- Production security review
- Long-term AI quality benchmarking

Note: If this version uses only localStorage, then persistence testing must be limited to the same browser/profile. We should not imply cloud persistence unless a real backend database exists.

## Test Environment

- Browser: Chrome latest
- Secondary browser check: Safari or Firefox
- Viewports: desktop, tablet, mobile
- Network: normal, slow 3G/throttled, offline
- Storage: localStorage enabled, then localStorage cleared for reset tests
- Backend/API: configured Gemini backend or local mock endpoint, depending on build setup

## Entry Criteria

- App builds successfully.
- App runs without console startup errors.
- Core UI is visible on first load.
- AI backend configuration is documented.
- Tester knows whether the app is using real Gemini, a mock endpoint, or no backend.

## Test Data

Use these baseline tasks during testing:

- `Call John tomorrow at 10am` - Priority: High, Category: Work, Tags: follow-up, phone
- `Buy groceries after work` - Priority: Medium, Category: Personal, Tags: errands
- `Review budget spreadsheet Friday` - Priority: High, Category: Finance, Tags: review
- `Book dentist appointment` - Priority: Low, Category: Health, Tags: appointment
- `Prepare meeting notes for Monday` - Priority: Medium, Category: Work, Tags: meeting

## 1. Manual Task Creation

### TC-01: Create a Basic Task

Steps:

1. Open the app.
2. Enter `Call John tomorrow at 10am`.
3. Save/add the task.

Expected result:

- Task appears in the list.
- Task title matches exactly.
- Default status is not completed.
- Default priority/category behavior is clear and consistent.
- No duplicate task is created.

### TC-02: Create Task With Priority and Category

Steps:

1. Enter `Review budget spreadsheet Friday`.
2. Select Priority: High.
3. Select Category: Finance.
4. Save/add the task.

Expected result:

- Task appears with High priority.
- Task appears under Finance category.
- Priority/category labels are visible and accurate.
- Values remain correct after refresh.

### TC-03: Reject Empty Task

Steps:

1. Leave task input empty.
2. Click add/save.

Expected result:

- No blank task is created.
- User receives clear feedback or the action is safely ignored.
- No console error appears.

## 2. Editing, Status, and Deletion

### TC-04: Edit Existing Task

Steps:

1. Create `Buy groceries after work`.
2. Edit title to `Buy groceries and pharmacy items after work`.
3. Save.

Expected result:

- Updated title is shown.
- Old title is no longer visible.
- Priority/category/tags are not accidentally reset.
- Change remains after refresh.

### TC-05: Status Cycling

Steps:

1. Create a task.
2. Cycle through each available status.
3. Refresh page.

Expected result:

- Status changes in the expected order.
- Visual state matches actual task state.
- Final status persists after refresh.

### TC-06: Delete Task

Steps:

1. Create a task.
2. Delete it.
3. Refresh page.

Expected result:

- Task is removed immediately.
- Task does not return after refresh.
- Other tasks remain unchanged.

## 3. Filtering, Tags, and Search

### TC-07: Filter by Priority

Steps:

1. Create at least one High, Medium, and Low priority task.
2. Filter by High.

Expected result:

- Only High priority tasks are shown.
- Task count, if displayed, matches visible results.
- Clearing filter restores all tasks.

### TC-08: Filter by Category

Steps:

1. Create Work, Personal, Finance, and Health tasks.
2. Filter by Work.

Expected result:

- Only Work tasks are shown.
- Other categories are hidden.
- Clearing filter restores all tasks.

### TC-09: Filter by Tag

Steps:

1. Create tasks with tags `meeting`, `review`, and `phone`.
2. Filter by `meeting`.

Expected result:

- Only tasks with `meeting` tag are shown.
- Tag matching is consistent and not case-fragile unless explicitly designed that way.

## 4. Sera Copilot Conversational Parsing

This is a key risk area. We need to verify that Sera Copilot changes client-side state correctly and does not perform extra actions.

### TC-10: Direct Task Creation

Input:

`Add a task to call John tomorrow at 10am with high priority.`

Expected result:

- One task is created.
- Title is close to `Call John tomorrow at 10am`.
- Priority is High.
- No unrelated tasks are created.

### TC-11: Batch Add

Input:

`Add three tasks: call John, buy groceries, and review the budget spreadsheet.`

Expected result:

- Exactly three tasks are created.
- Each task has a clear title.
- No task is merged incorrectly.
- No extra tasks are created.

### TC-12: Mark Task Complete

Setup:

- Existing task: `Call John tomorrow at 10am`

Input:

`Mark the John task as done.`

Expected result:

- Only the matching John task changes to completed/done.
- Other tasks remain unchanged.

### TC-13: Update Existing Task

Setup:

- Existing task: `Review budget spreadsheet Friday`

Input:

`Move the budget review task to high priority and tag it as finance.`

Expected result:

- Existing task is updated.
- A duplicate task is not created.
- Priority becomes High.
- Tag/category behavior is correct according to app design.

### TC-14: Ambiguous Command

Input:

`Make the important one done.`

Expected result:

- App asks for clarification or safely refuses.
- It does not randomly complete a task.
- No data is lost.

### TC-15: Empty Command

Input:

``

Expected result:

- No state mutation occurs.
- User receives clear feedback or action is safely ignored.
- No console error appears.

### TC-16: Conflicting Command

Input:

`Delete all tasks but keep all my tasks.`

Expected result:

- App does not delete anything without confirmation.
- User receives a clear conflict/clarification message.

## 5. AI-Powered Integrations

### TC-17: AI Task Breakdown

Input task:

`Plan a small team demo for Friday`

Action:

Run AI breakdown.

Expected result:

- Breakdown returns practical subtasks.
- Subtasks are relevant to the original task.
- App does not overwrite the original task without clear user action.
- User can accept, reject, or ignore the breakdown.

Pass criteria:

- At least 3 useful subtasks are generated.
- No hallucinated external commitments are created.
- Failure state is handled cleanly if the API is unavailable.

### TC-18: Focus Digest

Setup:

- At least 5 tasks across priority/category/status.

Action:

Generate focus digest.

Expected result:

- Digest highlights the highest-priority or most urgent work.
- Completed tasks are not treated as active work.
- Digest is readable and not overly long.
- App handles empty task list gracefully.

## 6. API Failure and Slow Response Handling

### TC-19: AI Backend Unavailable

Setup:

- Disable backend or simulate failed API response.

Action:

Use Sera Copilot or AI breakdown.

Expected result:

- App shows a clear error state.
- Existing tasks remain unchanged.
- User can continue using manual task features.
- No infinite loading state.

### TC-20: Slow AI Response

Setup:

- Simulate slow network/API response.

Expected result:

- Loading state is visible.
- User is not able to accidentally submit the same command multiple times unless the app handles dedupe.
- App recovers after response or timeout.

### TC-21: Invalid AI Response Format

Setup:

- Mock backend returns malformed JSON or unexpected fields.

Expected result:

- App does not crash.
- No unsafe state mutation occurs.
- Error is visible or logged clearly.

## 7. File Batch Import

### TC-22: Plaintext Import

File content:

```txt
Call John tomorrow
Buy groceries
Review budget spreadsheet
```

Expected result:

- Exactly three tasks are imported.
- Each line becomes one task.
- Blank lines are ignored.

### TC-23: Valid JSON Import

File content:

```json
[
  {
    "title": "Book dentist appointment",
    "priority": "low",
    "category": "health",
    "tags": ["appointment"]
  },
  {
    "title": "Prepare meeting notes",
    "priority": "medium",
    "category": "work",
    "tags": ["meeting"]
  }
]
```

Expected result:

- Exactly two tasks are imported.
- Priority, category, and tags map correctly.
- Imported tasks persist after refresh.

### TC-24: Invalid JSON Import

File content:

```json
{ "title": "Broken import",
```

Expected result:

- App shows a clear import error.
- No partial or corrupt task is created.
- Existing tasks remain unchanged.

### TC-25: Duplicate Import

Steps:

1. Import the same valid file twice.

Expected result:

- App either prevents duplicates or clearly allows them by design.
- Behavior must be documented.

## 8. localStorage Persistence

### TC-26: Refresh Persistence

Steps:

1. Add 3 tasks.
2. Edit 1 task.
3. Mark 1 task done.
4. Delete 1 task.
5. Refresh page.

Expected result:

- Remaining tasks preserve title, priority, category, tags, and status.
- Deleted task does not return.

### TC-27: Close and Reopen Browser

Steps:

1. Add tasks.
2. Close browser tab/window.
3. Reopen app in same browser profile.

Expected result:

- Tasks are still present.
- State matches pre-close state.

### TC-28: Clear Storage Reset

Steps:

1. Clear localStorage.
2. Reload app.

Expected result:

- App starts cleanly.
- Empty state is shown.
- No crash or broken UI.

## 9. Responsive and UI Checks

### TC-29: Mobile Layout

Viewport:

- 390x844

Expected result:

- Task input is usable.
- Buttons do not overlap.
- Filters remain accessible.
- Long task titles wrap cleanly.

### TC-30: Desktop Layout

Viewport:

- 1440x900

Expected result:

- Main task workflow is visible without unnecessary scrolling.
- Controls are aligned and readable.
- Empty, loading, and error states look intentional.

## Acceptance Criteria

The MVP can be considered QA-passed when:

- Manual create/edit/delete/status flows work.
- Filtering by priority, category, and tag works.
- Sera Copilot handles direct creation, batch adds, updates, and completions correctly.
- Ambiguous or unsafe AI commands do not mutate data without clarification.
- AI breakdown and focus digest have clear loading, success, and failure states.
- Plaintext and JSON imports work.
- Invalid import files do not corrupt existing data.
- localStorage persistence survives refresh and browser reopen.
- API failure does not break manual task management.
- Mobile and desktop layouts are usable.
- No blocking console errors appear during core workflows.

## Exit Decision

Current status: **GO with revisions before final QA sign-off.**

I would not call this final until the negative AI cases, persistence checks, invalid import cases, and acceptance criteria are explicitly tested and documented with pass/fail results.
