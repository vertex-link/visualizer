---
title: "Introduction to the SPACe Architecture"
description: "A high-level overview of the SPACe (Scene-Processor-Actor-Component) architecture."
---

# Introduction to the SPACe Architecture

Welcome to the **SPACe (Scene-Processor-Actor-Component)** package, a foundational block for building applications with the Vertex Link framework. SPACe provides a robust and flexible architecture inspired by the popular Entity-Component-System (ECS) pattern, but with some key differences that make it unique.

## Core Philosophy

The SPACe architecture is designed to help you write modular, decoupled, and maintainable code. Instead of creating monolithic game objects with complex inheritance chains, you compose functionality by attaching independent, reusable **Components** to simple **Actors**.

This approach has several key benefits:

- **Flexibility**: Easily add, remove, or change functionality at runtime.
- **Reusability**: Components can be shared across many different types of Actors.
- **Separation of Concerns**: Logic is separated from data, making your code easier to reason about and test.
- **Performance**: The data-oriented nature of this pattern allows for highly efficient processing.

## The Four Pillars of SPACe

The architecture revolves around four main concepts:

1.  **Scene**: A `Scene` is a container for a collection of `Actors`. It provides an efficient way to manage and query `Actors` based on their `Components` or tags. This allows you to organize your world and interact with groups of `Actors`.

2.  **Processor**: `Processors` are the workhorses of the architecture. They contain the logic that operates on `Components`. Each `Processor` runs in a loop and executes a list of tasks. This allows you to create systems like physics, rendering, or AI.

3.  **Actor**: An `Actor` is a simple container that represents an object in your world (e.g., a player, a camera, a UI element). They are the entities to which you attach `Components`.

4.  **Component**: `Components` are the building blocks of your application. Each `Component` is a small, focused piece of data that can be attached to an `Actor` (e.g., `TransformComponent`, `HealthComponent`, `MeshRendererComponent`).

## SPACe vs. ECS: The Key Differences

While SPACe is inspired by the Entity-Component-System (ECS) pattern, there are some important distinctions:

*   **Actors can have logic**: In a pure ECS, an "Entity" is just an ID with no data or methods. In SPACe, an `Actor` is a class that can have its own methods and logic. This allows for more object-oriented patterns when needed, giving you more flexibility. For example, an `Actor` can manage its own components or react to events.

*   **Processors are explicit task runners**: In many ECS implementations, a "System" implicitly queries the world for entities that match a certain component signature. In SPACe, a `Processor` is a more generic concept. It manages a list of tasks that are explicitly added to it. This gives you more control over what gets executed and when. A task can be any function, giving you the freedom to implement your logic in various ways.

In the upcoming sections, we'll dive deeper into each of these concepts and show you how to use them to build amazing things.