// Import necessary modules from the library
import Actor from "../src/core/Actor.ts";
import Component from "../src/core/component/Component.ts";
import System from "../src/core/System.ts";
import { ServiceRegistry, IService, ServiceKey } from "../src/core/Service.ts";
import { ProcessorRegistry } from "../src/core/processor/ProcessorRegistry.ts";
import { RenderProcessor, RenderUpdate } from "../src/engine/processors/RenderProcessor.ts";
import { FixedTickProcessor, FixedTickUpdate } from "../src/engine/processors/FixedTickProcessor.ts";

// Global service registry
const serviceRegistry = new ServiceRegistry();

// Service Keys
const ICanvasServiceKey = Symbol.for("ICanvasService");
const IMouseServiceKey = Symbol.for("IMouseService");

// Canvas Service Interface
interface ICanvasService extends IService {
    getContext(): CanvasRenderingContext2D;
    getCanvas(): HTMLCanvasElement;
    getWidth(): number;
    getHeight(): number;
    clear(): void;
}

// Canvas Service Implementation
class CanvasService implements ICanvasService {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;

    constructor() {
        this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    private handleResize(): void {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Fill with initial background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    getContext(): CanvasRenderingContext2D { return this.ctx; }
    getCanvas(): HTMLCanvasElement { return this.canvas; }
    getWidth(): number { return this.width; }
    getHeight(): number { return this.height; }

    clear(): void {
        // Very subtle fade for trail effect
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.02)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
}

// Mouse service
interface IMouseService extends IService {
    getX(): number;
    getY(): number;
}

class MouseService implements IMouseService {
    private x: number = 0;
    private y: number = 0;

    initialize(): void {
        const canvas = serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey)?.getCanvas();
        if (canvas) {
            canvas.addEventListener('mousemove', (e) => {
                this.x = e.clientX;
                this.y = e.clientY;
            });
        }
    }

    getX(): number { return this.x; }
    getY(): number { return this.y; }
}

// Simple Transform Component
class TransformComponent extends Component {
    public x: number = 0;
    public y: number = 0;
    public vx: number = 0;
    public vy: number = 0;

    constructor(actor: Actor, x: number, y: number) {
        super(actor);
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
    }
}

// Particle Component
class ParticleComponent extends Component {
    public size: number;
    public color: string;
    public lifetime: number = 1;
    private canvasService?: ICanvasService;

    constructor(actor: Actor, size: number = 5, color: string = '#ffffff') {
        super(actor);
        this.size = size;
        this.color = color;
    }

    initialize(): void {
        this.canvasService = serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
    }

    @FixedTickUpdate()
    updateLifetime(deltaTime: number): void {
        this.lifetime -= deltaTime * 0.2;
        if (this.lifetime <= 0) {
            // Schedule destruction after current update cycle
            setTimeout(() => this.actor.destroy(), 0);
        }
    }

    @RenderUpdate()
    render(deltaTime: number): void {
        if (!this.canvasService) return;

        // Use synchronous getComponent since we're in the same actor
        const transform = this.actor['components'][0] as TransformComponent;
        if (!transform) return;

        const ctx = this.canvasService.getContext();
        const opacity = Math.max(0, this.lifetime);

        // Draw particle
        ctx.globalAlpha = opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(transform.x, transform.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Physics Component
class PhysicsComponent extends Component {
    private canvasService?: ICanvasService;
    private mouseService?: IMouseService;

    initialize(): void {
        this.canvasService = serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
        this.mouseService = serviceRegistry.resolve<IMouseService>(IMouseServiceKey);
    }

    @FixedTickUpdate()
    update(deltaTime: number): void {
        if (!this.canvasService) return;

        const transform = this.actor['components'][0] as TransformComponent;
        if (!transform) return;

        // Mouse attraction
        if (this.mouseService) {
            const dx = this.mouseService.getX() - transform.x;
            const dy = this.mouseService.getY() - transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                const force = Math.min(50 / dist, 0.5);
                transform.vx += (dx / dist) * force;
                transform.vy += (dy / dist) * force;
            }
        }

        // Apply velocity
        transform.x += transform.vx;
        transform.y += transform.vy;

        // Damping
        transform.vx *= 0.98;
        transform.vy *= 0.98;

        // Bounce off walls
        const width = this.canvasService.getWidth();
        const height = this.canvasService.getHeight();

        if (transform.x < 0 || transform.x > width) {
            transform.vx *= -0.8;
            transform.x = Math.max(0, Math.min(width, transform.x));
        }

        if (transform.y < 0 || transform.y > height) {
            transform.vy *= -0.8;
            transform.y = Math.max(0, Math.min(height, transform.y));
        }
    }
}

// Background Component for clearing
class BackgroundComponent extends Component {
    private canvasService?: ICanvasService;

    initialize(): void {
        this.canvasService = serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey);
    }

    @RenderUpdate()
    clear(deltaTime: number): void {
        if (this.canvasService) {
            this.canvasService.clear();
        }
    }
}

// Register services
serviceRegistry.register(ICanvasServiceKey, new CanvasService());
serviceRegistry.register(IMouseServiceKey, new MouseService());

// Initialize services
const mouseService = serviceRegistry.resolve<IMouseService>(IMouseServiceKey);
mouseService?.initialize?.();

// Create and register processors
const renderProcessor = new RenderProcessor();
const fixedTickProcessor = new FixedTickProcessor("fixedTick", 60);

ProcessorRegistry.register(renderProcessor);
ProcessorRegistry.register(fixedTickProcessor);

// Create particle function
let particleId = 0;
function createParticle(x: number, y: number): void {
    const particle = new Actor(`particle-${particleId++}`);
    
    console.log(particle)
    
    // Generate random color
    const hue = Math.random() * 360;
    const color = `hsl(${hue}, 100%, 70%)`;

    particle.addComponent(TransformComponent, x, y);
    particle.addComponent(ParticleComponent, Math.random() * 3 + 2, color);
    particle.addComponent(PhysicsComponent);
}

// Setup the scene
async function setupScene() {
    // Create background actor first
    const background = new Actor("background");
    background.addComponent(BackgroundComponent);

    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    // Start processors
    renderProcessor.start();
    fixedTickProcessor.start();

    // Create initial particles
    const canvasService = serviceRegistry.resolve<ICanvasService>(ICanvasServiceKey)!;
    for (let i = 0; i < 300; i++) {
        createParticle(
            Math.random() * canvasService.getWidth(),
            Math.random() * canvasService.getHeight()
        );
    }

    // Mouse click handler
    canvasService.getCanvas().addEventListener('click', (e) => {
        for (let i = 0; i < 300; i++) {
            createParticle(
                e.clientX + (Math.random() - 0.5) * 20,
                e.clientY + (Math.random() - 0.5) * 20
            );
        }
    });

    // Update stats
    setInterval(() => {
        const particleCount = System.actors.filter(a => a.label.startsWith('particle-')).length;
        document.getElementById('particleCount')!.textContent = particleCount.toString();
    }, 100);

    // FPS counter
    let frameCount = 0;
    let lastTime = performance.now();
    function updateFPS() {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime - lastTime >= 1000) {
            document.getElementById('fps')!.textContent = frameCount.toString();
            frameCount = 0;
            lastTime = currentTime;
        }
        requestAnimationFrame(updateFPS);
    }
    updateFPS();
}

// Start the application
setupScene();