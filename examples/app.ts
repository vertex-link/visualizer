import Actor from "../src/core/Actor.ts";
import Component from "../src/core/component/Component.ts";
import { Scene } from "../src/core/scene/Scene.ts";
import { ServiceRegistry, IService, ServiceKey } from "../src/core/Service.ts";
import { ProcessorRegistry } from "../src/core/processor/ProcessorRegistry.ts";
import { RenderProcessor, RenderUpdate } from "../src/engine/processors/RenderProcessor.ts";
import { FixedTickProcessor, FixedTickUpdate } from "../src/engine/processors/FixedTickProcessor.ts";

// ==================== Global Journey State ====================

interface ActorTemplate {
    name: string;
    color: 'red' | 'blue' | 'yellow' | 'green';
    shape: 'circle' | 'square' | 'triangle';
    hasAnimation: boolean;
    count: number;
}

class JourneyState {
    public scene = new Scene('JourneyScene');
    public serviceRegistry = new ServiceRegistry();
    public templates: ActorTemplate[] = [];
    public currentStep = 1;

    // Processors
    public renderProcessor?: RenderProcessor;
    public fastProcessor?: FixedTickProcessor;
    public slowProcessor?: FixedTickProcessor;

    // State tracking
    public systemRunning = false;
    public activeFilters: string[] = [];
    public highlightedActors: Set<Actor> = new Set();
    public mouseAttraction = false;
}

const journeyState = new JourneyState();

// ==================== Services ====================

const ICanvasServiceKey = Symbol.for("ICanvasService");
const IMouseServiceKey = Symbol.for("IMouseService");

interface ICanvasService extends IService {
    getContext(canvasId: string): CanvasRenderingContext2D | null;
    clear(canvasId: string): void;
    getSize(canvasId: string): { width: number; height: number };
}

class CanvasService implements ICanvasService {
    private contexts = new Map<string, CanvasRenderingContext2D>();
    private canvases = new Map<string, HTMLCanvasElement>();

    initialize(): void {
        for (let i = 1; i <= 5; i++) {
            const canvasId = `step${i}-canvas`;
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;

                const ctx = canvas.getContext('2d')!;
                this.canvases.set(canvasId, canvas);
                this.contexts.set(canvasId, ctx);
            }
        }
    }

    getContext(canvasId: string): CanvasRenderingContext2D | null {
        return this.contexts.get(canvasId) || null;
    }

    clear(canvasId: string): void {
        const ctx = this.getContext(canvasId);
        const canvas = this.canvases.get(canvasId);
        if (ctx && canvas) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    getSize(canvasId: string): { width: number; height: number } {
        const canvas = this.canvases.get(canvasId);
        return canvas ? { width: canvas.width, height: canvas.height } : { width: 0, height: 0 };
    }
}

interface IMouseService extends IService {
    getPosition(canvasId: string): { x: number; y: number };
    isClicked(): boolean;
}

class MouseService implements IMouseService {
    private positions = new Map<string, { x: number; y: number }>();
    private clicked = false;
    private clickTime = 0;

    initialize(): void {
        for (let i = 1; i <= 5; i++) {
            const canvasId = `step${i}-canvas`;
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            if (canvas) {
                this.positions.set(canvasId, { x: 0, y: 0 });

                canvas.addEventListener('mousemove', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    this.positions.set(canvasId, {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    });
                });

                canvas.addEventListener('click', () => {
                    this.clicked = true;
                    this.clickTime = performance.now();
                });
            }
        }
    }

    getPosition(canvasId: string): { x: number; y: number } {
        return this.positions.get(canvasId) || { x: 0, y: 0 };
    }

    isClicked(): boolean {
        if (this.clicked && performance.now() - this.clickTime > 100) {
            this.clicked = false;
        }
        return this.clicked;
    }
}

// ==================== Components ====================

class TransformComponent extends Component {
    public x = 0;
    public y = 0;
    public rotation = 0;
    public scale = 1;

    constructor(actor: Actor, x = 0, y = 0) {
        super(actor);
        this.x = x;
        this.y = y;
    }
}

// ==================== Color Components (Separate for better component showcase) ====================

class RedComponent extends Component {
    getHexColor(): string { return '#ff4444'; }
}

class BlueComponent extends Component {
    getHexColor(): string { return '#4444ff'; }
}

class YellowComponent extends Component {
    getHexColor(): string { return '#ffff44'; }
}

class GreenComponent extends Component {
    getHexColor(): string { return '#44ff44'; }
}

class RenderComponent extends Component {
    public shape: 'circle' | 'square' | 'triangle';
    public size = 8;
    public highlighted = false;

    constructor(actor: Actor, shape: 'circle' | 'square' | 'triangle' = 'circle') {
        super(actor);
        this.shape = shape;
    }

    @RenderUpdate()
    renderActor(deltaTime: number): void {
        this.renderToCanvas('step1-canvas');
        this.renderToCanvas('step2-canvas');
        this.renderToCanvas('step3-canvas');
        this.renderToCanvas('step4-canvas');

        // Step 5 has live filtering - check if this actor should be visible
        if (this.shouldRenderToStep5()) {
            this.renderToCanvas('step5-canvas');
        }
    }

