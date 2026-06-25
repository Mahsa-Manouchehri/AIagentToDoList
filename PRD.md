# Product Requirement Document (PRD)
## Project: AI Agent Todo List

---

### 1. Product Overview
The **AI Agent Todo List** is an intelligent, agent-first task management workspace that combines a traditional, structured todo list with a conversational, command-driven AI Assistant. 

Unlike conventional productivity apps that force users to navigate complex menus, click multiple buttons, or manually type tags, this application allows users to orchestrate their tasks via natural language, receive automated subtask breakdowns, get smart categorization recommendations, and obtain a personalized daily focus strategy.

---

### 2. Core Objectives
- **Frictionless Entry**: Allow users to create, modify, schedule, and categorize tasks in seconds using simple conversational language.
- **Actionable Deconstruction**: Automatically break down high-level, intimidating goals into structured, bite-sized subtasks.
- **Smart Organization**: Use AI to dynamically suggest categories, priority levels, and execution sequences without manual input.
- **Focused Execution**: Provide a clean, high-contrast, single-page interface that removes clutter and guides focus toward high-priority items.

---

### 3. User Personas & Key Use Cases
#### User Personas:
- **The Fast-Paced Professional**: Wants to dump their thoughts or meeting items into a single chat input and have them immediately organized.
- **The Overwhelmed Planner**: Tends to write massive, vague tasks (e.g., "Launch marketing campaign") and needs immediate help chunking them down into subtasks.
- **The Minimalist Curator**: Prefers an elegant, high-contrast layout with keyboard-friendly interactions and swift task updates.

#### Key Use Cases:
1. **Conversational Task Batching**: 
   - *Input:* "Remind me to buy groceries, finish the TypeScript backend refactor (mark as high priority!), and water the plants."
   - *Result:* Three structured tasks are created, with the backend refactor set to High Priority and tagged as "Work", and the others categorized correctly.
2. **Goal Deconstruction (AI breakdown)**:
   - *Action:* Clicking "Break Down" on a task like "Prepare for tech interview".
   - *Result:* The AI generates 4-5 incremental, concrete subtasks (e.g., "Review Big O notation", "Solve 2 LeetCode easy arrays problems", "Mock system design layout").
3. **Daily Focus Digest**:
   - *Action:* The user opens the app and requests a dynamic daily strategy.
   - *Result:* The AI reviews the current stack of unfinished tasks, considers deadlines/priorities, and gives a 2-sentence encouraging summary of the 3 most impactful tasks to tackle first.

---

### 4. Functional Requirements

#### 4.1. Conversational AI Agent Panel (Command Center)
- **Chat Input**: A prominent, styled input field at the side or top of the workspace.
- **LLM Command Processing**: 
  - Parses user chat text using a server-side Gemini 3.5 Flash endpoint.
  - Detects actions: **Create**, **Update**, **Delete**, **Prioritize**, **Schedule**.
  - Translates requests into structural mutations in the task state.
- **Agent Feedback**: The AI explains what it did (e.g., *"Created 'TypeScript refactor' with High priority under 'Coding'. Let's crush this! 🚀"*) and presents options.

#### 4.2. Task Management Engine
- **Task Entity Model**:
  - `id`: unique identifier.
  - `title`: string.
  - `description`: optional string.
  - `status`: `'todo' | 'in_progress' | 'completed'`.
  - `priority`: `'high' | 'medium' | 'low'`.
  - `category`: string (e.g., `'Work'`, `'Personal'`, `'Shopping'`, `'Health'`).
  - `dueDate`: optional ISO string.
  - `subtasks`: Array of `{ id, title, completed }`.
  - `createdAt`: ISO string.
- **Direct CRUD Controls**:
  - Inline editing of task titles.
  - One-click checkboxes for complete/incomplete state toggling.
  - Quick priority selector badges.
  - Category tag pill buttons.
  - Quick task deletion.

#### 4.3. AI-Powered Smart Tools
- **Subtask Deconstructor**:
  - A specialized "Break Down" trigger on every task.
  - Asks the Gemini API to formulate 3-6 logical steps.
  - Inserts these directly into the task's `subtasks` field.
- **Dynamic Categorizer**:
  - Automatically identifies the context of a new task (e.g., "Schedule dental appointment" -> `'Health'`).
  - Automatically recommends a priority level if none is specified.
- **AI Focus Coach / Daily Digest**:
  - An interactive section displaying a short, conversational summary of the day's focus.
  - Generates insights on outstanding tasks and provides a strategic order of operations.

#### 4.4. Local Persistence
- **State Synchronization**: Automatically saves the task stack and chat history to `localStorage` to survive page reloads.

---

### 5. Non-Functional Requirements & Design Details

#### 5.1. UI/UX Style Guide
- **Visual Theme**: "Midnight Slate" — a premium, high-contrast dark-mode palette consisting of deep charcoal backgrounds (`#0f172a`), emerald accents (`#10b981`) for completed states, and warm amber highlights (`#f59e0b`) for active priorities.
- **Typography**: Display titles using bold **Inter** with tight letter-tracking, paired with **JetBrains Mono** for technical descriptors, counts, and tags.
- **Animations**:
  - Micro-interactions powered by `motion` (formerly `framer-motion`) for list sorting, checkbox state transitions, and slide-in panels.
  - Smooth fade-out of completed items (or separation into an expandable drawer).

#### 5.2. Workspace Architecture
- **Single-Screen Masterpiece**: The main window is divided into a high-utility dual-panel layout:
  1. **Left Panel: Conversational Command Center**: The AI Agent interface, conversation log, and daily digest coach.
  2. **Right Panel: Interactive Task Dashboard**: Tabbed views for task statuses, filters, inline edits, and breakdown actions.
- **Responsive Fluidity**: Adaptable sidebar collapse on mobile devices, converting to a focus-swapping tab bar.

---

### 6. LLM Integration Schema (Gemini API)
To support complex natural language interpretation, we utilize the modern `@google/genai` SDK on the backend server (`server.ts`) using the **`gemini-3.5-flash`** model.

#### 6.1. System Instruction for Command Parsing:
```text
You are the brain of the AI Agent Todo List app. Your job is to parse the user's natural language command, identify the list actions they want to take, and return a structured JSON response matching the state modification schema.

Actions you can suggest:
- CREATE_TASK: Create one or multiple tasks with optional properties (title, priority, category, dueDate).
- UPDATE_TASK: Modify properties of an existing task (finding by nearest keyword match).
- DELETE_TASK: Remove a task (finding by nearest keyword match).
- COMPLETE_TASK: Mark a task as completed.
- UNCOMPLETE_TASK: Mark a task as incomplete.
- GET_STRATEGY: The user is asking for general guidance, coaching, or a daily digest.

Always respond in a JSON format containing:
1. `actions`: An array of structured operations to perform on the database state.
2. `message`: A conversational response explaining what was done, styled as an inspiring productivity coach.
```

---

### 7. Success Metrics & Roadmap
- **Efficiency**: Reducing manual task-entry clicks by over 80%.
- **Deconstruction Rate**: Over 50% of high-level tasks being broken down into actionable subtasks.
- **Focus Stickiness**: High retention driven by the AI daily digest and motivational messages.
