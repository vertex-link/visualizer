import "./../../../node_modules/reflect-metadata/Reflect.js"

/**
 * Metadata key used to store information about methods hooked into processors.
 * Using a Symbol ensures uniqueness and avoids potential key collisions.
 */
export const HOOKED_METHODS_METADATA_KEY = Symbol("hookedMethods");

/**
 * Interface for storing metadata about a method decorated for a processor update.
 */
export interface HookedMethodMetadata {
    processorName: string;    // The name of the processor to hook into.
    propertyKey: string | symbol; // The name of the decorated method.
    // Future: priority?: number;
}

/**
 * Creates a decorator for hooking a method into a specific Processor's update loop.
 * This version is adapted for the TC39 standard decorator signature.
 *
 * @param processorName The name of the Processor (e.g., "render", "physics")
 * that this decorator will target. This name MUST match the
 * name used when the Processor instance is registered with
 * the ProcessorRegistry.
 * @param decoratorDisplayName A descriptive name for the decorator, primarily used
 * for generating clear error messages.
 * @returns A Typescript Method Decorator.
 */
export function createProcessorUpdateDecorator(processorName: string, decoratorDisplayName: string) {
    return function (
        originalMethod: any, // The original method being decorated
        context: ClassMethodDecoratorContext // Context object provided by TC39 decorators
    ) {
        const { kind, name: propertyKey, static: isStatic, private: isPrivate } = context;

        if (kind !== "method") {
            // This error should ideally not be hit if TypeScript enforces decorator placement,
            // but it's a good safeguard.
            throw new Error(`@${decoratorDisplayName} decorator can only be applied to methods. Attempted to apply to ${String(propertyKey)} of kind ${kind}.`);
        }

        // `context.addInitializer` runs after the class has been fully defined.
        // 'this' inside the initializer refers to:
        // - The class instance, if the decorated method is an instance method.
        // - The class constructor, if the decorated method is a static method.
        context.addInitializer(function () {
            // `this` refers to the class instance for instance methods, or the class constructor for static methods.
            // We need to get the prototype of the class to attach metadata,
            // as the existing registration logic in Actor/Component expects it there.
            let targetPrototype: any;

            if (isStatic) {
                // For static methods, 'this' is the constructor.
                // Metadata is attached to the constructor's prototype for consistency,
                // though one might also attach to the constructor itself depending on the pattern.
                targetPrototype = (this as any).prototype;
            } else {
                // For instance methods, 'this' is an instance of the class.
                targetPrototype = (this as any).constructor.prototype;
            }

            if (!targetPrototype) {
                console.error(`@${decoratorDisplayName}: Could not determine target prototype for method '${String(propertyKey)}' on class.`);
                return;
            }

            const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, targetPrototype) || [];

            const alreadyHooked = hookedMethods.some(
                hook => hook.processorName === processorName && hook.propertyKey === propertyKey
            );

            if (!alreadyHooked) {
                hookedMethods.push({ processorName, propertyKey }); // context.name is string | symbol
                Reflect.defineMetadata(HOOKED_METHODS_METADATA_KEY, hookedMethods, targetPrototype);
            } else {
                // This warning might appear if the class definition is processed multiple times in some complex scenarios.
                // console.warn(`@${decoratorDisplayName} decorator: Method '${String(propertyKey)}' on target prototype is already hooked to processor '${processorName}'. Skipping duplicate metadata entry.`);
            }
        });

        // For TC39 decorators, if you don't want to replace the method, you don't return anything (or return void).
        // If you want to replace or wrap the method, you return a new function.
        // In this case, we are only attaching metadata, so we don't modify the originalMethod.
        // Therefore, we can implicitly return void or explicitly return originalMethod if preferred,
        // though returning void is common when not replacing the method.
    };
}

/**
 * Generic decorator to hook a method into any named Processor's update loop.
 * This provides flexibility if you don't want to create a specific decorator for every processor
 * or if the processor name is determined dynamically.
 *
 * @param processorName The name of the Processor (e.g., "ai", "network")
 * to which this method should be registered.
 */
export function Update(processorName: string) {
    if (!processorName || processorName.trim() === "") {
        throw new Error("@Update decorator requires a valid processorName.");
    }
    // Using `Update(${processorName})` as the display name for clarity in errors.
    return createProcessorUpdateDecorator(processorName, `Update(${processorName})`);
}
