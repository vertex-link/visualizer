import Actor from "../src/core/Actor.ts";
import Component from "../src/core/component/Component.ts";
import { Scene } from "../src/core/scene/Scene.ts";
import { ServiceRegistry } from "../src/core/Service.ts";
import { ProcessorRegistry } from "../src/core/processor/ProcessorRegistry.ts";
import { RenderProcessor } from "../src/engine/processors/RenderProcessor.ts";
import { FixedTickProcessor } from "../src/engine/processors/FixedTickProcessor.ts";

// Import improved event system
import { Event, EventBus, emit } from "../src/core/events/Event.ts";
import {OptionalComponent, RequireComponent} from "../src/core/component/Decorators.ts";
import { OnEvent } from "../src/core/events/Decorators.ts";
import {
    EntityCreatedEvent,
    EntityDestroyedEvent,
    ComponentAddedEvent,
    EntityDamagedEvent,
    EntityHealedEvent,
    EntityDiedEvent,
    CollisionStartEvent,
    CollisionEndEvent,
    KeyDownEvent,
    MouseClickEvent
} from "../src/core/events/CoreEvents.ts";

// ==================== Custom Game Events ====================

export class PlayerKillEvent extends Event<{
    player: Actor;
    enemy: Actor;
    experienceGained: number;
}> {
    static readonly eventType = 'game.player.kill';
}

export class PlayerLevelUpEvent extends Event<{
    player: Actor;
    newLevel: number;
    oldLevel: number;
}> {
    static readonly eventType = 'game.player.levelup';
}

export class SpellCastEvent extends Event<{
    caster: Actor;
    target?: Actor;
    spellName: string;
    manaCost: number;
}> {
    static readonly eventType = 'game.spell.cast';
}

// ==================== Base Components ====================

class TransformComponent extends Component {
    public x: number;
    public y: number;
    public rotation = 0;

    constructor(actor: Actor, x = 0, y = 0) {
        super(actor);
        this.x = x;
        this.y = y;
    }
}

class RenderComponent extends Component {
    public color = '#ffffff';
    public size = 10;
    public shape: 'circle' | 'square' | 'triangle' = 'circle';
    public visible = true;
    private flashTime = 0;
    private flashColor = '';
    private rotation = 0;

    // We'll mark it as a field with a non-null assertion operator
    @RequireComponent(TransformComponent)
    private transform!: TransformComponent;

    // We'll use a separate backup property with a different name
    private _backupTransform?: TransformComponent;

    constructor(actor: Actor) {
        super(actor);

        // Print dependency metadata for debugging
        console.log(`[DEBUG] RenderComponent (ID: ${this.id}) dependencies:`, this.getDependencyInfo());

        // Try to manually resolve the dependency right away and also with a timeout
        this.resolveTransformDependency();
        setTimeout(() => this.resolveTransformDependency(), 0);
    }

    private resolveTransformDependency() {
        // First try to see if the dependency system resolved it
        try {
            if (this.transform) {
                console.log(`[DEBUG] Transform dependency resolved via decorator for RenderComponent (ID: ${this.id})`);
                return;
            }
        } catch (e) {
            // Failed to get via decorator, will try manual resolution
        }

        // If not resolved, try manual resolution
        if (!this._backupTransform) {
            const transform = this.actor.getComponent(TransformComponent);
            if (transform) {
                this._backupTransform = transform;
                console.log(`[DEBUG] Manually set backup transform for RenderComponent (ID: ${this.id})`);
            }
        }
    }

    // No recursive getter to avoid stack overflow
    private getTransform(): TransformComponent | undefined {
        // Try to use the decorated property first
        try {
            if (this.transform) return this.transform;
        } catch (e) {
            // Silently fail and try backup
        }

        // If we don't have a backup yet, try one more time to resolve it
        if (!this._backupTransform) {
            this.resolveTransformDependency();
        }

        // Fall back to manually resolved property
        return this._backupTransform;
    }

    // Rest of the class remains the same
    // ...
}

// ==================== Game Components with Dependencies ====================

class HealthComponent extends Component {
    private _current: number;
    private _max: number;

    constructor(actor: Actor, max = 100) {
        super(actor);
        this._max = max;
        this._current = max;
    }

    get current() { return this._current; }
    get max() { return this._max; }
    get percentage() { return (this._current / this._max) * 100; }

