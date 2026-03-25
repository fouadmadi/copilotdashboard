# Copilot Dashboard

A local Azure ADO-style task board that uses GitHub Copilot to automatically process tasks. Create tasks with rich context (text, images, links), move them to **Active**, and GitHub Copilot will process them and post results back — all running on your local machine.

## Features

- **ADO-like Kanban Board** — Three columns: New → Active → Done with drag-and-drop
- **Rich Task Context** — Attach text notes, URLs, and images to any task
- **GitHub Copilot Integration** — Tasks in the Active column are automatically sent to GitHub Copilot for processing
- **Real-time Updates** — WebSocket connection keeps the board in sync as Copilot completes tasks
- **Local Storage** — All data stored in JSON files on your machine — no external database needed
- **Settings Page** — Configure your GitHub token and preferred AI model

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- A GitHub account with access to [GitHub Models](https://github.com/marketplace/models) (free tier available)

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

### 4. Configure your GitHub token

1. Go to **Settings** in the app (⚙️ in the sidebar)
2. Paste your GitHub Personal Access Token
3. Select your preferred AI model
4. Click **Save Settings**

To create a token: [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
The token needs no special scopes — just your GitHub identity for GitHub Models access.

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
4. **Copilot Processes** — The backend picks up the active task within 5 seconds, sends all its context to GitHub Copilot, and waits for a response
5. **Done** — The task automatically moves to **Done** with Copilot's response visible in the task detail

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
│   │       ├── copilot.js         # GitHub Models API client
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
| POST | `/api/settings` | Save settings |
| GET | `/api/health` | Health check |

## Supported AI Models

- `gpt-4o` (default)
- `gpt-4o-mini`
- `gpt-4-turbo`
- `o1-mini`
- `o1-preview`
- `claude-3-5-sonnet`
- `mistral-large`

## WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `TASK_CREATED` | `{ task }` | New task created |
| `TASK_UPDATED` | `{ task }` | Task modified |
| `TASK_DELETED` | `{ taskId }` | Task deleted |
| `COPILOT_PROCESSING` | `{ taskId }` | Copilot started on task |
| `COPILOT_COMPLETED` | `{ taskId, result }` | Copilot finished |
| `COPILOT_ERROR` | `{ taskId, error }` | Copilot encountered an error |
