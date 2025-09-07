---
title: "Event System"
description: "Decouple your code with a powerful and easy-to-use event system."
---

# The Event System

The ACS package includes a global event system that allows different parts of your application to communicate without being directly aware of each other. This is a powerful pattern for creating decoupled, modular, and maintainable code.

## The EventBus

At the core of the system is the `EventBus`. It acts as a central dispatcher for all events. You can create your own instances of the `EventBus`. A lazily created default instance is also available via the `emit`, `on`, `off`, and `once` helpers from `@vertex-link/acs`.

Recommended practice: if you are using the Engine, prefer the `EventBus` instance created by `EngineContext` and pass/use it explicitly where possible (e.g., via your own context or dependency passing). The global default is provided for convenience and quick scripts.

## Defining an Event

An event is simply a class that extends the base `Event` class. The `eventType` static property is used as a unique identifier.

```typescript
import { Event } from '@vertex-link/acs';

export class PlayerHealthChangedEvent extends Event {
  public static readonly eventType = "PlayerHealthChanged";

  constructor(public readonly newHealth: number) {
    super();
  }
}
```

## Emitting Events

To send an event, you use the global `emit` function. Any part of your application can do this.

```typescript
import { emit } from '@vertex-link/acs';
import { PlayerHealthChangedEvent } from './events';

function applyDamage(damage: number) {
  // ... logic to decrease health
  const newHealth = 80;

  emit(new PlayerHealthChangedEvent(newHealth));
}
```

## Listening for Events

To react to an event, you can use the global `on` function. This is often done inside a Component or Service. Alternatively, if you have an EngineContext, use its eventBus explicitly for clearer ownership.

```typescript
import { on } from '@vertex-link/acs';
import { PlayerHealthChangedEvent } from './events';

class HealthBarUI {
  constructor() {
    on(PlayerHealthChangedEvent, this.handleHealthChanged.bind(this));
  }

  private handleHealthChanged(event: PlayerHealthChangedEvent) {
    console.log(`Updating UI with new health: ${event.newHealth}`);
    // ... update the health bar UI element
  }
}
```

// Using EngineContext's EventBus explicitly
```typescript
import { EngineContext } from '@vertex-link/engine';
import { PlayerHealthChangedEvent } from './events';

const engine = new EngineContext(canvas);
engine.eventBus.on(PlayerHealthChangedEvent, (evt) => {
  console.log('Engine bus received:', evt);
});
```

### Key Benefits

-   **Decoupling**: The code that applies damage doesn't need to know about the UI code that displays the health bar. It only needs to announce that the health has changed.
-   **Flexibility**: You can easily add more listeners for the same event without changing the original code. For example, you could add a sound effect player that also listens for `PlayerHealthChangedEvent`.
-   **Simplicity**: The global `emit` and `on` functions make the API clean and easy to use.
