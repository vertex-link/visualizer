import { Actor, Component, Scene } from "@vertex-link/space";

// Define diverse components for complex querying
class TransformComponent extends Component {
    constructor(actor: Actor, public x: number = 0, public y: number = 0) {
        super(actor);
    }
}
class RenderableComponent extends Component {
    constructor(actor: Actor, public color: string = "#ffffff") {
        super(actor);
    }
}
class EnemyTagComponent extends Component {}
class PlayerTagComponent extends Component {}
class AIComponent extends Component {}
class PhysicsComponent extends Component {}
class HealthComponent extends Component {
    constructor(actor: Actor, public health: number = 100) {
        super(actor);
    }
}
class CollectibleComponent extends Component {}

// Configuration
const ACTOR_COUNT = 5000;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// 1. Create a Scene
const scene = new Scene("Game Scene");

// 2. Generate many actors with random component combinations
const actorTypes = [
    { name: "Enemy", components: [TransformComponent, RenderableComponent, EnemyTagComponent, AIComponent, PhysicsComponent, HealthComponent], color: "#ff4444", weight: 0.3 },
    { name: "Player", components: [TransformComponent, RenderableComponent, PlayerTagComponent, PhysicsComponent, HealthComponent], color: "#4444ff", weight: 0.05 },
    { name: "NPC", components: [TransformComponent, RenderableComponent, AIComponent, PhysicsComponent], color: "#44ff44", weight: 0.2 },
    { name: "Collectible", components: [TransformComponent, RenderableComponent, CollectibleComponent], color: "#ffff44", weight: 0.15 },
    { name: "Obstacle", components: [TransformComponent, PhysicsComponent], color: "#888888", weight: 0.15 },
    { name: "Decoration", components: [TransformComponent, RenderableComponent], color: "#ff44ff", weight: 0.15 },
];

// Create weighted random selection
const weightedTypes: typeof actorTypes[0][] = [];
actorTypes.forEach(type => {
    const count = Math.floor(type.weight * 100);
    for (let i = 0; i < count; i++) {
        weightedTypes.push(type);
    }
});

// Generate actors
for (let i = 0; i < ACTOR_COUNT; i++) {
    const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
    const actor = new Actor(`${type.name} ${i}`);

    type.components.forEach(ComponentClass => {
        if (ComponentClass === TransformComponent) {
            actor.addComponent(TransformComponent,
                Math.random() * CANVAS_WIDTH,
                Math.random() * CANVAS_HEIGHT
            );
        } else if (ComponentClass === RenderableComponent) {
            actor.addComponent(RenderableComponent, type.color);
        } else if (ComponentClass === HealthComponent) {
            actor.addComponent(HealthComponent, Math.floor(Math.random() * 100) + 50);
        } else {
            actor.addComponent(ComponentClass);
        }
    });

    scene.addActor(actor);
}

// UI Elements
const output = document.getElementById("output")!;
const canvas = document.getElementById("visualization") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Query state
let queryRenderable = true;
let queryEnemy = false;
let queryPlayer = false;
let queryAI = false;
let queryPhysics = false;
let queryCollectible = false;

function runQueryAndRender() {

  console.time('doSomething')
  const startTime = performance.now();

    // Build query
    let query = scene.query();
    const componentsToQuery: string[] = [];

    if (queryRenderable) {
        query = query.withComponent(RenderableComponent);
        componentsToQuery.push("Renderable");
    }
    if (queryEnemy) {
        query = query.withComponent(EnemyTagComponent);
        componentsToQuery.push("Enemy");
    }
    if (queryPlayer) {
        query = query.withComponent(PlayerTagComponent);
        componentsToQuery.push("Player");
    }
    if (queryAI) {
        query = query.withComponent(AIComponent);
        componentsToQuery.push("AI");
    }
    if (queryPhysics) {
        query = query.withComponent(PhysicsComponent);
        componentsToQuery.push("Physics");
    }
    if (queryCollectible) {
        query = query.withComponent(CollectibleComponent);
        componentsToQuery.push("Collectible");
    }


    const results = query.execute();
    const endTime = performance.now();

    const queryTime = endTime - startTime;
    console.timeEnd('doSomething')
      console.log(queryTime);


    // Render visualization
    renderVisualization(results);


    // Update stats
    const totalActors = scene.query().execute().length;
    const percentage = ((results.length / totalActors) * 100).toFixed(1);


    output.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Actors</div>
                <div class="stat-value">${totalActors.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Matching Actors</div>
                <div class="stat-value">${results.length.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Match Rate</div>
                <div class="stat-value">${percentage}%</div>
            </div>
            <div class="stat-card highlight">
                <div class="stat-label">Query Time</div>
                <div class="stat-value">${queryTime.toFixed(3)}ms</div>
            </div>
        </div>
        <div class="query-info">
            <strong>Active Filters:</strong>
            ${componentsToQuery.length > 0 ? componentsToQuery.join(', ') : 'None (showing all actors)'}
        </div>
    `;
}

function renderVisualization(actors: Actor[]) {
    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Get all actors for background
    const allActors = scene.query().execute();

    // Draw non-matching actors (dimmed)
    const matchingSet = new Set(actors);
    allActors.forEach(actor => {
        const transform = actor.getComponent(TransformComponent);
        if (!transform || matchingSet.has(actor)) return;

        const renderable = actor.getComponent(RenderableComponent);
        ctx.fillStyle = renderable ? renderable.color + "22" : "#ffffff11";
        ctx.fillRect(transform.x - 2, transform.y - 2, 4, 4);
    });

    // Draw matching actors (bright)
    actors.forEach(actor => {
        const transform = actor.getComponent(TransformComponent);
        if (!transform) return;

        const renderable = actor.getComponent(RenderableComponent);
        ctx.fillStyle = renderable ? renderable.color : "#ffffff";

        // Draw with glow effect for matched actors
        ctx.shadowBlur = 4;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(transform.x - 3, transform.y - 3, 6, 6);
        ctx.shadowBlur = 0;
    });

    // Draw legend
    drawLegend();
}

function drawLegend() {
    const legendX = 10;
    const legendY = 10;
    const lineHeight = 20;

    ctx.font = "12px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Legend:", legendX, legendY);

    actorTypes.forEach((type, i) => {
        const y = legendY + (i + 1) * lineHeight;

        // Color box
        ctx.fillStyle = type.color;
        ctx.fillRect(legendX, y - 10, 12, 12);

        // Label
        ctx.fillStyle = "#ffffff";
        ctx.fillText(type.name, legendX + 18, y);
    });
}

window.addEventListener('message', (event) => {
    const { key, value } = event.data;
    if (key === 'queryRenderable') queryRenderable = value;
    if (key === 'queryEnemy') queryEnemy = value;
    if (key === 'queryPlayer') queryPlayer = value;
    if (key === 'queryAI') queryAI = value;
    if (key === 'queryPhysics') queryPhysics = value;
    if (key === 'queryCollectible') queryCollectible = value;
    runQueryAndRender();
});

runQueryAndRender();
