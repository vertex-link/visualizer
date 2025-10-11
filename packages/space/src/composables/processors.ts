import type { IProcessable, Processor } from "../processor/Processor";
import { useProcessor } from "./context";

export type UpdateTask = (deltaTime: number) => void;

/**
 * Registers an update function as a task on a named processor from the current context.
 * Returns a disposer function to remove the task.
 */
export function useUpdate(
  processorName: string,
  fn: UpdateTask,
  context: any,
  id?: string | symbol,
): () => void {
  const processor = useProcessor<Processor>(processorName);

  if (!processor) {
    throw new Error(
      `useUpdate: Processor '${processorName}' not found in context.`,
    );
  }

  const taskId = id ?? Symbol(`task_${processorName}`);
  const task: IProcessable = {
    id: taskId,
    update: fn,
    context: context,
  };

  processor.addTask(task);
  return () => processor!.removeTask(taskId);
}
