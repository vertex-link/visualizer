import { Processor, Context, EntityCreatedEvent, EntityDestroyedEvent, Actor } from "@vertex-link/space";
import { ipcMain } from "electron";
import type { WindowManager } from "../WindowManager";
import {
  SelectionChangedEvent,
  ResourceRegisteredEvent,
  PropertyChangeRequestedEvent,
} from "../events/EditorEvents";
import { SelectionProcessor } from "./SelectionProcessor";

/**
 * Bridges SPACe EventBus with Electron IPC
 */
export class IPCBridgeProcessor extends Processor {
  constructor(private windowManager: WindowManager) {
    super("ipc-bridge");
  }

  async initialize(): Promise<void> {
    this.setupEventForwarding();
    this.setupCommandHandlers();
  }

  /**
   * Forward editor events to all renderer processes
   */
  private setupEventForwarding(): void {
    const eventBus = Context.current().eventBus;

    // Forward entity events
    eventBus.on(EntityCreatedEvent, (event) => {
      this.windowManager.broadcast("editor-event", {
        type: event.type,
        payload: {
          entity: this.serializeActor(event.payload.entity),
        },
      });
    }, this);

    eventBus.on(EntityDestroyedEvent, (event) => {
      this.windowManager.broadcast("editor-event", {
        type: event.type,
        payload: {
          entity: { id: event.payload.entity.id },
        },
      });
    }, this);

    // Forward selection events
    eventBus.on(SelectionChangedEvent, (event) => {
      this.windowManager.broadcast("editor-event", {
        type: event.type,
        payload: event.payload,
      });
    }, this);

    // Forward resource events
    eventBus.on(ResourceRegisteredEvent, (event) => {
      this.windowManager.broadcast("editor-event", {
        type: event.type,
        payload: event.payload,
      });
    }, this);
  }

  /**
   * Handle commands from renderer processes
   */
  private setupCommandHandlers(): void {
    // Get scene snapshot
    ipcMain.handle("editor:get-scene", () => {
      const scene = Context.current().scene;
      return this.serializeScene(scene);
    });

    // Get actor by ID
    ipcMain.handle("editor:get-actor", (_, actorId: string) => {
      const scene = Context.current().scene;
      const actor = scene.getActor(actorId);
      return actor ? this.serializeActor(actor) : null;
    });

    // Handle commands
    ipcMain.on("editor:command", (_, command) => {
      this.handleCommand(command);
    });
  }

  /**
   * Handle incoming commands from UI
   */
  private handleCommand(command: any): void {
    const context = Context.current();

    try {
      switch (command.type) {
        case "actor/create":
          const actor = new Actor(command.label || "New Actor");
          context.scene.addActor(actor);
          break;

        case "actor/delete":
          const actorToDelete = context.scene.getActor(command.actorId);
          if (actorToDelete) {
            context.scene.removeActor(actorToDelete);
          }
          break;

        case "selection/set":
          const selectionProcessor = context.processors.find(
            (p) => p instanceof SelectionProcessor,
          ) as SelectionProcessor | undefined;
          selectionProcessor?.selectActor(command.actorId);
          break;

        case "property/change":
          context.eventBus.emit(
            new PropertyChangeRequestedEvent({
              actorId: command.actorId,
              componentType: command.componentType,
              property: command.property,
              value: command.value,
            }),
          );
          break;

        default:
          console.warn(`Unknown command type: ${command.type}`);
      }
    } catch (error) {
      console.error("Error handling command:", command, error);
    }
  }

  /**
   * Serialize actor for transmission
   */
  private serializeActor(actor: Actor): any {
    return {
      id: actor.id,
      label: actor.label,
      components: actor.getAllComponents().map((c) => ({
        id: c.id,
        type: c.constructor.name,
        // Basic serialization - will expand later
      })),
    };
  }

  /**
   * Serialize scene for transmission
   */
  private serializeScene(scene: any): any {
    const actors = Array.from(scene["actors"] as Set<Actor>);
    return {
      name: scene.name,
      actors: actors.map((a) => this.serializeActor(a)),
    };
  }
}