    takeDamage(amount: number, source?: Actor): number {
        const oldHealth = this._current;
        this._current = Math.max(0, this._current - amount);
        const actualDamage = oldHealth - this._current;

        if (actualDamage > 0) {
            emit(new EntityDamagedEvent({
                target: this.actor,
                damage: actualDamage,
                source,
                damageType: 'physical'
            }));

            if (this._current === 0) {
                emit(new EntityDiedEvent({
                    target: this.actor,
                    killer: source
                }));
            }
        }

        return actualDamage;
    }

    heal(amount: number, source?: Actor): number {
        const oldHealth = this._current;
        this._current = Math.min(this._max, this._current + amount);
        const actualHealing = this._current - oldHealth;

        if (actualHealing > 0) {
            emit(new EntityHealedEvent({
                target: this.actor,
                amount: actualHealing,
                source
            }));
        }

        return actualHealing;
    }
}

class ManaComponent extends Component {
    private _current: number;
    private _max: number;
    private regenRate = 1; // per second

    constructor(actor: Actor, max = 50) {
        super(actor);
        this._max = max;
        this._current = max;
    }

    get current() { return this._current; }
    get max() { return this._max; }
    get percentage() { return (this._current / this._max) * 100; }

    useMana(amount: number): boolean {
        if (this._current >= amount) {
            this._current -= amount;
            return true;
        }
        return false;
    }

    regenerate(deltaTime: number) {
        this._current = Math.min(this._max, this._current + this.regenRate * deltaTime);
    }
}

class StatsComponent extends Component {
    public level = 1;
    public experience = 0;
    public experienceToNext = 100;
    public kills = 0;

    @RequireComponent(HealthComponent)
    private health!: HealthComponent;

    @OptionalComponent(ManaComponent)
    private mana?: ManaComponent;

    addExperience(amount: number) {
        const oldLevel = this.level;
        this.experience += amount;

        while (this.experience >= this.experienceToNext) {
            this.experience -= this.experienceToNext;
            this.level++;
            this.experienceToNext = this.level * 100;

            // Level up bonuses
            (this.health as any)._max += 20;
            (this.health as any)._current += 20;

            if (this.mana) {
                (this.mana as any)._max += 10;
                (this.mana as any)._current += 10;
            }
        }

        if (this.level > oldLevel) {
            emit(new PlayerLevelUpEvent({
                player: this.actor,
                newLevel: this.level,
                oldLevel
            }));
        }
    }

    @OnEvent(PlayerKillEvent)
    onKill(event: PlayerKillEvent) {
        if (event.payload.player === this.actor) {
            this.kills++;
            this.addExperience(event.payload.experienceGained);
        }
    }
}

class CombatComponent extends Component {
    @RequireComponent(HealthComponent)
    private health!: HealthComponent;

    @RequireComponent(StatsComponent)
    private stats!: StatsComponent;

    @RequireComponent(RenderComponent)
    private render!: RenderComponent;

    @OptionalComponent(ManaComponent)
    private mana?: ManaComponent;

    public attackDamage = 10;
    public attackRange = 100;
    public team: 'player' | 'enemy' = 'enemy';

    attack(target: Actor) {
        const targetHealth = target.getComponent(HealthComponent);
        if (targetHealth) {
            const damage = this.attackDamage + this.stats.level * 2;
            targetHealth.takeDamage(damage, this.actor);
        }
    }

    @OnEvent(EntityDamagedEvent)
    onDamaged(event: EntityDamagedEvent) {
        const { target, damage, source } = event.payload;

        if (target === this.actor) {
            // Visual feedback
            this.render.flashEffect('#ff4444');

            // Counter-attack with spell if we have mana
            if (source && this.mana && this.mana.current >= 5) {
                this.castSpell(source);
            }
        }
    }

    @OnEvent(EntityDiedEvent)
    onEntityDied(event: EntityDiedEvent) {
        const { target, killer } = event.payload;

        if (target === this.actor) {
            // Death animation
            this.render.visible = false;

            // Remove from scene after delay
            setTimeout(() => {
                (this.actor as any).scene?.removeActor(this.actor);
            }, 100);
        } else if (killer === this.actor) {
            // Award XP for kill
            emit(new PlayerKillEvent({
                player: this.actor,
                enemy: target,
                experienceGained: 10 + this.stats.level * 5
            }));
        }
    }

