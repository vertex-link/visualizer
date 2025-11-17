import { Processor, Context } from "@vertex-link/space";
import { SelectionChangedEvent } from "../events/EditorEvents";

/**
 * Manages actor selection in the editor
 */
export class SelectionProcessor extends Processor {
  private selectedActorId: string | null = null;

  constructor() {
    super("selection"); // No ticker = manual control only
  }

  /**
   * Select an actor by ID
   */
  selectActor(actorId: string | null): void {
    if (this.selectedActorId === actorId) return;

    const previousActorId = this.selectedActorId;
    this.selectedActorId = actorId;

    const eventBus = Context.current().eventBus;
    eventBus.emit(
      new SelectionChangedEvent({
        actorId,
        previousActorId,
      }),
    );
  }

  /**
   * Get currently selected actor ID
   */
  getSelection(): string | null {
    return this.selectedActorId;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectActor(null);
  }
}
