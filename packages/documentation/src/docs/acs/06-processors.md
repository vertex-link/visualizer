---
title: "Processors"
description: "Implement your application logic using Processors."
---

# Processors

Processors are where the logic of your application lives. They are systems that run continuously and operate on Actors and their Components.

If Components are the *data* (the nouns), then Processors are the *logic* (the verbs). For example, a `PhysicsProcessor` would be responsible for updating the position of all Actors that have a `PhysicsComponent` and a `TransformComponent`.

## The Role of a Processor

A Processor typically performs the following steps every frame or tick:

1.  **Query** the `Scene` for a set of Actors that have the Components it cares about.
2.  **Iterate** over the resulting Actors.
3.  **Read** data from their Components.
4.  **Perform** some logic.
5.  **Write** new data back to the Components.

## Creating a Processor

You create a processor by extending the base `Processor` class. You must implement the `start()` and `stop()` methods to control the processor's update loop.

Here is a simplified example of a processor that rotates objects.

```typescript
import { Processor, Scene, QueryBuilder } from '@vertex-link/acs';
import { TransformComponent, RotatingComponent } from './components'; // Example components

class RotationProcessor extends Processor {
  private scene: Scene;
  private query: QueryBuilder;
  private animationFrameId: number | null = null;

  constructor(scene: Scene) {
    super('RotationProcessor');
    this.scene = scene;
    this.query = this.scene.query().withComponent(TransformComponent, RotatingComponent);
  }

  start() {
    if (this.isRunning) return;
    this._isRunning = true;
    const tick = (time: number) => {
      this.executeTasks(time / 1000); // Convert to seconds
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  stop() {
    if (!this.isRunning || this.animationFrameId === null) return;
    this._isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  protected executeTasks(deltaTime: number): void {
    const actors = this.query.execute();
    for (const actor of actors) {
      const transform = actor.getComponent(TransformComponent)!;
      const rotation = actor.getComponent(RotatingComponent)!;
      
      transform.rotate(0, rotation.speed * deltaTime, 0);
    }
  }
}
```

## The Processor Registry

The framework includes a `ProcessorRegistry` to manage all your processors. This allows you to start and stop all processors at once, which is useful for pausing or resetting your application.

## Best Practices

-   **Separation of Concerns**: Each Processor should have a single responsibility (e.g., handle physics, handle rendering, handle input).
-   **Stateless Logic**: Ideally, Processors should be stateless. All the state they need should be read from Components.
-   **Performance**: Be mindful of the work you do inside a Processor's update loop, as it will run every frame. Cache queries and avoid unnecessary allocations.
