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
 * Works for both Component and Actor classes
 */
export function RequireComponent<T extends Component>(
    componentClass: ComponentClass<T>
) {
  return function(target: any, context: ClassFieldDecoratorContext) {
    const propertyKey = context.name;

    console.log(`[DEBUG] RequireComponent decorator called for ${context.name.toString()} with ${componentClass.name}`);

    // Set up the getter immediately during instance creation
    context.addInitializer(function(this: any) {
      console.log(`[DEBUG] addInitializer running for ${String(propertyKey)} - setting up getter immediately`);

      // Store metadata on the constructor - this happens during instance creation
      const constructor = this.constructor;

      if (!constructor._componentDependencies) {
        constructor._componentDependencies = [];
      }

      const exists = constructor._componentDependencies.some((dep: any) =>
          dep.propertyKey === propertyKey && dep.componentClass === componentClass
      );

      if (!exists) {
        constructor._componentDependencies.push({
          componentClass,
          propertyKey,
          optional: false
        });

        console.log(`[DEBUG] Added required dependency ${componentClass.name} to ${constructor.name}.${String(propertyKey)}`);
      }

      // Set up the getter right now
      Object.defineProperty(this, propertyKey, {
        get: () => {
          if (this instanceof Component) {
            // For components, get from actor
            const component = this._actor?.getComponent(componentClass);
            console.log(`[COMPONENT_DEPENDENCY_DEBUG] Accessing ${String(propertyKey)}:`, {
              componentExists: !!component,
              componentName: component?.constructor?.name,
              componentId: component?.id,
              actorId: this._actor?.id
            });
            return component;
          } else {
            // For actors, get directly
            const component = this.getComponent?.(componentClass);
            console.log(`[ACTOR_DEPENDENCY_DEBUG] Accessing ${String(propertyKey)}:`, {
              componentExists: !!component,
              componentName: component?.constructor?.name,
              componentId: component?.id,
              actorId: this.id
            });
            return component;
          }
        },
        set: (value) => {
          console.log(`[DEBUG] Manually setting dependency ${String(propertyKey)}:`, value);
        },
        enumerable: true,
        configurable: true
      });

      console.log(`[DEBUG] Dependency getter for ${String(propertyKey)} set up successfully`);
    });

    // Return undefined to let the class handle the property
    return undefined;
  };
}

/**
 * Decorator for optional component dependencies
 */
export function OptionalComponent<T extends Component>(
    componentClass: ComponentClass<T>
) {
  return function(target: any, context: ClassFieldDecoratorContext) {
    const propertyKey = context.name;

    console.log(`[DEBUG] OptionalComponent decorator called for ${context.name.toString()} with ${componentClass.name}`);

    context.addInitializer(function(this: any) {
      console.log(`[DEBUG] addInitializer running for optional ${String(propertyKey)} - setting up getter immediately`);

      // Store metadata on the constructor - this happens during instance creation
      const constructor = this.constructor;

      if (!constructor._componentDependencies) {
        constructor._componentDependencies = [];
      }

      const exists = constructor._componentDependencies.some((dep: any) =>
          dep.propertyKey === propertyKey && dep.componentClass === componentClass
      );

      if (!exists) {
        constructor._componentDependencies.push({
          componentClass,
          propertyKey,
          optional: true
        });

        console.log(`[DEBUG] Added optional dependency ${componentClass.name} to ${constructor.name}.${String(propertyKey)}`);
      }

      // Set up the getter right now
      Object.defineProperty(this, propertyKey, {
        get: () => {
          if (this instanceof Component) {
            // For components, get from actor
            const component = this._actor?.getComponent(componentClass);
            console.log(`[COMPONENT_DEPENDENCY_DEBUG] Accessing optional ${String(propertyKey)}:`, {
              componentExists: !!component,
              componentName: component?.constructor?.name,
              componentId: component?.id,
              actorId: this._actor?.id
            });
            return component;
          } else {
            // For actors, get directly
            const component = this.getComponent?.(componentClass);
            console.log(`[ACTOR_DEPENDENCY_DEBUG] Accessing optional ${String(propertyKey)}:`, {
              componentExists: !!component,
              componentName: component?.constructor?.name,
              componentId: component?.id,
              actorId: this.id
            });
            return component;
          }
        },
        set: (value) => {
          console.log(`[DEBUG] Manually setting optional dependency ${String(propertyKey)}:`, value);
        },
        enumerable: true,
        configurable: true
      });

      console.log(`[DEBUG] Optional dependency getter for ${String(propertyKey)} set up successfully`);
    });

    return undefined;
  };
}

// Export metadata keys for use in Component base class
export { COMPONENT_DEPENDENCIES_KEY, type ComponentDependencyMetadata };