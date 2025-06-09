import { Processor } from "./Processor";

/**
 * A static registry for managing Processor instances.
 * This allows decorators and other parts of the system to discover
 * and interact with named processors.
 */
export class ProcessorRegistry {
  private static processors = new Map<string, Processor>();

  /**
   * Registers a processor instance.
   * If a processor with the same name is already registered, it will be overwritten.
   * @param processor The processor instance to register.
   * @throws {Error} if the processor or its name is invalid.
   */
  public static register(processor: Processor): void {
    if (!processor || !(processor instanceof Processor)) {
      throw new Error("ProcessorRegistry: Invalid processor instance provided.");
    }
    if (!processor.name || processor.name.trim() === "") {
      // This should ideally be caught by the Processor constructor, but double-check.
      throw new Error("ProcessorRegistry: Processor name cannot be empty.");
    }

    if (this.processors.has(processor.name)) {
      console.warn(`ProcessorRegistry: Processor with name '${processor.name}' already registered. It will be overwritten.`);
    }
    this.processors.set(processor.name, processor);
  }

  /**
   * Retrieves a registered processor by its name.
   * @param name The name of the processor to retrieve.
   * @returns The processor instance if found, otherwise undefined.
   */
  public static get<T extends Processor>(name: string): T | undefined {
    const int_processor = this.processors.get(name) as T;

    if (!int_processor || !name || name.trim() === "") {
      console.warn("ProcessorRegistry: Attempted to get processor with empty name.");
      return undefined;
    }

    return int_processor;
  }

  /**
   * Unregisters a processor by its name.
   * @param name The name of the processor to unregister.
   * @returns True if a processor was found and unregistered, false otherwise.
   */
  public static unregister(name: string): boolean {
    if (!name || name.trim() === "") {
      console.warn("ProcessorRegistry: Attempted to unregister processor with empty name.");
      return false;
    }
    const success = this.processors.delete(name);
    if (success) {
      // console.debug(`ProcessorRegistry: Unregistered processor '${name}'.`);
    }
    return success;
  }

  /**
   * Retrieves all registered processors.
   * @returns An array of all registered Processor instances.
   */
  public static getAll(): Processor[] {
    return Array.from(this.processors.values());
  }

  /**
   * Clears all registered processors. Useful for testing or full system resets.
   */
  public static clearAll(): void {
    this.processors.clear();
    // console.debug("ProcessorRegistry: All processors cleared.");
  }
}
