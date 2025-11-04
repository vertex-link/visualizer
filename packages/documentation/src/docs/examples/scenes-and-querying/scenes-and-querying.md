---
title: Scenes and Querying Performance Demo
description: Demonstrates high-performance querying of 2,000 actors with multiple component types and real-time visualization.
entry: "demo.html"
parameters:
  - key: 'queryRenderable'
    label: 'Renderable Component'
    type: 'toggle'
    defaultValue: true
  - key: 'queryEnemy'
    label: 'Enemy Tag'
    type: 'toggle'
    defaultValue: false
  - key: 'queryPlayer'
    label: 'Player Tag'
    type: 'toggle'
    defaultValue: false
  - key: 'queryAI'
    label: 'AI Component'
    type: 'toggle'
    defaultValue: false
  - key: 'queryPhysics'
    label: 'Physics Component'
    type: 'toggle'
    defaultValue: false
  - key: 'queryCollectible'
    label: 'Collectible Tag'
    type: 'toggle'
    defaultValue: false
---

This demo showcases the SPACe query system's performance with 2,000 actors across 6 different entity types. Each actor has a unique combination of components, allowing you to test complex queries in real-time.

## Features

- **2,000 Actors**: Large-scale scene to demonstrate query performance
- **8 Component Types**: Transform, Renderable, Enemy, Player, AI, Physics, Health, and Collectible components
- **6 Entity Types**: Enemies, Players, NPCs, Collectibles, Obstacles, and Decorations
- **Real-time Visualization**: Canvas-based visualization showing all actors, with matching actors highlighted
- **Performance Metrics**: Live query execution time measurement (typically < 5ms)
- **Complex Queries**: Combine multiple component filters to narrow down results

## Entity Distribution

- **Enemies** (30%): Red - Has Transform, Renderable, Enemy tag, AI, Physics, and Health
- **NPCs** (20%): Green - Has Transform, Renderable, AI, and Physics
- **Collectibles** (15%): Yellow - Has Transform, Renderable, and Collectible tag
- **Obstacles** (15%): Gray - Has Transform and Physics (no visual representation)
- **Decorations** (15%): Magenta - Has Transform and Renderable
- **Players** (5%): Blue - Has Transform, Renderable, Player tag, Physics, and Health

Try different filter combinations to see how the query system efficiently filters thousands of actors in real-time!