    private castSpell(target: Actor) {
        if (!this.mana || !this.mana.useMana(5)) return;

        emit(new SpellCastEvent({
            caster: this.actor,
            target,
            spellName: 'Fireball',
            manaCost: 5
        }));

        // Deal magic damage
        const targetHealth = target.getComponent(HealthComponent);
        if (targetHealth) {
            targetHealth.takeDamage(15 + this.stats.level * 3, this.actor);
        }

        // Visual effect
        this.render.flashEffect('#ff9944');
    }
}

class MovementComponent extends Component {
    @RequireComponent(TransformComponent)
    private transform!: TransformComponent;

    public speed = 100;
    public targetX = 0;
    public targetY = 0;

    moveTowards(x: number, y: number, deltaTime: number) {
        const dx = x - this.transform.x;
        const dy = y - this.transform.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            const moveDistance = this.speed * deltaTime;
            const ratio = Math.min(moveDistance / distance, 1);

            this.transform.x += dx * ratio;
            this.transform.y += dy * ratio;
        }
    }
}

// ==================== System Components ====================

class EventLoggerComponent extends Component {
    private eventCount = 0;
    private eventLog: HTMLElement;
    private eventsPerSecond = 0;
    private lastSecondCount = 0;
    private timer = 0;

    constructor(actor: Actor) {
        super(actor);
        this.eventLog = document.getElementById('event-log')!;
    }

    protected onDependenciesResolved() {
        // Listen to all events
        this.listenToAllEvents();
    }

    private listenToAllEvents() {
        // Core events
        this.registerEventLogger(EntityCreatedEvent);
        this.registerEventLogger(EntityDestroyedEvent);
        this.registerEventLogger(EntityDamagedEvent);
        this.registerEventLogger(EntityHealedEvent);
        this.registerEventLogger(EntityDiedEvent);

        // Game events
        this.registerEventLogger(PlayerKillEvent);
        this.registerEventLogger(PlayerLevelUpEvent);
        this.registerEventLogger(SpellCastEvent);
    }

    private registerEventLogger<T extends Event>(eventClass: { new(...args: any[]): T; eventType: string }) {
        const scene = (this.actor as any).scene;
        if (scene) {
            scene.eventBus.on(eventClass, (event: T) => {
                this.logEvent(event);
            }, this);
        }
    }

    private logEvent(event: Event<any>) {
        this.eventCount++;

        const entry = document.createElement('div');
        entry.className = 'event-entry';

        const typeSpan = document.createElement('span');
        typeSpan.className = 'event-type';
        typeSpan.textContent = event.type;

        const payloadSpan = document.createElement('span');
        payloadSpan.className = 'event-payload';
        payloadSpan.textContent = JSON.stringify(event.payload, (key, value) => {
            if (value instanceof Actor) return `Actor:${value.label}`;
            if (value instanceof Component) return `Component:${value.constructor.name}`;
            return value;
        }, 2).replace(/\n/g, ' ');

        entry.appendChild(typeSpan);
        entry.appendChild(document.createElement('br'));
        entry.appendChild(payloadSpan);

        this.eventLog.insertBefore(entry, this.eventLog.firstChild);

        // Keep only last 50 entries
        while (this.eventLog.children.length > 50) {
            this.eventLog.removeChild(this.eventLog.lastChild!);
        }

        // Update stats
        document.getElementById('total-events')!.textContent = this.eventCount.toString();
    }

    update(deltaTime: number) {
        this.timer += deltaTime;
        if (this.timer >= 1) {
            this.eventsPerSecond = this.eventCount - this.lastSecondCount;
            this.lastSecondCount = this.eventCount;
            this.timer = 0;

            document.getElementById('events-per-sec')!.textContent = this.eventsPerSecond.toString();
        }
    }
}

// ==================== Demo Controller ====================

class DemoController {
    private scene: Scene;
    private serviceRegistry: ServiceRegistry;
    private renderProcessor: RenderProcessor;
    private logicProcessor: FixedTickProcessor;

    private canvases: Map<string, CanvasRenderingContext2D> = new Map();
    private selectedEntity?: Actor;
    private combatRunning = false;
    private autoHeal = false;

