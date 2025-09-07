---
title: "Services"
description: "Learn how to use Services for global, application-wide logic."
---

# Services

While Actors, Components, and Processors form the core of the scene graph, some systems don't fit neatly into that model. **Services** are the solution for application-wide logic that isn't tied to a specific Actor.

Think of services as global singletons that you can access from anywhere in your application. They are perfect for managing systems like:

-   Input handling
-   Logging
-   Network communication
-   Asset management
-   Scene management

## The Service Registry

The framework provides a `ServiceRegistry` to manage the lifecycle of your services. You can register a service with a unique key and then resolve it from anywhere else.

## Defining a Service

A service is an object that conforms to the `IService` interface. You also need a unique `ServiceKey` (a `symbol`) to identify it.

```typescript
import { IService, ServiceKey } from '@vertex-link/acs';

// 1. Define the key
export const ILoggingServiceKey: ServiceKey = Symbol.for("ILoggingService");

// 2. Define the interface
export interface ILoggingService extends IService {
  log(message: string): void;
  error(message: string): void;
}

// 3. Implement the service
export class LoggingService implements ILoggingService {
  log(message: string) {
    console.log(`[INFO] ${message}`);
  }

  error(message: string) {
    console.error(`[ERROR] ${message}`);
  }
}
```

## Registering and Resolving Services

Typically, you register all your core services when your application starts up.

```typescript
import { ServiceRegistry } from '@vertex-link/acs';
import { ILoggingServiceKey, LoggingService } from './logging';

const registry = new ServiceRegistry();
registry.register(ILoggingServiceKey, new LoggingService());
```

Later, in a Component or Processor, you can resolve the service to use it:

```typescript
import { ServiceRegistry } from '@vertex-link/acs';
import { ILoggingServiceKey, ILoggingService } from './logging';

// Assuming you have access to the same registry instance
const logger = registry.resolve<ILoggingService>(ILoggingServiceKey);

if (logger) {
  logger.log("Player has jumped!");
}
```

## Services vs. Processors

-   Use a **Processor** when your logic needs to operate on a collection of Actors/Components every frame (e.g., updating positions).
-   Use a **Service** when you need to provide global functionality that can be called on-demand from anywhere (e.g., logging, loading a file).
