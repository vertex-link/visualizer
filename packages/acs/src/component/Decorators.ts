import "reflect-metadata"
import Component, { ComponentClass } from './Component';

const COMPONENT_DEPENDENCIES_KEY = Symbol('componentDependencies');

interface ComponentDependencyMetadata<T extends Component = Component> {
  componentClass: ComponentClass<T>;
  propertyKey: string | symbol;
  optional?: boolean;
}
/**
 * Decorator for required component dependencies
 * The component must be present or an error will be thrown
 */
export function RequireComponent<T extends Component>(
  componentClass: ComponentClass<T>
) {
  return function(_: unknown, context: ClassFieldDecoratorContext) {
    const propertyKey = context.name;

    // Log for debugging
    console.log(`[DEBUG] RequireComponent decorator called for ${context.name.toString()} with ${componentClass.name}`);

    // Store the dependency information directly on the class constructor
    context.addInitializer(function(this: any) {
      // Get the component's constructor
      const constructor = this.constructor;

      // Ensure we have a metadata container
      if (!constructor._componentDependencies) {
        constructor._componentDependencies = [];
      }

      // Add this dependency to the list
      constructor._componentDependencies.push({
        componentClass,
        propertyKey,
        optional: false
      });

      console.log(`[DEBUG] Added required dependency ${componentClass.name} to ${constructor.name}.${String(propertyKey)}`);
    });
  };
}
/**
 * Decorator for optional component dependencies
 * The component may or may not be present
 */
export function OptionalComponent<T extends Component>(
  componentClass: ComponentClass<T>
) {
  return function(_target: Object, context: ClassFieldDecoratorContext) {
    const propertyKey = context.name;

    // We'll use the static initializer callback to attach metadata
    // at the class definition time rather than instance creation time
    context.addInitializer(function(this: any) {
      // 'this' refers to the instance
      const prototype = Object.getPrototypeOf(this);

      // Get existing dependencies or create a new array
      let dependencies: ComponentDependencyMetadata[] =
        Reflect.getOwnMetadata(COMPONENT_DEPENDENCIES_KEY, prototype) || [];

      // Check if dependency already exists
      const exists = dependencies.some(dep =>
        dep.propertyKey === propertyKey &&
        dep.componentClass === componentClass);

      if (!exists) {
        // Create a new array to avoid mutation issues
        dependencies = [...dependencies, {
          componentClass,
          propertyKey,
          optional: true
        }];

        // Define the metadata on the prototype
        Reflect.defineMetadata(COMPONENT_DEPENDENCIES_KEY, dependencies, prototype);

        console.log(`Registered optional dependency ${componentClass.name} for ${prototype.constructor.name}.${String(propertyKey)}`);
      }
    });
  };
}

// Export metadata keys for use in Component base class
export { COMPONENT_DEPENDENCIES_KEY, type ComponentDependencyMetadata };
