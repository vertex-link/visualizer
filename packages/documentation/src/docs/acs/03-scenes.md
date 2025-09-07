---
title: "Scenes"
description: "Understand how Scenes manage Actors and enable querying."
---

# Scenes

A `Scene` is a container for `Actors`. It represents a world, a level, or any logical grouping of objects in your application. The Scene is the central hub for managing the lifecycle of Actors and for finding them.

## Creating a Scene

Creating a new Scene is straightforward:

```typescript
import { Scene } from '@vertex-link/acs';

const myScene = new Scene('Level 1');
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

The true power of the Scene lies in its ability to efficiently query for Actors based on the Components they possess. This is the foundation of how systems (Processors) find the data they need to operate on.

To create a query, you use the `query()` method, which returns a `QueryBuilder`:

```typescript
import { Scene } from '@vertex-link/acs';
import { TransformComponent, MeshRendererComponent } from '@vertex-link/engine';

// Find all actors that have both a TransformComponent and a MeshRendererComponent
const renderableActors = myScene
  .query()
  .withComponent(TransformComponent)
  .withComponent(MeshRendererComponent)
  .execute();

for (const actor of renderableActors) {
  // Do something with the actor...
}
```

This querying mechanism is highly optimized and is the preferred way to access collections of Actors.

## Multiple Scenes

You can create multiple `Scene` instances in your application. However, the current EngineContext/WebGPUProcessor handles a single active Scene at a time via `engineContext.setScene(scene)`. You can still:

- Prepare/load another Scene in the background (off the active renderer).
- Use separate Scenes for UI vs. world and swap which one is active.
- Perform additive loading by merging or swapping Scenes explicitly.

Support for concurrently rendering multiple Scenes is not implemented in the default WebGPU processor yet.
