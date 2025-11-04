---
title: "Scenes"
description: "Understand how Scenes manage Actors and enable querying."
---

# Scenes

A `Scene` is a container for `Actors`. It represents a world, a level, or any logical grouping of objects in your application. The Scene is the central hub for managing the lifecycle of Actors and for finding them.

## Creating a Scene

Creating a new Scene is straightforward. The constructor can take an optional name and an optional shared `IEventBus`.

```typescript
import { Scene } from '@vertex-link/space';

// Create a scene with a specific name
const myScene = new Scene('Level 1');

// Create a scene with a default name ("Scene")
const anotherScene = new Scene();
```

## Managing Actors

Once you have a Scene, you can add and remove Actors from it.

```typescript
const player = new Actor('Player');
myScene.addActor(player);

// Sometime later...
myScene.removeActor(player);
```

When an Actor is added to a Scene, it becomes part of the Scene's managed collection, allowing it to be discovered through queries.

## Querying the Scene

The true power of the Scene lies in its ability to efficiently query for Actors. This is the foundation of how systems (Processors) find the data they need to operate on. You start a query from a `Scene` instance:

```typescript
const query = myScene.query();
```

This gives you a `SceneQueryBuilder` instance, which you can use to build up your query conditions.

### Filtering by Component

The most common way to query is by an Actor's Components. The `withComponent` method allows you to find actors that have one or more specific components.

```typescript
import { TransformComponent, PhysicsComponent } from '@vertex-link/engine';

// Find all actors with a TransformComponent
const actorsWithTransform = myScene.query()
  .withComponent(TransformComponent)
  .execute();

// Find all actors that have BOTH a TransformComponent AND a PhysicsComponent
const physicsActors = myScene.query()
  .withComponent(TransformComponent, PhysicsComponent)
  .execute();
```

### Advanced Querying

The `QueryBuilder` offers more than just component filtering. You can chain methods to create more specific queries:

-   **Filter by Tags**: Use `.withTag('Player')` or `.withoutTag('EditorOnly')` to filter by tags.
-   **Limit Results**: Use `.limit(10)` to get only the first 10 results.
-   **Sort Results**: Use `.orderBy((a, b) => a.id.localeCompare(b.id))` to sort the results.

```typescript
// Find the first 10 actors tagged 'Enemy' that are not 'Stunned'
const activeEnemies = myScene.query()
  .withTag('Enemy')
  .withoutTag('Stunned')
  .limit(10)
  .execute();
```

### Executing the Query

Once you have specified your conditions, call the `execute()` method to run the query and get an array of matching `Actors`.

The query system is highly optimized. The `Scene` maintains internal indices of components and tags, so finding matching actors is very fast.

### Best Practices

-   **Be Specific**: The more specific your query, the faster it will be. Filtering by components is the most efficient way to narrow down your search.
-   **Reuse Queries**: If you run the same query every frame (e.g., in a Processor), create the `QueryBuilder` once and reuse it to avoid re-allocating memory.

## Multiple Scenes

You can create multiple `Scene` instances in your application. However, the current Engine/WebGPUProcessor handles a single active Scene at a time via `engineContext.setScene(scene)`. You can still:

- Prepare/load another Scene in the background (off the active renderer).
- Use separate Scenes for UI vs. world and swap which one is active.
- Perform additive loading by merging or swapping Scenes explicitly.

Support for concurrently rendering multiple Scenes is not implemented in the default WebGPU processor yet.
