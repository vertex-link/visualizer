import { Actor, Component, Scene } from "@vertex-link/acs";

// Define some components for querying
class TransformComponent extends Component {}
class RenderableComponent extends Component {}
class EnemyTagComponent extends Component {}

// 1. Create a Scene
const scene = new Scene("Game Scene");

// 2. Create and add actors with different component combinations
const player = new Actor("Player");
player.addComponent(TransformComponent);
player.addComponent(RenderableComponent);
scene.addActor(player);

const enemy1 = new Actor("Enemy 1");
enemy1.addComponent(TransformComponent);
enemy1.addComponent(RenderableComponent);
enemy1.addComponent(EnemyTagComponent);
scene.addActor(enemy1);

const enemy2 = new Actor("Enemy 2");
enemy2.addComponent(TransformComponent);
enemy2.addComponent(RenderableComponent);
enemy2.addComponent(EnemyTagComponent);
scene.addActor(enemy2);

const invisibleWall = new Actor("Invisible Wall");
invisibleWall.addComponent(TransformComponent);
scene.addActor(invisibleWall);

const output = document.getElementById("output")!;
let queryRenderable = true;
let queryEnemy = false;

function runQueryAndRender() {
    let query = scene.query();
    const componentsToQuery = [];
    if (queryRenderable) {
        query = query.withComponent(RenderableComponent);
        componentsToQuery.push("RenderableComponent");
    }
    if (queryEnemy) {
        query = query.withComponent(EnemyTagComponent);
        componentsToQuery.push("EnemyTagComponent");
    }

    const results = query.execute();

    output.innerHTML = `
        <h2>Querying for actors with: <code>${componentsToQuery.join(', ') || 'any component'}</code></h2>
        <div>Found <strong>${results.length}</strong> matching actors:</div>
        <ul>${results.map(a => `<li>${a.label}</li>`).join("")}</ul>
    `;
}

window.addEventListener('message', (event) => {
    const { key, value } = event.data;
    if (key === 'queryRenderable') {
        queryRenderable = value;
    }
    if (key === 'queryEnemy') {
        queryEnemy = value;
    }
    runQueryAndRender();
});

runQueryAndRender();
