export type ServiceKey = symbol;

export interface IService {
  initialize?(): Promise<void> | void;
  update?(deltaTime: number): void;
  dispose?(): Promise<void> | void;
}

/**
 * A minimal Service Registry implementation.
 * It allows registering and resolving services using unique ServiceKey symbols.
 */
export class ServiceRegistry {
  private services: Map<ServiceKey, IService>;

  constructor() {
    this.services = new Map<ServiceKey, IService>();
    // console.debug("ServiceRegistry initialized.");
  }

  /**
   * Registers a service instance with a unique key.
   * If a service with the same key is already registered, it will be overwritten.
   * Consider adding a check or warning if overwriting is not desired.
   *
   * @param key - The unique ServiceKey for this service.
   * @param instance - The instance of the service to register.
   * @throws {Error} if the key or instance is null/undefined.
   */
  public register<T extends IService>(key: ServiceKey, instance: T): void {
    if (!key) {
      throw new Error("Service key cannot be null or undefined.");
    }
    if (!instance) {
      throw new Error(`Service instance for key "${String(key)}" cannot be null or undefined.`);
    }
    // console.debug(`Registering service with key: ${String(key)}`, instance);
    this.services.set(key, instance);
  }

  /**
   * Resolves (retrieves) a service instance by its key.
   *
   * @param key - The ServiceKey of the service to resolve.
   * @returns The service instance if found, otherwise undefined.
   *          The caller should typically cast the result to the expected service interface.
   *          Example: const myService = registry.resolve<IMyService>(IMyServiceKey);
   * @template T - The expected type of the service.
   */
  public resolve<T extends IService>(key: ServiceKey): T | undefined {
    if (!key) {
      console.warn("Attempted to resolve service with a null or undefined key.");
      return undefined;
    }
    const instance = this.services.get(key) as T | undefined;

    if (instance) {
      // console.debug(`Service resolved for key: ${String(key)}`);
    } else {
      console.warn(`Service not found for key: ${String(key)}`);
    }

    return instance;
  }

  /**
   * Checks if a service is registered for the given key.
   *
   * @param key - The ServiceKey to check.
   * @returns True if a service is registered with this key, false otherwise.
   */
  public isRegistered(key: ServiceKey): boolean {
    if (!key) {
      return false;
    }
    return this.services.has(key);
  }

  /**
   * Unregisters a service by its key.
   * This is useful for cleanup or replacing services.
   *
   * @param key - The ServiceKey of the service to unregister.
   * @returns True if a service was found and unregistered, false otherwise.
   */
  public unregister(key: ServiceKey): boolean {
    if (!key) {
      console.warn("Attempted to unregister service with a null or undefined key.");
      return false;
    }

    return this.services.delete(key);
  }

  /**
   * Clears all registered services.
   * Useful for resetting the registry, e.g., in tests or between application states.
   */
  public clear(): void {
    this.services.clear();
    // console.debug("All services cleared from ServiceRegistry.");
  }
}
