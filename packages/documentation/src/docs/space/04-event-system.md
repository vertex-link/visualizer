---
title: "Event System"
description: "Decouple your code with a powerful and easy-to-use event system."
---

# The Event System

The SPACe package includes a powerful event system that allows different parts of your application to communicate without being directly coupled. This is a key pattern for creating modular and maintainable code.

## The EventBus

At the core of the system is the `EventBus`. It acts as a central dispatcher for all events. You can create your own instances of the `EventBus`. For convenience, a default global instance is also available via the `emit`, `on`, `off`, and `once` helper functions exported from `@vertex-link/space`.

**Recommended Practice**: If you are using the `@vertex-link/engine`, prefer the `EventBus` instance created by `EngineContext`. Pass this instance explicitly where possible (e.g., via your own context or dependency injection). The global helpers are best suited for quick scripts or scenarios where dependency injection is overly complex.

## Defining an Event

An event is a class that extends the base `Event<TPayload>` class. The generic `TPayload` defines the shape of the data the event will carry.

-   The `eventType` static property is a **required** unique string identifier.
-   The constructor must accept a payload of type `TPayload` and pass it to `super()`.

```typescript
import { Event } from '@vertex-link/space';

// Define the shape of the event's data
interface PlayerHealthPayload {
  newHealth: number;
  maxHealth: number;
}

// Define the event class
export class PlayerHealthChangedEvent extends Event<PlayerHealthPayload> {
  public static readonly eventType = "PlayerHealthChanged";

  // The constructor takes the payload and passes it to the base Event class
  constructor(payload: PlayerHealthPayload) {
    super(payload);
  }
}
```

## Emitting Events

To send an event, you create a new instance of your event class and pass it to the `emit` function.

```typescript
import { emit } from '@vertex-link/space';
import { PlayerHealthChangedEvent } from './events';

function applyDamage(damage: number) {
  // ... logic to decrease health
  const newHealth = 80;
  const maxHealth = 100;

  // Create the payload and emit the event
  emit(new PlayerHealthChangedEvent({ newHealth, maxHealth }));
}
```

## Listening for Events

To react to an event, use the `on` function, providing the event class and a handler function. The handler will receive the event instance, and you can access its data via the `.payload` property.

```typescript
import { on } from '@vertex-link/space';
import { PlayerHealthChangedEvent } from './events';

class HealthBarUI {
  constructor() {
    // Listen for the health changed event
    on(PlayerHealthChangedEvent, this.handleHealthChanged.bind(this));
  }

  private handleHealthChanged(event: PlayerHealthChangedEvent) {
    // Access the data from the event's payload
    const { newHealth, maxHealth } = event.payload;
    
    console.log(`Updating UI: ${newHealth} / ${maxHealth}`);
    // ... update the health bar UI element
  }
}
```

### Using EngineContext's EventBus

For better code structure, use the `eventBus` instance from your `EngineContext`.

```typescript
import { EngineContext } from '@vertex-link/engine';
import { PlayerHealthChangedEvent } from './events';

const engine = new EngineContext(canvas);

engine.eventBus.on(PlayerHealthChangedEvent, (evt) => {
  console.log('Engine bus received health change:', evt.payload);
});
```

### Key Benefits

-   **Decoupling**: The code applying damage doesn't need to know about the UI. It only announces that health has changed.
-   **Flexibility**: Easily add more listeners (e.g., for sound effects, analytics) without changing the emitting code.
-   **Type Safety**: Using TypeScript generics for the payload ensures that event data is structured correctly.
