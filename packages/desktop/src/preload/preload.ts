import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  minimize: () => ipcRenderer.invoke("window-minimize"),
  close: () => ipcRenderer.invoke("window-close"),

  // Editor commands
  getScene: () => ipcRenderer.invoke("editor:get-scene"),
  getActor: (actorId: string) => ipcRenderer.invoke("editor:get-actor", actorId),
  sendCommand: (command: any) => ipcRenderer.send("editor:command", command),

  // Event listening
  onEditorEvent: (callback: (event: any) => void) => {
    const listener = (_: any, event: any) => callback(event);
    ipcRenderer.on("editor-event", listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("editor-event", listener);
    };
  },

  // File dialogs
  showOpenDialog: () => ipcRenderer.invoke("dialog:openFile"),
});

// TypeScript declaration for window object
declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      getScene: () => Promise<any>;
      getActor: (actorId: string) => Promise<any>;
      sendCommand: (command: any) => void;
      onEditorEvent: (callback: (event: any) => void) => () => void;
      showOpenDialog: () => Promise<string>;
    };
  }
}
