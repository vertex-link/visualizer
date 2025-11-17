import { app, ipcMain, dialog } from "electron";
import { ProjectManager } from "./ProjectManager";
import { WindowManager } from "./WindowManager";

// Enable WebGPU
app.commandLine.appendSwitch("enable-unsafe-webgpu");
app.commandLine.appendSwitch("enable-features", "Vulkan,WebGPU");

const projectManager = new ProjectManager();
const windowManager = new WindowManager();

/**
 * Initialize editor
 */
async function initializeEditor() {
  // For now, create a demo project
  const testProjectPath = app.getPath("userData") + "/test-project";

  // Check if project exists, if not create it
  try {
    await projectManager.createProject(testProjectPath, "Test Project");
  } catch (error) {
    console.log("Project already exists, opening it...");
  }

  // Open the project
  const context = await projectManager.openProject(testProjectPath, windowManager);

  // Create editor windows
  windowManager.createWindow("outliner");
  windowManager.createWindow("preview");

  console.log("🚀 Editor initialized");
}

// App lifecycle
app.whenReady().then(async () => {
  await initializeEditor();

  app.on("activate", async () => {
    if (windowManager.getWindow("outliner") === undefined) {
      await initializeEditor();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    projectManager.closeProject();
    app.quit();
  }
});

// IPC handlers for window controls
ipcMain.handle("window-minimize", (event) => {
  const win = windowManager.getWindow("outliner");
  if (win) win.minimize();
});

ipcMain.handle("window-close", (event) => {
  const win = windowManager.getWindow("outliner");
  if (win) win.close();
});

// File dialog handlers
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "GLTF Models", extensions: ["gltf", "glb"] },
      { name: "Images", extensions: ["png", "jpg", "jpeg"] },
    ],
  });

  return result.filePaths[0];
});