    private shouldRenderToStep5(): boolean {
        // If no filters active, render all actors
        if (journeyState.activeFilters.length === 0) {
            return true;
        }

        // Check each active filter
        let passesFilters = true;

        if (journeyState.activeFilters.includes('red')) {
            if (!this.actor.hasComponent(RedComponent)) {
                passesFilters = false;
            }
        }

        if (journeyState.activeFilters.includes('fast')) {
            if (!this.actor.hasComponent(FastMovementComponent)) {
                passesFilters = false;
            }
        }

        if (journeyState.activeFilters.includes('animated')) {
            if (!this.actor.hasComponent(AnimationComponent)) {
                passesFilters = false;
            }
        }

        return passesFilters;
    }

    private renderToCanvas(canvasId: string): void {
        const transform = this.actor.getComponent(TransformComponent);
        if (!transform) return;

        // Get color from color components
        let color = '#ffffff'; // default white
        const redComp = this.actor.getComponent(RedComponent);
        const blueComp = this.actor.getComponent(BlueComponent);
        const yellowComp = this.actor.getComponent(YellowComponent);
        const greenComp = this.actor.getComponent(GreenComponent);

        if (redComp) color = redComp.getHexColor();
        else if (blueComp) color = blueComp.getHexColor();
        else if (yellowComp) color = yellowComp.getHexColor();
        else if (greenComp) color = greenComp.getHexColor();

        if (this.highlighted) color = '#ffffff';

        const ctx = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey)?.getContext(canvasId);
        if (!ctx) return;

        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scale, transform.scale);

        switch (this.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(-this.size, this.size);
                ctx.lineTo(this.size, this.size);
                ctx.closePath();
                ctx.fill();
                break;
        }
        ctx.restore();
    }
}

class AnimationComponent extends Component {
    private baseSize = 8;
    private time = 0;

    @RenderUpdate()
    animate(deltaTime: number): void {
        this.time += deltaTime * 3;
        const render = this.actor.getComponent(RenderComponent);
        if (render) {
            render.size = this.baseSize + Math.sin(this.time) * 3;
        }
    }
}

class FastMovementComponent extends Component {
    public vx = 0;
    public vy = 0;

    constructor(actor: Actor) {
        super(actor);
        this.vx = (Math.random() - 0.5) * 100;
        this.vy = (Math.random() - 0.5) * 100;
    }

    @RenderUpdate()
    updateFast(deltaTime: number): void {
        const transform = this.actor.getComponent(TransformComponent);
        if (!transform) return;

        transform.x += this.vx * deltaTime;
        transform.y += this.vy * deltaTime;

        // Bounce off edges
        if (transform.x < 10 || transform.x > 790) this.vx *= -1;
        if (transform.y < 10 || transform.y > 390) this.vy *= -1;

        transform.x = Math.max(10, Math.min(790, transform.x));
        transform.y = Math.max(10, Math.min(390, transform.y));
    }
}

class SlowMovementComponent extends Component {
    public vx = 0;
    public vy = 0;

    constructor(actor: Actor) {
        super(actor);
        this.vx = (Math.random() - 0.5) * 50;
        this.vy = (Math.random() - 0.5) * 50;
    }

    @FixedTickUpdate()
    updateSlow(deltaTime: number): void {
        const transform = this.actor.getComponent(TransformComponent);
        if (!transform) return;

        transform.x += this.vx * deltaTime;
        transform.y += this.vy * deltaTime;

        // Bounce off edges
        if (transform.x < 10 || transform.x > 790) this.vx *= -1;
        if (transform.y < 10 || transform.y > 390) this.vy *= -1;

        transform.x = Math.max(10, Math.min(790, transform.x));
        transform.y = Math.max(10, Math.min(390, transform.y));
    }
}

class AttractionComponent extends Component {
    public attractionStrength = 150;
    public pulseMultiplier = 1;

    @RenderUpdate()
    applyAttraction(deltaTime: number): void {
        if (!journeyState.mouseAttraction) return;

        const transform = this.actor.getComponent(TransformComponent);
        if (!transform) return;

        const mouseService = journeyState.serviceRegistry.resolve<IMouseService>(IMouseServiceKey);
        if (!mouseService) return;

        // Get mouse position for step4 canvas specifically
        const mousePos = mouseService.getPosition('step4-canvas');

        // Calculate direction to mouse
        const dx = mousePos.x - transform.x;
        const dy = mousePos.y - transform.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            // Normalize and apply attraction force
            const force = this.attractionStrength * this.pulseMultiplier / Math.max(distance, 50);
            const forceX = (dx / distance) * force * deltaTime;
            const forceY = (dy / distance) * force * deltaTime;

            transform.x += forceX;
            transform.y += forceY;

            // Keep in bounds
            transform.x = Math.max(15, Math.min(785, transform.x));
            transform.y = Math.max(15, Math.min(385, transform.y));
        }

        // Handle click pulse
        if (mouseService.isClicked()) {
            this.pulseMultiplier = 5;
        }

        // Decay pulse
        this.pulseMultiplier = Math.max(1, this.pulseMultiplier * 0.92);
    }
}

class ColorCycleComponent extends Component {
    private timeOffset = Math.random() * Math.PI * 2;
    private time = 0;

    @RenderUpdate()
    cycleColors(deltaTime: number): void {
        this.time += deltaTime * 2; // Faster cycling

        // Remove existing color components
        if (this.actor.hasComponent(RedComponent)) this.actor.removeComponent(RedComponent);
        if (this.actor.hasComponent(BlueComponent)) this.actor.removeComponent(BlueComponent);
        if (this.actor.hasComponent(YellowComponent)) this.actor.removeComponent(YellowComponent);
        if (this.actor.hasComponent(GreenComponent)) this.actor.removeComponent(GreenComponent);

        // Add new color based on sine wave
        const colorValue = Math.sin(this.time + this.timeOffset) + 1; // 0-2 range

        if (colorValue < 0.5) {
            this.actor.addComponent(RedComponent);
        } else if (colorValue < 1.0) {
            this.actor.addComponent(BlueComponent);
        } else if (colorValue < 1.5) {
            this.actor.addComponent(YellowComponent);
        } else {
            this.actor.addComponent(GreenComponent);
        }

        // Update scene indices when components change
        journeyState.scene.updateActorIndices(this.actor);
    }
}

