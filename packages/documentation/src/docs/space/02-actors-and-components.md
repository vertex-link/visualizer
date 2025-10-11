---
title: "Actors and Components"
description: "Learn how to use Actors and Components to build your application."
---


# Actors and Components

Actors and Components are the heart of the SPACe architecture. Understanding their relationship is key to mastering the framework.

## Actors

An `Actor` is a general-purpose object that exists in a `Scene`. Think of it as a container for Components. By themselves, Actors are blank slates; they don't have inherent properties like position or appearance. Their main purpose is to host and manage a collection of Components.

When an Actor is created, its initialization lifecycle methods (`onBeforeInitialize` and `onInitialize`) are called automatically in the constructor.

Actors can have their own logic. It is perfectly fine for an Actor to manage its Components and behavior in a compositional manner. This is useful for creating specialized Actors, for rapid prototyping, or for scenarios where it doesn't make sense to implement logic within a Component. You can add logic to an Actor by extending the `Actor` class and implementing its lifecycle methods.

Actors can also be used to manage other Actors, for example, as singletons within a Scene that orchestrate other Actors or serve as a central logic entry point.

Creating an Actor is simple:
```typescript
import { Actor } from '@vertex-link/space';
const myActor = new Actor('Player');
```

The string passed to the constructor is a `label` for debugging purposes.

### Actor API

Here are the key methods and properties of the `Actor` class:

#### Public API

-   `label: string`: A human-readable label for the actor, primarily used for debugging.
-   `id: string`: A unique identifier for the actor.
-   `constructor(label: string)`: Creates a new Actor instance and automatically runs its initialization methods.
-   `addComponent<C extends ComponentClass>(componentClass: C, ...args: ComponentConstructorParameters<C>): InstanceType<C>`: Adds a new component of the specified class to the actor. Throws an error if the component type already exists.
-   `removeComponent(componentClass: ComponentClass): boolean`: Removes a component of the specified class from the actor. Returns `true` if successfully removed, `false` otherwise.
-   `getComponent<C extends ComponentClass>(componentClass: C): InstanceType<C> | undefined`: Retrieves an instance of the specified component class from the actor, if it exists.
-   `hasComponent(componentClass: ComponentClass): boolean`: Checks if the actor has a component of the specified class.
-   `getAllComponents(): Component[]`: Returns an array of all components currently attached to the actor.
-   `getInitializedComponents(): Component[]`: Returns an array of all initialized components attached to the actor.
-   `allComponentsInitialized: boolean`: A read-only property indicating if all attached components have been initialized.
-   `destroy(): void`: Disposes of the actor and all its attached components, cleaning up resources.

#### Protected API (for subclassing)

-   `onBeforeInitialize(): void`: A lifecycle hook called automatically by the constructor just before `onInitialize`. It's the ideal place to add components within an Actor subclass.
-   `onInitialize(): void`: A lifecycle hook called automatically by the constructor. Subclasses can override this to perform custom initialization logic after components have been added.

## Components

A `Component` is a reusable, self-contained unit of data and logic that defines a specific aspect of an Actor. They are the primary building blocks of `Actor` functionality. You will typically create custom components by extending the base `Component` class. For example, you might have:

-   `TransformComponent`: Stores position, rotation, and scale data.
-   `HealthComponent`: Stores current and maximum health, and could include logic for taking damage.
-   `PlayerInputComponent`: Holds data related to player input and the logic to process it.

Components are where you should store the state of your Actors and implement their behaviors.

### Adding Components to an Actor

You can add a Component to an Actor using the `addComponent` method:
```typescript
import { TransformComponent } from '@vertex-link/engine'; // Example component
// Assuming myActor is an instance of Actor 
const transform = myActor.addComponent(TransformComponent);
transform.setPosition(10, 5, 0);

```

### Accessing Components

To retrieve a component from an actor, use the `getComponent` method:
```typescript 
const transform = myActor.getComponent(TransformComponent);
if (transform) { console.log(transform.position); }
```

### Component API

Here are the key public methods and properties of the `Component` class:

-   `id: string`: A unique identifier for the component.
-   `actor: Actor`: A read-only getter that returns the `Actor` instance this component is attached to.
-   `isInitialized: boolean`: A read-only getter that indicates if the component has been initialized.
-   `hasBeenActivated: boolean`: A read-only getter that indicates if the component has been activated (intended for use by subclasses).
-   `constructor(actor: Actor)`: Creates a new Component instance, associating it with the given Actor.
-   `dispose(): void`: Disposes of the component and cleans up any associated resources.

### Best Practices

-   **Keep Components Focused**: Each Component should do one thing well. Avoid creating large, monolithic Components.
-   **Favor Composition over Inheritance**: Instead of creating a `Player` class that inherits from a `Character` class, create an `Actor` and add `HealthComponent`, `InventoryComponent`, and `PlayerInputComponent` to it.
-   **Components are for Data**: While Components can have methods, their primary role is to hold data. Logic that operates on this data across many actors should typically reside in **Processors**.

## Components

A `Component` is a reusable, self-contained unit of data and logic that defines a specific aspect of an Actor. They are the primary building blocks of `Actor` functionality. You will typically create custom components by extending the base `Component` class. For example, you might have:

-   `TransformComponent`: Stores position, rotation, and scale data.
-   `HealthComponent`: Stores current and maximum health, and could include logic for taking damage.
-   `PlayerInputComponent`: Holds data related to player input and the logic to process it.

Components are where you should store the state of your Actors and implement their behaviors.

### Adding Components to an Actor

You can add a Component to an Actor using the `addComponent` method:
```typescript
import { TransformComponent } from '@vertex-link/engine'; // Example component
// Assuming myActor is an instance of Actor const transform = myActor.addComponent(TransformComponent);
transform.setPosition(10, 5, 0);

```

### Accessing Components

To retrieve a component from an actor, use the `getComponent` method:
```typescript 
const transform = myActor.getComponent(TransformComponent);
if (transform) { console.log(transform.position); }
```

### Component API

Here are the key public methods and properties of the `Component` class:

-   `id: string`: A unique identifier for the component.
-   `actor: Actor`: A getter that returns the `Actor` instance this component is attached to.
-   `hasBeenActivated: boolean`: A getter that indicates if the component has been activated.
-   `isInitialized: boolean`: A getter that indicates if the component has been initialized.
-   `constructor(actor: Actor)`: Creates a new Component instance, associating it with the given Actor.
-   `dispose(): void`: Disposes of the component and cleans up any associated resources.

### Best Practices

-   **Keep Components Focused**: Each Component should do one thing well. Avoid creating large, monolithic Components.
-   **Favor Composition over Inheritance**: Instead of creating a `Player` class that inherits from a `Character` class, create an `Actor` and add `HealthComponent`, `InventoryComponent`, and `PlayerInputComponent` to it.
-   **Components are for Data**: While Components can have methods, their primary role is to hold data. Logic that operates on this data should typically reside in **Processors**.