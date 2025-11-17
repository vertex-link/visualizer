import type { IProcessable, Processor } from "../processor/Processor";
import { Context } from "./context";

export type UpdateTask = (deltaTime: number) => void;

/**
 * Registers an update function as a task on a processor.
 * Works with the new Context API - call within Context.runWith() scope.
 * Returns a disposer function to remove the task.
 *
 * @param processorClass - The processor class to get from context (e.g., WebGPUProcessor)
 * @param fn - The update function to call each frame
 * @param taskContext - The 'this' context for the update function
 * @param id - Optional task ID (auto-generated if not provided)
 */
export function useUpdate<T extends Processor>(
  processorClass: new (...args: any[]) => T,
  fn: UpdateTask,
  taskContext: any,
  id?: string | symbol,
): () => void {
  const context = Context.current();
  const processor = context.processors.find(p => p instanceof processorClass) as T | undefined;

  if (!processor) {
    throw new Error(
      `useUpdate: Processor '${processorClass.name}' not found in context.`,
    );
  }

  const taskId = id ?? Symbol(`task_${processorClass.name}`);
  const task: IProcessable = {
    id: taskId,
    update: fn,
    context: taskContext,
  };

  processor.addTask(task);
  return () => processor!.removeTask(taskId);
}