class GravityComponent extends Component {
    private gravity = 150;
    private velocityY = 0;
    private bounce = 0.7;

    @RenderUpdate()
    applyGravity(deltaTime: number): void {
        const transform = this.actor.getComponent(TransformComponent);
        if (!transform) return;

        // Apply gravity
        this.velocityY += this.gravity * deltaTime;
        transform.y += this.velocityY * deltaTime;

        // Bounce off bottom
        if (transform.y > 380) {
            transform.y = 380;
            this.velocityY *= -this.bounce;

            // Add some randomness to prevent synchronization
            this.velocityY += (Math.random() - 0.5) * 50;
        }

        // Keep in horizontal bounds
        transform.x = Math.max(15, Math.min(785, transform.x));
    }
}

class PulseEffectComponent extends Component {
    private pulseTime = 0;
    private basePulseSpeed = 4;

    constructor(actor: Actor) {
        super(actor);
        this.pulseTime = Math.random() * Math.PI * 2; // Random start phase
    }

    @RenderUpdate()
    pulse(deltaTime: number): void {
        this.pulseTime += deltaTime * this.basePulseSpeed;

        const render = this.actor.getComponent(RenderComponent);
        if (render) {
            // Create pulsing effect
            const pulseScale = 0.5 + Math.sin(this.pulseTime) * 0.3; // 0.2 to 0.8
            render.size = 8 * pulseScale;

            const transform = this.actor.getComponent(TransformComponent);
            if (transform) {
                transform.scale = pulseScale;
            }
        }
    }
}

// Canvas clearing component
class CanvasClearComponent extends Component {
    @RenderUpdate()
    clearCanvases(deltaTime: number): void {
        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        if (!canvasService) return;

        canvasService.clear('step1-canvas');
        canvasService.clear('step2-canvas');
        canvasService.clear('step3-canvas');
        canvasService.clear('step4-canvas');
        canvasService.clear('step5-canvas');
    }
}

// ==================== Journey Steps ====================

class Step1 {
    updateUI(): void {
        document.getElementById('step1-templates')!.textContent = journeyState.templates.length.toString();
        document.getElementById('step1-actors')!.textContent = journeyState.scene.getActorCount().toString();

        const allActors = journeyState.scene.query().execute(journeyState.scene);
        const totalComponents = allActors.reduce((sum, actor) => sum + actor.getAllComponents().length, 0);
        document.getElementById('step1-components')!.textContent = totalComponents.toString();

        const animated = journeyState.scene.query().withComponent(AnimationComponent).execute(journeyState.scene).length;
        document.getElementById('step1-animated')!.textContent = animated.toString();

        this.updateTemplateList();
    }

