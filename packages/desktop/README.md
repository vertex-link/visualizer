# @vertex-link/desktop

This package contains an experimental desktop editor for the Vertex Link engine, built with [Electron](https://www.electronjs.org/), [Vite](https://vitejs.dev/), and [Vue](https://vuejs.org/).

> ⚠️ **Warning:** This package is in the very early stages of development. Most of the features described in the internal documentation are planned, not yet implemented.

## Development

This project uses `electron-vite` for a streamlined development experience.

### Prerequisites

- [Bun](https://bun.sh/)

### Running the Application

1. **Install dependencies** from the root of the monorepo:
   ```bash
   bun install
   ```

2. **Start the development server**:
   This command will launch the Electron app and the Vite dev server with hot-reloading for the renderer process.
   ```bash
   bun run dev
   ```

## Building

To build the application for production, use:
```bash
bun run build
```

To package the application for your platform, use:
```bash
bun run package
```