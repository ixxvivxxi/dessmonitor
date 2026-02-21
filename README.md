# Dessmonitor

Dashboard for monitoring DESS devices (grid, solar, battery, load) via [dessmonitor.com](https://dessmonitor.com).

## Stack

- **app** — React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4
- **server** — NestJS

## Structure

```
app/     — frontend (React + Vite)
server/  — NestJS backend
```

## Setup

```bash
npm install
```

1. Start the server: `npm run dev:server`
2. Start the app: `npm run dev:app`
3. Open the app, paste your dessmonitor URL (from DevTools) to save credentials

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Run frontend and backend together |
| `npm run dev` / `npm run dev:app` | Frontend dev server |
| `npm run dev:server` | NestJS in watch mode |
| `npm run build` | Build frontend |
| `npm run build:server` | Build server |
| `npm run lint` | Lint all workspaces |

## License

Private.
