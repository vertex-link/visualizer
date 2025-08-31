import { useProcessor } from '../../../../src/composables/context';
import type { IProcessable, Processor } from '../processor/Processor';
import { ProcessorRegistry } from '../processor/ProcessorRegistry';

export type UpdateTask = (deltaTime: number) => void;

/**
 * Registers an update function as a task on a named processor from the current context.
 * Falls back to global ProcessorRegistry if no active context.
 * Returns a disposer function to remove the task.
 */
export function useUpdate(
  processorName: string,
  fn: UpdateTask,
  context: any,
  id?: string | symbol
): () => void {
  let processor: Processor | undefined;

  try {
    processor = useProcessor<Processor>(processorName);
  } catch {
    // No active context; fallback to registry for now (to be removed later)
    processor = ProcessorRegistry.get(processorName);
  }

  if (!processor) {
    throw new Error(`useUpdate: Processor '${processorName}' not found in context or registry.`);
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