    updateTemplateList(): void {
        const container = document.getElementById('template-list')!;
        container.innerHTML = '';

        journeyState.templates.forEach((template, index) => {
            const div = document.createElement('div');
            div.className = 'actor-template';
            div.innerHTML = `
                <div class="template-name">${template.name}</div>
                <div class="template-components">
                    ${template.color} ${template.shape} ${template.hasAnimation ? '+ anim' : ''}
                </div>
                <div class="template-count">
                    <span>Count:</span>
                    <input type="number" value="${template.count}" min="1" max="20000" 
                           onchange="journey.step1.updateTemplateCount(${index}, this.value)">
                    <button onclick="journey.step1.removeTemplate(${index})">×</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    createTemplate(): void {
        const name = (document.getElementById('template-name') as HTMLInputElement).value || 'Actor';
        const color = (document.getElementById('template-color') as HTMLSelectElement).value as 'red' | 'blue' | 'yellow' | 'green';
        const shape = (document.getElementById('template-shape') as HTMLSelectElement).value as 'circle' | 'square' | 'triangle';
        const hasAnimation = (document.getElementById('template-animation') as HTMLInputElement).checked;

        journeyState.templates.push({
            name: `${name}-${journeyState.templates.length + 1}`,
            color,
            shape,
            hasAnimation,
            count: 5
        });

        this.updateUI();
        // Update Step 2 UI as well since we have new templates
        journey.step2.updateUI();
    }

    updateTemplateCount(index: number, count: string): void {
        journeyState.templates[index].count = Math.max(1, Math.min(20000, parseInt(count) || 1));
        this.updateUI();
    }

    removeTemplate(index: number): void {
        journeyState.templates.splice(index, 1);
        this.updateUI();
        // Update Step 2 UI as well since we removed templates
        journey.step2.updateUI();
    }

    spawnActors(): void {
        // Clear existing actors
        journeyState.scene.clear();

        // Create canvas clearer actor (only needs to exist once)
        const clearer = new Actor('CanvasClearer');
        clearer.addComponent(CanvasClearComponent);
        journeyState.scene.addActor(clearer);

        journeyState.templates.forEach(template => {
            for (let i = 0; i < template.count; i++) {
                const actor = new Actor(`${template.name}-${i}`);

                // Random position
                const x = Math.random() * 780 + 10;
                const y = Math.random() * 380 + 10;

                actor.addComponent(TransformComponent, x, y);

                // Add appropriate color component
                switch (template.color) {
                    case 'red': actor.addComponent(RedComponent); break;
                    case 'blue': actor.addComponent(BlueComponent); break;
                    case 'yellow': actor.addComponent(YellowComponent); break;
                    case 'green': actor.addComponent(GreenComponent); break;
                }

                actor.addComponent(RenderComponent, template.shape);

                if (template.hasAnimation) {
                    actor.addComponent(AnimationComponent);
                }

                journeyState.scene.addActor(actor);
            }
        });

        this.updateUI();
        // Update Step 2 UI as well since we have new actors
        journey.step2.updateUI();
    }

    render(): void {
        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        if (!canvasService) return;

        canvasService.clear('step1-canvas');

        const renderableActors = journeyState.scene.query()
            .withComponent(TransformComponent, RenderComponent)
            .execute(journeyState.scene);

        renderableActors.forEach(actor => {
            const render = actor.getComponent(RenderComponent);
            render?.render('step1-canvas');
        });
    }
}

class Step2 {
    private renderFPS = 0;
    private logicFPS = 0;
    private frameCount = 0;
    private lastFPSTime = performance.now();
    public templateMovementTypes = new Map<string, 'none' | 'fast' | 'slow'>();

    initialize(): void {
        // FPS tracking - track actual renders via processor
        let renderCount = 0;
        const originalRenderProcessor = journeyState.renderProcessor;

        setInterval(() => {
            const now = performance.now();
            const delta = (now - this.lastFPSTime) / 1000;
            this.renderFPS = Math.round(renderCount / delta);
            renderCount = 0;
            this.lastFPSTime = now;
            this.updateUI();
        }, 1000);

        // Hook into render processor to count frames
        if (originalRenderProcessor) {
            const originalExecuteTasks = originalRenderProcessor.executeTasks.bind(originalRenderProcessor);
            (originalRenderProcessor as any).executeTasks = function(deltaTime: number, ...args: any[]) {
                renderCount++;
                return originalExecuteTasks(deltaTime, ...args);
            };
        }

        this.updateUI();
    }

    updateTemplateMovementList(): void {
        const container = document.getElementById('template-movement-list')!;
        container.innerHTML = '';

        if (journeyState.templates.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">Create actor templates in Step 1 first</div>';
            return;
        }

        journeyState.templates.forEach(template => {
            const currentMovement = this.templateMovementTypes.get(template.name) || 'none';

            const div = document.createElement('div');
            div.className = 'actor-template';
            div.innerHTML = `
                <div class="template-name">${template.name}</div>
                <div class="template-components" style="margin-bottom: 0.5rem;">
                    ${template.color} ${template.shape} (${template.count} actors)
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="control-button ${currentMovement === 'fast' ? 'active' : ''}" 
                            onclick="journey.step2.assignTemplateMovement('${template.name}', 'fast')"
                            style="flex: 1; font-size: 0.7rem;">
                        Fast (60fps)
                    </button>
                    <button class="control-button ${currentMovement === 'slow' ? 'active' : ''}" 
                            onclick="journey.step2.assignTemplateMovement('${template.name}', 'slow')"
                            style="flex: 1; font-size: 0.7rem;">
                        Slow (10fps)
                    </button>
                    <button class="control-button ${currentMovement === 'none' ? 'active' : ''}" 
                            onclick="journey.step2.assignTemplateMovement('${template.name}', 'none')"
                            style="flex: 1; font-size: 0.7rem;">
                        None
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    assignTemplateMovement(templateName: string, movementType: 'fast' | 'slow' | 'none'): void {
        // Get all actors that belong to this template
        const templateActors = journeyState.scene.query()
            .execute(journeyState.scene)
            .filter(actor => actor.label.startsWith(templateName + '-'));

        // Clear existing movement from these actors
        templateActors.forEach(actor => {
            this.clearActorMovement(actor);
            console.log('clear actor movement', actor.label);
            if (movementType === 'fast') {
                actor.addComponent(FastMovementComponent);
                actor.removeComponent(SlowMovementComponent);
                journeyState.scene.updateActorIndices(actor);
                console.log('add fast movement', actor.label);
            } else if (movementType === 'slow') {
                actor.addComponent(SlowMovementComponent);
                actor.removeComponent(FastMovementComponent);
                journeyState.scene.updateActorIndices(actor);
                console.log('add slow movement', actor.label);
            }
        });

        // Update tracking
        this.templateMovementTypes.set(templateName, movementType);
        this.updateUI();
    }

    randomAssignment(): void {
        journeyState.templates.forEach(template => {
            const movementTypes: ('fast' | 'slow' | 'none')[] = ['fast', 'slow', 'none'];
            const randomType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
            this.assignTemplateMovement(template.name, randomType);
        });
    }

    clearAllMovement(): void {
        const actors = journeyState.scene.query().execute(journeyState.scene);
        actors.forEach(actor => this.clearActorMovement(actor));

        // Clear tracking
        this.templateMovementTypes.clear();
        this.updateUI();
    }

    private clearActorMovement(actor: Actor): void {
        if (actor.hasComponent(FastMovementComponent)) {
            actor.removeComponent(FastMovementComponent);
        }
        if (actor.hasComponent(SlowMovementComponent)) {
            actor.removeComponent(SlowMovementComponent);
        }

        journeyState.scene.updateActorIndices(actor);
    }

    startProcessors(): void {
        journeyState.renderProcessor?.start(); // Handles both rendering and fast movement
        journeyState.slowProcessor?.start(); // Handles slow movement
        journeyState.systemRunning = true;

        const button = document.getElementById('start-processors')!;
        button.textContent = 'Processors Running';
        button.classList.add('active');
    }

    stopProcessors(): void {
        journeyState.renderProcessor?.stop();
        journeyState.slowProcessor?.stop();
        journeyState.systemRunning = false;

        const button = document.getElementById('start-processors')!;
        button.textContent = 'Start Processors';
        button.classList.remove('active');
    }

    updateUI(): void {
        const fastMovers = journeyState.scene.query().withComponent(FastMovementComponent).execute(journeyState.scene).length;
        const slowMovers = journeyState.scene.query().withComponent(SlowMovementComponent).execute(journeyState.scene).length;

        document.getElementById('step2-fast')!.textContent = fastMovers.toString();
        document.getElementById('step2-slow')!.textContent = slowMovers.toString();
        document.getElementById('step2-render-fps')!.textContent = this.renderFPS.toString();
        document.getElementById('step2-logic-fps')!.textContent = '10'; // Slow processor FPS

        this.updateTemplateMovementList();
    }
}

class Step3 {
    private lastQuery = 'none';
    private lastResults = 0;

    queryAnimated(): void {
        this.clearHighlight();
        const results = journeyState.scene.query().withComponent(AnimationComponent).execute(journeyState.scene);
        this.highlightActors(results);
        this.lastQuery = 'Animated';
        this.lastResults = results.length;
        this.updateUI();
    }

    queryMoving(): void {
        this.clearHighlight();
        const fast = journeyState.scene.query().withComponent(FastMovementComponent).execute(journeyState.scene);
        const slow = journeyState.scene.query().withComponent(SlowMovementComponent).execute(journeyState.scene);
        const results = [...fast, ...slow];
        this.highlightActors(results);
        this.lastQuery = 'Moving (Fast or Slow)';
        this.lastResults = results.length;
        this.updateUI();
    }

    queryFastMovers(): void {
        this.clearHighlight();
        const results = journeyState.scene.query().withComponent(FastMovementComponent).execute(journeyState.scene);
        this.highlightActors(results);
        this.lastQuery = 'Fast Movers';
        this.lastResults = results.length;
        this.updateUI();
    }

    querySlowMovers(): void {
        this.clearHighlight();
        const results = journeyState.scene.query().withComponent(SlowMovementComponent).execute(journeyState.scene);
        this.highlightActors(results);
        this.lastQuery = 'Slow Movers';
        this.lastResults = results.length;
        this.updateUI();
    }

    queryColor(color: 'red' | 'blue' | 'yellow' | 'green'): void {
        this.clearHighlight();
        let results: Actor[] = [];

        switch (color) {
            case 'red':
                results = journeyState.scene.query().withComponent(RedComponent).execute(journeyState.scene);
                break;
            case 'blue':
                results = journeyState.scene.query().withComponent(BlueComponent).execute(journeyState.scene);
                break;
            case 'yellow':
                results = journeyState.scene.query().withComponent(YellowComponent).execute(journeyState.scene);
                break;
            case 'green':
                results = journeyState.scene.query().withComponent(GreenComponent).execute(journeyState.scene);
                break;
        }

        this.highlightActors(results);
        this.lastQuery = `${color.charAt(0).toUpperCase() + color.slice(1)} Color Component`;
        this.lastResults = results.length;
        this.updateUI();
    }

    queryRedAndAnimated(): void {
        this.clearHighlight();
        const results = journeyState.scene.query()
            .withComponent(RedComponent, AnimationComponent)
            .execute(journeyState.scene);
        this.highlightActors(results);
        this.lastQuery = 'Red + Animated Components';
        this.lastResults = results.length;
        this.updateUI();
    }

    queryCirclesOnly(): void {
        this.clearHighlight();
        const allActors = journeyState.scene.query().withComponent(RenderComponent).execute(journeyState.scene);
        const results = allActors.filter(actor => {
            const render = actor.getComponent(RenderComponent);
            return render?.shape === 'circle';
        });
        this.highlightActors(results);
        this.lastQuery = 'Circles Only';
        this.lastResults = results.length;
        this.updateUI();
    }

    clearHighlight(): void {
        journeyState.highlightedActors.forEach(actor => {
            const render = actor.getComponent(RenderComponent);
            if (render) render.highlighted = false;
        });
        journeyState.highlightedActors.clear();
    }

    private highlightActors(actors: Actor[]): void {
        actors.forEach(actor => {
            const render = actor.getComponent(RenderComponent);
            if (render) {
                render.highlighted = true;
                journeyState.highlightedActors.add(actor);
            }
        });
    }

    updateUI(): void {
        document.getElementById('step3-results')!.textContent = this.lastResults.toString();
        document.getElementById('step3-query')!.textContent = this.lastQuery;
        document.getElementById('step3-total')!.textContent = journeyState.scene.getActorCount().toString();
        document.getElementById('step3-highlighted')!.textContent = journeyState.highlightedActors.size.toString();
    }
}

class Step4 {
    private serviceCalls = 0;
    private mousePos = { x: 0, y: 0 };
    private canvasServiceUsed = false;
    private mouseServiceUsed = false;
    private effectsActive = new Set<string>();

    initialize(): void {
        setInterval(() => {
            const mouse = journeyState.serviceRegistry.resolve<IMouseService>(IMouseServiceKey);
            if (mouse) {
                this.mousePos = mouse.getPosition('step4-canvas');
                this.updateUI();
            }
        }, 100);
    }

    enableMouseAttraction(): void {
        journeyState.mouseAttraction = true;
        this.effectsActive.add('attraction');

        // Add attraction component to all renderable actors
        const actors = journeyState.scene.query()
            .withComponent(TransformComponent, RenderComponent)
            .execute(journeyState.scene)
            .filter(actor => actor.label !== 'CanvasClearer');

        actors.forEach(actor => {
            if (!actor.hasComponent(AttractionComponent)) {
                actor.addComponent(AttractionComponent);
                journeyState.scene.updateActorIndices(actor);
            }
        });

        this.mouseServiceUsed = true;
        this.serviceCalls++;
        console.log('🎯 Mouse attraction enabled - move mouse over canvas and click!');
        this.updateUI();
    }

    disableMouseAttraction(): void {
        journeyState.mouseAttraction = false;
        this.effectsActive.delete('attraction');

        // Remove attraction component from all actors
        const actors = journeyState.scene.query().withComponent(AttractionComponent).execute(journeyState.scene);
        actors.forEach(actor => {
            actor.removeComponent(AttractionComponent);
            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('❌ Mouse attraction disabled');
        this.updateUI();
    }

    enableColorCycling(): void {
        this.effectsActive.add('colors');

        // Add color cycling to actors that don't have it
        const actors = journeyState.scene.query()
            .withComponent(TransformComponent, RenderComponent)
            .execute(journeyState.scene)
            .filter(actor =>
                actor.label !== 'CanvasClearer' &&
                !actor.hasComponent(ColorCycleComponent)
            );

        actors.forEach(actor => {
            actor.addComponent(ColorCycleComponent);
            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('🌈 Color cycling enabled - using Canvas Service for rendering');
        this.canvasServiceUsed = true;
        this.updateUI();
    }

    disableColorCycling(): void {
        this.effectsActive.delete('colors');

        // Remove color cycling from all actors
        const actors = journeyState.scene.query().withComponent(ColorCycleComponent).execute(journeyState.scene);
        actors.forEach(actor => {
            actor.removeComponent(ColorCycleComponent);
            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('🔴 Color cycling disabled');
        this.updateUI();
    }

    enableGravityEffect(): void {
        this.effectsActive.add('gravity');

        // Add gravity to actors without movement components
        const actors = journeyState.scene.query()
            .withComponent(TransformComponent, RenderComponent)
            .execute(journeyState.scene)
            .filter(actor =>
                actor.label !== 'CanvasClearer' &&
                !actor.hasComponent(FastMovementComponent) &&
                !actor.hasComponent(SlowMovementComponent) &&
                !actor.hasComponent(GravityComponent)
            );

        actors.forEach(actor => {
            // Reset position to top for gravity effect
            const transform = actor.getComponent(TransformComponent);
            if (transform) {
                transform.y = Math.random() * 100 + 20; // Start from top
            }

            actor.addComponent(GravityComponent);
            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('⬇️ Gravity effect enabled');
        this.updateUI();
    }

    disableGravityEffect(): void {
        this.effectsActive.delete('gravity');

        // Remove gravity from all actors
        const actors = journeyState.scene.query().withComponent(GravityComponent).execute(journeyState.scene);
        actors.forEach(actor => {
            actor.removeComponent(GravityComponent);
            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('🚫 Gravity effect disabled');
        this.updateUI();
    }

    enablePulseEffect(): void {
        this.effectsActive.add('pulse');

        // Add pulse effect to actors
        const actors = journeyState.scene.query()
            .withComponent(TransformComponent, RenderComponent)
            .execute(journeyState.scene)
            .filter(actor =>
                actor.label !== 'CanvasClearer' &&
                !actor.hasComponent(PulseEffectComponent) &&
                !actor.hasComponent(AnimationComponent) // Don't conflict with existing animation
            );

        actors.forEach(actor => {
            actor.addComponent(PulseEffectComponent);
            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('💓 Pulse effect enabled');
        this.updateUI();
    }

    disablePulseEffect(): void {
        this.effectsActive.delete('pulse');

        // Remove pulse effect from all actors
        const actors = journeyState.scene.query().withComponent(PulseEffectComponent).execute(journeyState.scene);
        actors.forEach(actor => {
            actor.removeComponent(PulseEffectComponent);

            // Reset scale and size
            const transform = actor.getComponent(TransformComponent);
            const render = actor.getComponent(RenderComponent);
            if (transform) transform.scale = 1;
            if (render) render.size = 8;

            journeyState.scene.updateActorIndices(actor);
        });

        this.serviceCalls++;
        console.log('⭕ Pulse effect disabled');
        this.updateUI();
    }

    demonstrateCanvasService(): void {
        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        if (!canvasService) return;

        // Use canvas service to draw visual feedback
        const size = canvasService.getSize('step4-canvas');
        const ctx = canvasService.getContext('step4-canvas');

        if (ctx) {
            // Draw animated border using canvas service
            const time = performance.now() * 0.005;
            const brightness = Math.sin(time) * 0.5 + 0.5;

            ctx.strokeStyle = `rgba(74, 158, 255, ${brightness})`;
            ctx.lineWidth = 6;
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = time * 20;
            ctx.strokeRect(3, 3, size.width - 6, size.height - 6);

            setTimeout(() => {
                ctx.setLineDash([]);
                ctx.clearRect(0, 0, 10, size.height);
                ctx.clearRect(0, 0, size.width, 10);
                ctx.clearRect(size.width - 10, 0, 10, size.height);
                ctx.clearRect(0, size.height - 10, size.width, 10);
            }, 2000);
        }

        this.canvasServiceUsed = true;
        this.serviceCalls++;
        console.log('🎨 Canvas Service demonstration - animated border');
        this.updateUI();
    }

    demonstrateMouseService(): void {
        const mouseService = journeyState.serviceRegistry.resolve<IMouseService>(IMouseServiceKey);
        if (!mouseService) return;

        // Use mouse service to create visual effect at mouse position
        const pos = mouseService.getPosition('step4-canvas');
        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        const ctx = canvasService?.getContext('step4-canvas');

        if (ctx) {
            // Draw expanding circle at mouse position
            let radius = 5;
            const maxRadius = 50;

            const animate = () => {
                if (radius > maxRadius) return;

                ctx.strokeStyle = `rgba(255, 255, 68, ${1 - radius / maxRadius})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.stroke();

                radius += 2;
                requestAnimationFrame(animate);
            };

            animate();
        }

        this.mouseServiceUsed = true;
        this.serviceCalls++;
        console.log('🖱️ Mouse Service demonstration - click effect');
        this.updateUI();
    }

    demonstrateMultipleServices(): void {
        // Combine multiple services for a complex effect
        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        const mouseService = journeyState.serviceRegistry.resolve<IMouseService>(IMouseServiceKey);

        if (!canvasService || !mouseService) return;

        const ctx = canvasService.getContext('step4-canvas');
        const mousePos = mouseService.getPosition('step4-canvas');
        const size = canvasService.getSize('step4-canvas');

        if (ctx) {
            // Create ripple effect using both services
            const createRipple = (x: number, y: number, delay: number) => {
                setTimeout(() => {
                    let radius = 0;
                    const animate = () => {
                        if (radius > 100) return;

                        ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 - radius / 200})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.stroke();

                        radius += 3;
                        requestAnimationFrame(animate);
                    };
                    animate();
                }, delay);
            };

            // Create multiple ripples from mouse to corners
            createRipple(mousePos.x, mousePos.y, 0);
            createRipple(0, 0, 200);
            createRipple(size.width, 0, 400);
            createRipple(0, size.height, 600);
            createRipple(size.width, size.height, 800);
        }

        this.canvasServiceUsed = true;
        this.mouseServiceUsed = true;
        this.serviceCalls += 2;
        console.log('✨ Multi-Service demonstration - ripple effects');
        this.updateUI();
    }

    updateUI(): void {
        document.getElementById('step4-mouse-x')!.textContent = Math.round(this.mousePos.x).toString();
        document.getElementById('step4-mouse-y')!.textContent = Math.round(this.mousePos.y).toString();
        document.getElementById('step4-calls')!.textContent = this.serviceCalls.toString();
        document.getElementById('step4-services')!.textContent = this.getServicesUsedCount().toString();

        // Update button states
        this.updateButtonStates();
    }

    private updateButtonStates(): void {
        const buttons = document.querySelectorAll('#step4-controls .control-button');
        buttons.forEach(button => {
            const buttonElement = button as HTMLButtonElement;
            const onclick = buttonElement.getAttribute('onclick') || '';

            let isActive = false;
            if (onclick.includes('enableMouseAttraction') && this.effectsActive.has('attraction')) isActive = true;
            if (onclick.includes('enableColorCycling') && this.effectsActive.has('colors')) isActive = true;
            if (onclick.includes('enableGravityEffect') && this.effectsActive.has('gravity')) isActive = true;
            if (onclick.includes('enablePulseEffect') && this.effectsActive.has('pulse')) isActive = true;

            if (isActive) {
                buttonElement.classList.add('active');
            } else {
                buttonElement.classList.remove('active');
            }
        });
    }

    private getServicesUsedCount(): number {
        let count = 0;
        if (this.canvasServiceUsed) count++;
        if (this.mouseServiceUsed) count++;
        return count;
    }
}

class Step5 {
    private systemPaused = false;
    private fps = 0;
    private frameCount = 0;
    private lastFPSTime = performance.now();

    initialize(): void {
        setInterval(() => {
            const now = performance.now();
            const delta = (now - this.lastFPSTime) / 1000;
            this.fps = Math.round(this.frameCount / delta);
            this.frameCount = 0;
            this.lastFPSTime = now;
            this.updateUI();
        }, 1000);
    }

    startComplete(): void {
        journeyState.renderProcessor?.start(); // Handles rendering and fast movement
        journeyState.slowProcessor?.start(); // Handles slow movement
        journeyState.systemRunning = true;

        this.updateUI();
    }

    pauseSystem(): void {
        this.systemPaused = !this.systemPaused;

        if (this.systemPaused) {
            journeyState.renderProcessor?.stop();
            journeyState.slowProcessor?.stop();
        } else {
            journeyState.renderProcessor?.start();
            journeyState.slowProcessor?.start();
        }

        this.updateUI();
    }

    resetJourney(): void {
        // Stop all processors
        journeyState.renderProcessor?.stop();
        journeyState.slowProcessor?.stop();

        // Clear everything
        journeyState.scene.clear();
        journeyState.templates = [];
        journeyState.activeFilters = [];
        journeyState.highlightedActors.clear();
        journeyState.systemRunning = false;
        journeyState.mouseAttraction = false;

        // Clear Step 2 movement tracking
        if (journey.step2 && journey.step2.templateMovementTypes) {
            journey.step2.templateMovementTypes.clear();
        }

        // Update all UIs
        journey.step1.updateUI();
        journey.step2.updateUI();
        journey.step3.updateUI();
        journey.step4.updateUI();
        this.updateUI();
    }

    toggleLiveQuery(filter: string): void {
        const index = journeyState.activeFilters.indexOf(filter);
        if (index === -1) {
            journeyState.activeFilters.push(filter);
        } else {
            journeyState.activeFilters.splice(index, 1);
        }

        // Force UI update to reflect changes immediately
        this.updateUI();

        console.log(`Live query filter '${filter}' ${index === -1 ? 'enabled' : 'disabled'}`);
        console.log('Active filters:', journeyState.activeFilters);
    }

    updateUI(): void {
        const state = this.systemPaused ? 'Paused' : (journeyState.systemRunning ? 'Running' : 'Ready');
        document.getElementById('step5-state')!.textContent = state;
        document.getElementById('step5-fps')!.textContent = `${this.fps} FPS`;
        document.getElementById('step5-filters')!.textContent = journeyState.activeFilters.length.toString();

        // Calculate visible actors based on active filters
        let visibleActors = journeyState.scene.query().execute(journeyState.scene);

        if (journeyState.activeFilters.includes('red')) {
            visibleActors = visibleActors.filter(actor => actor.hasComponent(RedComponent));
        }
        if (journeyState.activeFilters.includes('fast')) {
            visibleActors = visibleActors.filter(actor => actor.hasComponent(FastMovementComponent));
        }
        if (journeyState.activeFilters.includes('animated')) {
            visibleActors = visibleActors.filter(actor => actor.hasComponent(AnimationComponent));
        }

        document.getElementById('step5-visible')!.textContent = visibleActors.length.toString();

        // Update button states to show active filters
        this.updateFilterButtonStates();
    }

    private updateFilterButtonStates(): void {
        // Update button visual states based on active filters
        const filterButtons = document.querySelectorAll('.step-controls button[onclick*="toggleLiveQuery"]');

        filterButtons.forEach(button => {
            const buttonElement = button as HTMLButtonElement;
            const buttonText = buttonElement.textContent || '';

            let isActive = false;
            if (buttonText.includes('Red') && journeyState.activeFilters.includes('red')) isActive = true;
            if (buttonText.includes('Fast') && journeyState.activeFilters.includes('fast')) isActive = true;
            if (buttonText.includes('Animated') && journeyState.activeFilters.includes('animated')) isActive = true;

            if (isActive) {
                buttonElement.classList.add('active');
            } else {
                buttonElement.classList.remove('active');
            }
        });
    }

    render(): void {
        this.frameCount++;

        // Rendering is handled automatically by the processor system through RenderComponent
        // This method is kept for FPS tracking and mouse attraction visualization

        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        if (!canvasService) return;

        // Draw mouse position if attraction is enabled
        const mouse = journeyState.serviceRegistry.resolve<IMouseService>(IMouseServiceKey);
        if (mouse && journeyState.mouseAttraction) {
            const ctx = canvasService.getContext('step5-canvas');
            const pos = mouse.getPosition('step5-canvas');

            if (ctx) {
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}

// ==================== Journey Controller ====================

class Journey {
    public step1 = new Step1();
    public step2 = new Step2();
    public step3 = new Step3();
    public step4 = new Step4();
    public step5 = new Step5();

    async initialize(): Promise<void> {
        // Create processors first
        journeyState.renderProcessor = new RenderProcessor(); // Default name "render" for @RenderUpdate()
        journeyState.slowProcessor = new FixedTickProcessor("fixedTick", 10); // 10 FPS for slow movement

        ProcessorRegistry.register(journeyState.renderProcessor);
        ProcessorRegistry.register(journeyState.slowProcessor);

        // Register services
        journeyState.serviceRegistry.register(ICanvasServiceKey, new CanvasService());
        journeyState.serviceRegistry.register(IMouseServiceKey, new MouseService());

        // Initialize services
        const canvasService = journeyState.serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        const mouseService = journeyState.serviceRegistry.resolve<IMouseService>(IMouseServiceKey);

        await canvasService?.initialize?.();
        await mouseService?.initialize?.();

        // Initialize steps
        this.step2.initialize();
        this.step4.initialize();
        this.step5.initialize();

        // Start the render processor for automatic rendering
        if (journeyState.renderProcessor) {
            journeyState.renderProcessor.start();
        }
        if (journeyState.slowProcessor) {
            journeyState.slowProcessor.start();
        }

        // Start render loops (now much simpler)
        this.startRenderLoops();

        // Initial UI update
        this.step1.updateUI();

        console.log('🚀 VertexLink ACS Journey initialized');
        console.log('🎨 Processor-based rendering active');
        console.log('🔧 Separate color components implemented');
        console.log('📊 Services: Canvas, Mouse');
    }

    private startRenderLoops(): void {
        // Rendering is handled by processors through RenderComponent
        // Add a simple render loop for Step 5 FPS tracking
        const step5RenderLoop = () => {
            this.step5.render();
            requestAnimationFrame(step5RenderLoop);
        };
        requestAnimationFrame(step5RenderLoop);

        console.log('🎨 Rendering handled by processor system');
    }
}

// ==================== Global Export ====================

const journey = new Journey();

// Make journey globally available
(window as any).journey = journey;

// Initialize the journey
journey.initialize().catch(console.error);