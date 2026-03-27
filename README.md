# Copilot Dashboard

A local Azure ADO-style task board that uses the [GitHub Copilot SDK](https://www.npmjs.com/package/@github/copilot-sdk) to automatically process tasks. Create tasks with rich context (text, images, links), move them to **Active**, and GitHub Copilot will process them and post results back — all running on your local machine.

## Features

- **ADO-like Kanban Board** — Three columns: New → Active → Done with drag-and-drop
- **Rich Task Context** — Attach text notes, URLs, and images to any task
- **GitHub Copilot SDK Integration** — Tasks in the Active column are automatically sent to Copilot for processing via the official `@github/copilot-sdk`
- **Real-time Updates** — WebSocket connection keeps the board in sync as Copilot completes tasks
- **Local Storage** — All data stored in JSON files on your machine — no external database needed
- **Settings Page** — Configure your preferred AI model (authentication is automatic via `gh` CLI)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- A GitHub account with a [GitHub Copilot](https://github.com/features/copilot) subscription
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and logged in — run `gh auth login` if needed

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Build the frontend

```bash
npm run build
```

### 3. Start the server

```bash
npm start
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### 4. (Optional) Configure settings

1. Go to **Settings** in the app (⚙️ in the sidebar)
2. Select your preferred AI model
3. Click **Save Settings**

Authentication is handled automatically through your GitHub CLI login (`gh auth login`). If you prefer to use a personal access token instead, you can paste it in the Settings page.

## Development Mode

Run the backend and frontend separately for hot-reload development:

```bash
# Terminal 1 — backend with nodemon
npm run dev:backend

# Terminal 2 — frontend Vite dev server
npm run dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173).

## How It Works

1. **Create a Task** — Click "+ New Task" and give it a title
2. **Add Context** — Open the task and add text notes, reference URLs, or images to help Copilot understand what needs to be done
3. **Activate** — Move the task to the **Active** column (drag-and-drop, or use the status buttons inside the task)
4. **Copilot Processes** — The backend picks up the active task within 5 seconds, creates a Copilot SDK session, sends all its context, and waits for a response
5. **Done** — The task automatically moves to **Done** with Copilot's response visible in the task detail

## Architecture

The backend uses `@github/copilot-sdk` to communicate with GitHub Copilot via JSON-RPC. When a task is activated:

1. A `CopilotClient` instance spawns (or reuses) the Copilot CLI process
2. A new session is created with the configured model
3. The task prompt and any image attachments are sent via `session.sendAndWait()`
4. The response is saved to the task and broadcast over WebSocket
5. The session is disconnected (the client stays alive for future tasks)

## Project Structure

```
copilotdashboard/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express + WebSocket server
│   │   ├── routes/
│   │   │   ├── tasks.js           # CRUD API for tasks
│   │   │   └── settings.js        # Settings API
│   │   └── services/
│   │       ├── storage.js         # JSON file persistence
│   │       ├── copilot.js         # GitHub Copilot SDK client
│   │       └── copilotWorker.js   # Background task processor
│   └── data/                      # Runtime data (gitignored)
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── TaskBoard/         # Kanban board + columns + cards
│       │   ├── TaskModal/         # Task detail + context management
│       │   ├── Settings/          # Token + model configuration
│       │   └── common/            # Reusable Modal, Badge
│       ├── hooks/
│       │   ├── useTasks.ts        # Task state management
│       │   └── useWebSocket.ts    # Real-time WebSocket hook
│       └── api/                   # API client functions
└── package.json                   # Root scripts
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/:id` | Get a task |
| PUT | `/api/tasks/:id` | Update a task |
| PATCH | `/api/tasks/:id/status` | Change task status |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/:id/context` | Add context item (text/link/image) |
| DELETE | `/api/tasks/:id/context/:cid` | Remove context item |
| GET | `/api/settings` | Get settings |
| GET | `/api/settings/models` | List available Copilot models |
| POST | `/api/settings` | Save settings |
| GET | `/api/health` | Health check |

## Supported AI Models

The Settings page dynamically loads available models from the Copilot SDK via `client.listModels()`. Common models include:

- `gpt-4o` (default)
- `gpt-4o-mini`
- `gpt-5`
- `o1-mini`
- `o1-preview`
- `claude-sonnet-4.5`
- `claude-sonnet-4`

Available models depend on your GitHub Copilot subscription tier. The dropdown shows capability badges (vision, reasoning) for each model.

## WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `TASK_CREATED` | `{ task }` | New task created |
| `TASK_UPDATED` | `{ task }` | Task modified |
| `TASK_DELETED` | `{ taskId }` | Task deleted |
| `COPILOT_PROCESSING` | `{ taskId }` | Copilot started on task |
| `COPILOT_COMPLETED` | `{ taskId, result }` | Copilot finished |
| `COPILOT_ERROR` | `{ taskId, error }` | Copilot encountered an error |
