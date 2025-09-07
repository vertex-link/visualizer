---
title: "Querying for Actors"
description: "Master the QueryBuilder to efficiently find any Actor in your Scene."
---

# Querying for Actors

Finding the right Actors to act upon is a fundamental task in any application. The ACS package provides a fluent and powerful `QueryBuilder` to make this process both easy and efficient.

As we saw in the `Scenes` documentation, you start a query from a `Scene` instance:

```typescript
const query = myScene.query();
```

This gives you a `QueryBuilder` instance, which you can use to build up your query conditions.

## Filtering by Component

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

## Executing the Query

Once you have specified your conditions, call the `execute()` method to run the query and get an array of matching `Actors`.

The query system is highly optimized. The `Scene` maintains internal indices of components, so finding matching actors is very fast, even with thousands of objects.

## Advanced Querying

The `QueryBuilder` offers more than just component filtering. You can also:

-   **Filter by Tags**: Use `.withTag('Player')` or `.withoutTag('EditorOnly')` to filter by tags (once the tagging feature is implemented on Actors).
-   **Limit Results**: Use `.limit(10)` to get only the first 10 results.
-   **Sort Results**: Use `.orderBy((a, b) => a.id.localeCompare(b.id))` to sort the results.

## Best Practices

-   **Cache Queries if Possible**: If you need to run the same query every frame (e.g., in a Processor), it can be beneficial to create the `QueryBuilder` once and reuse it.
-   **Be Specific**: The more specific your query, the faster it will be. Filtering by components is the most efficient way to narrow down your search.
