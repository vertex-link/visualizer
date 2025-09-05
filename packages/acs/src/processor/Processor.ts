/**
 * Defines the signature for a callback function that a Processor executes.
 * @param deltaTime - The time elapsed since the last tick, typically in seconds.
 * @param args - Optional additional arguments.
 */
export type ProcessorTickCallback = (deltaTime: number, ...args: any[]) => void;

/**
 * Represents a unit of work to be executed by a Processor.
 * It includes the function to call, its 'this' context, and a unique ID.
 */
export interface IProcessable {
  /**
   * A unique identifier for the processable unit (e.g., actorId:methodName or componentId:methodName).
   * This is crucial for reliably adding and removing tasks.
   */
  id: string | symbol;
  /**
   * The function to be executed on each tick of the processor.
   */
  update: ProcessorTickCallback;
  /**
   * The 'this' context in which the update function should be called.
   * This ensures that 'this' inside the decorated method refers to the
   * Actor or Component instance.
   */
  context?: any;
}

/**
 * Abstract base class for all Processors.
 * A Processor manages a loop and executes a collection of tasks (IProcessable)
 * on each iteration of its loop.
 */
export abstract class Processor {
  public readonly name: string;
  protected tasks: Map<string | symbol, IProcessable> = new Map();
  protected _isRunning = false;

  /**
   * @param name A unique name for this processor (e.g., "render", "physics").
   */
  constructor(name: string) {
    if (!name || name.trim() === "") {
      throw new Error("Processor name cannot be empty.");
    }
    this.name = name;
  }

  /**
   * Adds a task to this processor. If a task with the same ID already exists,
   * it will be overwritten.
   * @param processable The processable unit to add.
   */
  public addTask(processable: IProcessable): void {
    if (
      !processable ||
      typeof processable.id === "undefined" ||
      typeof processable.update !== "function"
    ) {
      console.error(`Processor '${this.name}': Attempted to add invalid processable.`, processable);
      return;
    }
    if (this.tasks.has(processable.id)) {
      console.warn(
        `Processor '${this.name}': Task with id '${String(processable.id)}' already exists. Overwriting.`,
      );
    }
    this.tasks.set(processable.id, processable);
  }

  /**
   * Removes a task from this processor using its ID.
   * @param taskId The id of the processable unit to remove.
   * @returns True if a task was found and removed, false otherwise.
   */
  public removeTask(taskId: string | symbol): boolean {
    if (typeof taskId === "undefined") {
      console.warn(`Processor '${this.name}': Attempted to remove task with undefined ID.`);
      return false;
    }
    return this.tasks.delete(taskId);
  }

  /**
   * Starts the processor's loop.
   * Concrete implementations must define the specific loop mechanism
   * (e.g., requestAnimationFrame, setInterval).
   */
  public abstract start(): void;

  /**
   * Stops the processor's loop.
   * Concrete implementations must handle cleanup of their loop mechanism.
   */
  public abstract stop(): void;

  /**
   * Executes all registered tasks. This method is typically called internally
   * by the loop mechanism implemented in `start()`.
   * @param deltaTime Time elapsed since the last tick, in seconds.
   * @param args Additional arguments to pass to each task's update function.
   */
  protected executeTasks(deltaTime: number, ...args: any[]): void {
    // Iterate over a copy of values in case a task modifies the tasks map during execution
    const tasksToExecute = Array.from(this.tasks.values());
    for (const task of tasksToExecute) {
      // Double-check if the task still exists, as it might have been removed by another task
      if (this.tasks.has(task.id)) {
        try {
          task.update.call(task.context, deltaTime, ...args);
        } catch (error) {
          console.error(`Error in processor '${this.name}' task (id: ${String(task.id)}):`, error);
          // Optionally, you might want to remove the faulty task to prevent further errors:
          // this.removeTask(task.id);
        }
      }
    }
  }

  /**
   * Checks if the processor is currently running.
   * @returns True if the processor is running, false otherwise.
   */
  public get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Gets the number of tasks currently registered with this processor.
   * @returns The number of tasks.
   */
  public get taskCount(): number {
    return this.tasks.size;
  }
}