    constructor() {
        this.scene = new Scene('DemoScene');
        this.serviceRegistry = new ServiceRegistry();

        // Setup processors
        this.renderProcessor = new RenderProcessor();
        this.logicProcessor = new FixedTickProcessor('logic', 30);

        ProcessorRegistry.register(this.renderProcessor);
        ProcessorRegistry.register(this.logicProcessor);
    }

    async initialize() {
        // Setup canvases
        this.setupCanvas('events-canvas');
        this.setupCanvas('dependencies-canvas');
        this.setupCanvas('combat-canvas');

        // Create event logger
        const logger = new Actor('EventLogger');
        logger.addComponent(EventLoggerComponent);
        this.scene.addActor(logger);

        // Start processors
        this.renderProcessor.start();
        this.logicProcessor.start();

        // Start render loop
        this.startRenderLoop();

        console.log('🚀 Event System Demo initialized');
    }

    private setupCanvas(id: string) {
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d')!;
        this.canvases.set(id, ctx);
    }

    private startRenderLoop() {
        const render = () => {
            // Clear all canvases
            this.canvases.forEach((ctx, id) => {
                const canvas = ctx.canvas;
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            });

            // Render entities
            const renderables = this.scene.query()
                .withComponent(RenderComponent, TransformComponent)
                .execute();

            renderables.forEach(actor => {
                const render = actor.getComponent(RenderComponent)!;

                // Determine which canvas to render to
                if (actor.label.includes('Event')) {
                    render.render(this.canvases.get('events-canvas')!, 0.016);
                } else if (actor.label.includes('Dependency')) {
                    render.render(this.canvases.get('dependencies-canvas')!, 0.016);
                } else if (actor.label.includes('Combat')) {
                    render.render(this.canvases.get('combat-canvas')!, 0.016);
                }
            });

            // Update stats
            const entities = this.scene.query().execute();
            document.getElementById('active-entities')!.textContent = entities.length.toString();

            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    }

    // ==================== Event Demo Methods ====================

    spawnEntity() {
        const entity = new Actor(`EventEntity-${Date.now()}`);

        const x = Math.random() * 600 + 100;
        const y = Math.random() * 300 + 50;

        entity.addComponent(TransformComponent, x, y);
        entity.addComponent(RenderComponent);
        entity.addComponent(HealthComponent, 100);
        entity.addComponent(StatsComponent);

        const render = entity.getComponent(RenderComponent)!;
        render.color = '#4a9eff';
        render.shape = 'circle';

        this.scene.addActor(entity);
    }

    damageRandom() {
        const entities = this.scene.query()
            .withComponent(HealthComponent)
            .execute()
            .filter(e => e.label.includes('EventEntity'));

        if (entities.length > 0) {
            const target = entities[Math.floor(Math.random() * entities.length)];
            const health = target.getComponent(HealthComponent)!;
            health.takeDamage(20);
        }
    }

    healRandom() {
        const entities = this.scene.query()
            .withComponent(HealthComponent)
            .execute()
            .filter(e => e.label.includes('EventEntity'));

        if (entities.length > 0) {
            const target = entities[Math.floor(Math.random() * entities.length)];
            const health = target.getComponent(HealthComponent)!;
            health.heal(30);
        }
    }

    triggerCollisions() {
        const entities = this.scene.query()
            .withComponent(TransformComponent)
            .execute()
            .filter(e => e.label.includes('EventEntity'));

        // Simulate collisions between random pairs
        for (let i = 0; i < Math.min(5, entities.length / 2); i++) {
            const a = entities[Math.floor(Math.random() * entities.length)];
            const b = entities[Math.floor(Math.random() * entities.length)];

            if (a !== b) {
                const transformA = a.getComponent(TransformComponent)!;
                const transformB = b.getComponent(TransformComponent)!;

                emit(new CollisionStartEvent({
                    actorA: a,
                    actorB: b,
                    contactPoint: {
                        x: (transformA.x + transformB.x) / 2,
                        y: (transformA.y + transformB.y) / 2,
                        z: 0
                    },
                    normal: { x: 0, y: 1, z: 0 }
                }));

                // Damage both
                const healthA = a.getComponent(HealthComponent);
                const healthB = b.getComponent(HealthComponent);

                if (healthA) healthA.takeDamage(10, b);
                if (healthB) healthB.takeDamage(10, a);
            }
        }
    }

    clearEntities() {
        const entities = this.scene.query()
            .execute()
            .filter(e => e.label.includes('EventEntity'));

        entities.forEach(e => this.scene.removeActor(e));
    }

    // ==================== Dependency Demo Methods ====================

    createWarrior() {
        const warrior = new Actor('DependencyWarrior');

        // Add components in correct order
        warrior.addComponent(TransformComponent, 200, 200);
        warrior.addComponent(RenderComponent);
        warrior.addComponent(HealthComponent, 150);
        warrior.addComponent(StatsComponent);
        warrior.addComponent(CombatComponent);

        const render = warrior.getComponent(RenderComponent)!;
        render.color = '#ff4444';
        render.shape = 'square';
        render.size = 15;

        this.scene.addActor(warrior);
        this.selectedEntity = warrior;
        this.updateDependencyGraph();
    }

    createMage() {
        const mage = new Actor('DependencyMage');

        // Add components (missing ManaComponent initially)
        mage.addComponent(TransformComponent, 400, 200);
        mage.addComponent(RenderComponent);
        mage.addComponent(HealthComponent, 80);
        mage.addComponent(StatsComponent);
        mage.addComponent(CombatComponent);

        const render = mage.getComponent(RenderComponent)!;
        render.color = '#4444ff';
        render.shape = 'triangle';
        render.size = 12;

        this.scene.addActor(mage);
        this.selectedEntity = mage;
        this.updateDependencyGraph();
    }

    createRogue() {
        const rogue = new Actor('DependencyRogue');

        // Intentionally add components out of order to show dependency resolution
        rogue.addComponent(CombatComponent); // This needs Health, Stats, Render
        rogue.addComponent(TransformComponent, 600, 200);
        rogue.addComponent(RenderComponent);
        // Missing Health and Stats!

        const render = rogue.getComponent(RenderComponent)!;
        render.color = '#44ff44';
        render.shape = 'circle';
        render.size = 10;

        this.scene.addActor(rogue);
        this.selectedEntity = rogue;
        this.updateDependencyGraph();
    }

    addMissingDependencies() {
        if (!this.selectedEntity) return;

        // Add missing components
        if (!this.selectedEntity.hasComponent(HealthComponent)) {
            this.selectedEntity.addComponent(HealthComponent, 100);
        }

        if (!this.selectedEntity.hasComponent(StatsComponent)) {
            this.selectedEntity.addComponent(StatsComponent);
        }

        if (!this.selectedEntity.hasComponent(ManaComponent) &&
            this.selectedEntity.label.includes('Mage')) {
            this.selectedEntity.addComponent(ManaComponent, 100);
        }

        // Force dependency resolution
        this.selectedEntity.resolveDependencies();
        this.updateDependencyGraph();
    }

    showDependencyInfo() {
        if (!this.selectedEntity) return;

        const info = document.getElementById('component-info')!;
        const components = this.selectedEntity.getAllComponents();

        let infoText = `// ${this.selectedEntity.label}\n`;
        infoText += `// Total Components: ${components.length}\n\n`;

        components.forEach(comp => {
            const depInfo = comp.getDependencyInfo();
            infoText += `${comp.constructor.name} {\n`;
            infoText += `  initialized: ${depInfo.initialized}\n`;

            if (depInfo.dependencies.length > 0) {
                infoText += `  dependencies: [\n`;
                depInfo.dependencies.forEach(dep => {
                    infoText += `    ${dep.name}: ${dep.resolved ? '✓' : '✗'} ${dep.required ? '(required)' : '(optional)'}\n`;
                });
                infoText += `  ]\n`;
            }

            infoText += `}\n\n`;
        });

        info.textContent = infoText;
    }

    private updateDependencyGraph() {
        const graph = document.getElementById('dependency-graph')!;
        graph.innerHTML = '';

        if (!this.selectedEntity) {
            graph.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No entity selected</p>';
            return;
        }

        const components = this.selectedEntity.getAllComponents();

        components.forEach(comp => {
            const depInfo = comp.getDependencyInfo();
            const node = document.createElement('div');
            node.className = 'dependency-node';

            if (depInfo.initialized) {
                node.classList.add('resolved');
            } else if (depInfo.hasCircularDependency) {
                node.classList.add('missing');
                node.style.borderColor = '#ff9944';
            } else {
                node.classList.add('missing');
            }

            let nodeHtml = `<strong>${comp.constructor.name}</strong>`;

            if (depInfo.dependencies.length > 0) {
                nodeHtml += '<span class="dependency-arrow">→</span>';
                nodeHtml += depInfo.dependencies
                    .map(dep => {
                        const color = dep.resolved ? '#44ff44' :
                            (dep.required ? '#ff4444' : '#ffff44');
                        return `<span style="color: ${color}">${dep.name}</span>`;
                    })
                    .join(', ');
            }

            node.innerHTML = nodeHtml;
            graph.appendChild(node);
        });

        this.showDependencyInfo();
    }

    // ==================== Combat Demo Methods ====================

    startCombat() {
        if (this.combatRunning) return;

        // Create player
        const player = new Actor('CombatPlayer');
        player.addComponent(TransformComponent, 400, 150);
        player.addComponent(RenderComponent);
        player.addComponent(HealthComponent, 100);
        player.addComponent(ManaComponent, 50);
        player.addComponent(StatsComponent);
        player.addComponent(CombatComponent);
        player.addComponent(MovementComponent);

        const render = player.getComponent(RenderComponent)!;
        render.color = '#4a9eff';
        render.shape = 'square';
        render.size = 15;

        const combat = player.getComponent(CombatComponent)!;
        combat.team = 'player';
        combat.attackDamage = 15;

        this.scene.addActor(player);

        // Start combat AI
        this.combatRunning = true;
        this.spawnWave();

        // Update UI
        this.updatePlayerStats();
    }

    stopCombat() {
        this.combatRunning = false;

        const combatEntities = this.scene.query()
            .execute()
            .filter(e => e.label.includes('Combat'));

        combatEntities.forEach(e => this.scene.removeActor(e));
    }

    spawnWave() {
        if (!this.combatRunning) return;

        // Spawn 3-5 enemies
        const count = Math.floor(Math.random() * 3) + 3;

        for (let i = 0; i < count; i++) {
            const enemy = new Actor(`CombatEnemy-${Date.now()}-${i}`);

            const x = Math.random() * 600 + 100;
            const y = Math.random() * 200 + 50;

            enemy.addComponent(TransformComponent, x, y);
            enemy.addComponent(RenderComponent);
            enemy.addComponent(HealthComponent, 30 + Math.random() * 20);
            enemy.addComponent(StatsComponent);
            enemy.addComponent(CombatComponent);
            enemy.addComponent(MovementComponent);

            const render = enemy.getComponent(RenderComponent)!;
            render.color = '#ff4444';
            render.shape = Math.random() > 0.5 ? 'circle' : 'triangle';
            render.size = 8 + Math.random() * 4;

            this.scene.addActor(enemy);
        }
    }

    toggleAutoHeal() {
        this.autoHeal = !this.autoHeal;
    }

    private updatePlayerStats() {
        const player = this.scene.query()
            .execute()
            .find(e => e.label === 'CombatPlayer');

        if (!player) return;

        const health = player.getComponent(HealthComponent);
        const mana = player.getComponent(ManaComponent);
        const stats = player.getComponent(StatsComponent);

        if (health) {
            document.getElementById('player-health')!.textContent =
                `${Math.round(health.current)}/${health.max}`;

            const healthBar = document.getElementById('player-health-bar')!;
            healthBar.style.width = `${health.percentage}%`;

            if (health.percentage < 30) {
                healthBar.classList.add('low');
                healthBar.classList.remove('medium');
            } else if (health.percentage < 60) {
                healthBar.classList.add('medium');
                healthBar.classList.remove('low');
            } else {
                healthBar.classList.remove('low', 'medium');
            }
        }

        if (mana) {
            document.getElementById('player-mana')!.textContent =
                `${Math.round(mana.current)}/${mana.max}`;
            document.getElementById('player-mana-bar')!.style.width =
                `${mana.percentage}%`;
        }

        if (stats) {
            document.getElementById('player-kills')!.textContent = stats.kills.toString();
            document.getElementById('player-level')!.textContent = stats.level.toString();
        }

        // Schedule next update
        if (this.combatRunning) {
            requestAnimationFrame(() => this.updatePlayerStats());
        }
    }
}

// ==================== Initialize Demo ====================

const demo = new DemoController();
(window as any).demo = demo;

demo.initialize().catch(console.error);