---
title: "Actors and Components"
description: "Learn how to use Actors and Components to build your application."
---

# Actors and Components

Actors and Components are the heart of the ACS architecture. Understanding their relationship is key to mastering the framework.

## Actors

An `Actor` is a general-purpose object that exists in a `Scene`. Think of it as an empty container or a blank slate. Actors don't have any inherent properties like position or appearance. Their sole purpose is to host a collection of Components.

Creating an Actor is simple:

```typescript
import { Actor } from '@vertex-link/acs';

const myActor = new Actor('Player');
```

The string passed to the constructor is a `label` for debugging purposes.

## Components

A `Component` is a small, self-contained unit of data that defines a specific aspect of an Actor. For example, you might have:

-   `TransformComponent`: Stores position, rotation, and scale.
-   `HealthComponent`: Stores current and maximum health.
-   `PlayerInputComponent`: Holds data related to player input.

Components are where you store the state of your Actors.

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

if (transform) {
  console.log(transform.position);
}
```

### Best Practices

-   **Keep Components Focused**: Each Component should do one thing well. Avoid creating large, monolithic Components.
-   **Favor Composition over Inheritance**: Instead of creating a `Player` class that inherits from a `Character` class, create an `Actor` and add `HealthComponent`, `InventoryComponent`, and `PlayerInputComponent` to it.
-   **Components are for Data**: While Components can have methods, their primary role is to hold data. Logic that operates on this data should typically reside in **Processors**.
