---
title: "Processors"
description: "Implement your application logic using Processors."
---

# Processors

Processors are where the logic of your application lives. They are systems that run continuously and operate on Actors and their Components.

If Components are the data (the nouns), then Processors are the logic (the verbs). For example, a `PhysicsProcessor` would be responsible for updating the position of all Actors that have a `PhysicsComponent` and a `TransformComponent`.

## The Role of a Processor

A Processor typically performs the following steps every frame or tick:

1.  Query the `Scene` for a set of Actors that have the Components it cares about.
2.  Iterate over the resulting Actors.
3.  Read data from their Components.
4.  Perform some logic.
5.  Write new data back to the Components.

## Creating a Processor

You create a processor by extending the base `Processor` class. Processors use a ticker-based execution model: you provide a ticker function that drives when the processor's tasks are executed. This decouples the logic from the scheduling.

### Tickers

Common tickers are available via the static `Tickers` class:
- `Tickers.animationFrame()`: Runs on `requestAnimationFrame`, ideal for rendering.
- `Tickers.fixedFPS(fps: number)`: Runs at a fixed rate (e.g., 60 FPS for physics).
- `Tickers.eventDriven(eventBus, MyEvent)`: Runs whenever a specific event occurs on the event bus.
- `Tickers.domEventDriven(element, 'click')`: Runs on DOM events.

You can also provide your own custom ticker function.

### Example: RotationProcessor

Here is a complete example of a processor that rotates objects every frame using `requestAnimationFrame`.

```typescript
import { Processor, Tickers, Scene, Actor } from '@vertex-link/space';
import { TransformComponent, RotatingComponent } from './components'; // Assuming these exist

class RotationProcessor extends Processor {
  private query;

  constructor(private scene: Scene) {
    // 1. Call super with a name and a ticker
    super('RotationProcessor', Tickers.animationFrame());

    // 2. Create a query for the actors this processor will operate on
    this.query = this.scene
      .query()
      .withComponent(TransformComponent, RotatingComponent);

    // 3. Add a task to be executed by the ticker
    this.addTask({
      id: 'rotate-all-actors',
      update: (deltaTime: number) => {
        // 4. Get the latest list of actors from the query
        const actors = this.query.execute();

        // 5. Iterate and apply logic
        for (const actor of actors) {
          const transform = actor.getComponent(TransformComponent)!;
          const rotation = actor.getComponent(RotatingComponent)!;

          transform.rotate(0, rotation.speed * deltaTime, 0);
        }
      },
    });
  }
}

// Usage
const rotationProcessor = new RotationProcessor(myScene);
rotationProcessor.start();

// Sometime later...
// rotationProcessor.stop();
```

### Custom Tickers

Advanced: provide a custom ticker if you need special scheduling (e.g., pausing on tab hidden, fixed-step accumulator):

```ts
import { Processor } from '@vertex-link/space';

const customTicker = (executeTasks: (dt: number) => void, isRunning: () => boolean) => {
  let last = performance.now();
  let raf: number;
  const tick = (now: number) => {
    if (!isRunning()) return;
    const dt = (now - last) / 1000;
    last = now;
    executeTasks(dt);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
};

class MyProcessor extends Processor {
  constructor() {
    super('my-processor', customTicker);
    // ... add tasks
  }
}
```

## Processor API

Useful APIs on a `Processor` instance:
- `processor.addTask({ id, update, context? })`: Registers a unit of work.
- `processor.removeTask(id)`: Removes a task by its ID.
- `processor.start()` / `processor.stop()`: Controls the execution of the ticker.
- `processor.setTicker(ticker)`: Swaps the scheduling logic at runtime.
- `processor.isRunning`: Returns `true` if the processor is active.
- `processor.taskCount`: Returns the number of registered tasks.

Note on legacy subclassing: `startImplementation()` and `stopImplementation()` exist for backward compatibility, but new code should prefer using tickers and should not override `start()`/`stop()`.

## Best Practices

- Separation of Concerns: Each Processor should have a single responsibility (e.g., physics, rendering, input).
- Stateless Logic: Ideally, Processors should be stateless. All the state they need should be read from Components.
- Performance: Cache queries and avoid unnecessary allocations inside tick handlers.
