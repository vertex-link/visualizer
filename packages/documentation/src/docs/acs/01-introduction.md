---
title: "Introduction to ACS"
description: "A high-level overview of the Actor-Component-Service (ACS) package."
---

# Introduction to ACS

Welcome to the **Actor-Component-Service (ACS)** package, the foundational block for building applications with the Vertex Link framework. ACS provides a robust and flexible architecture based on the popular Entity-Component-System (ECS) pattern, adapted with some powerful additions.

## Core Philosophy

The ACS package is designed to help you write modular, decoupled, and maintainable code. Instead of creating monolithic game objects with complex inheritance chains, you compose functionality by attaching independent, reusable **Components** to simple **Actors**.

This approach has several key benefits:

- **Flexibility**: Easily add, remove, or change functionality at runtime.
- **Reusability**: Components can be shared across many different types of Actors.
- **Separation of Concerns**: Logic is separated from data, making your code easier to reason about and test.
- **Performance**: The data-oriented nature of this pattern allows for highly efficient processing.

## The Three Pillars of ACS

The architecture revolves around three main concepts:

1.  **Actors**: Simple containers that represent objects in your scene (e.g., a player, a camera, a UI element). They don't have any logic themselves; they are just holders for Components.

2.  **Components**: The building blocks of your application. Each Component is a small, focused piece of data (e.g., `TransformComponent`, `HealthComponent`, `MeshRendererComponent`).

3.  **Services**: Global systems that provide functionality across the entire application, not tied to a specific Actor (e.g., `InputService`, `PhysicsService`, `LoggingService`).

In the upcoming sections, we'll dive deeper into each of these concepts and show you how to use them to build amazing things.
