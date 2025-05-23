// examples/app.ts

// IMPORTANT: reflect-metadata must be the first import
import {ServiceRegistry} from "../src/core/Service.ts";
import {
    ConsoleLoggingService,
    ILoggingService,
    ILoggingServiceKey,
    LogLevel
} from "../src/engine/services/LoggingService.ts";
import {RenderProcessor, RenderUpdate} from "../src/engine/processors/RenderProcessor.ts";
import {ProcessorRegistry} from "../src/core/processor/ProcessorRegistry.ts";
import Component from "../src/core/Component.ts";
import System from "../src/core/System.ts";
import Actor from "../src/core/Actor.ts";
import {FixedTickProcessor, FixedTickUpdate} from "../src/engine/processors/FixedTickProcessor.ts";
import {Resource, ResourceStatus} from "../src/core/Resource.ts";


// --- Interfaces & Resources (Mostly unchanged) ---

interface PlanetData {
    name: string;
    radius: number;
    color: string;
    orbitRadius: number;
    orbitSpeed: number;
    type: string;
    temperature: number;
    atmosphere: string;
}

interface SystemData {
    name: string;
    starType: string;
    age: number;
    planets: PlanetData[];
}

class SystemConfigResource extends Resource {
    // ... (Keep implementation from original app.ts)
    protected async performLoad(): Promise<void> {
        const logger = this.serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        logger.info(`Loading system configuration: ${this.name}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        this.data = { /* ... (preset data) ... */ };
        logger.info("System configuration loaded successfully");
    }
    protected async performUnload(): Promise<void> { /* ... */ }
}

class TextureResource extends Resource {
    // ... (Keep implementation from original app.ts)
    protected async performLoad(): Promise<void> {
        const logger = this.serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        logger.info(`Loading texture: ${this.name}`);
        await new Promise(resolve => setTimeout(resolve, 300));
        this.data = { loaded: true, textureType: this.name };
        logger.debug(`Texture ${this.name} loaded`);
    }
    protected async performUnload(): Promise<void> { this.data = null; }
}

// --- Service & Processor Setup (Unchanged) ---
const serviceRegistry = new ServiceRegistry();
const loggingService = new ConsoleLoggingService(LogLevel.DEBUG);
serviceRegistry.register(ILoggingServiceKey, loggingService); //

const renderProcessor = new RenderProcessor();
const fixedTickProcessor = new FixedTickProcessor("fixedTick", 60);
ProcessorRegistry.register(renderProcessor); //
ProcessorRegistry.register(fixedTickProcessor); //
renderProcessor.start(); //
fixedTickProcessor.start(); //

// --- Reusable Utility Components ---

class ViewportComponent extends Component {
    // ... (Keep implementation from original app.ts)
    private viewport: HTMLElement;
    private camera = { x: 0, y: 0, zoom: 1 };
    private isDragging = false;
    private lastMousePos = { x: 0, y: 0 };

    constructor(actor: Actor) {
        super(actor);
        this.viewport = document.getElementById('viewport')!;
        this.setupEventHandlers();
    }
    private setupEventHandlers() { /* ... */ }
    public getCamera() { return this.camera; }
}

class BackgroundStarsComponent extends Component {
    // ... (Keep implementation from original app.ts)
    private stars: HTMLElement[] = [];
    constructor(actor: Actor) { super(actor); this.createStars(); }
    private createStars() { /* ... */ }
    @RenderUpdate() twinkle(deltaTime: number) { /* ... */ }
    dispose() { this.stars.forEach(star => star.remove()); }
}

class UILoggerComponent extends Component {
    // ... (Keep implementation from original app.ts)
    private logElement: HTMLElement;
    private logger: ILoggingService;
    constructor(actor: Actor) { super(actor); this.logElement = document.getElementById('log-content')!; this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!; this.interceptLogs(); }
    private interceptLogs() { /* ... */ }
    private addLogEntry(level: string, message: string) { /* ... */ }
}

class StatsMonitorComponent extends Component {
    // ... (Keep implementation from original app.ts)
    private frameCount = 0;
    private lastTime = performance.now();
    @RenderUpdate() updateStats(deltaTime: number) { /* ... */ }
}

// --- Specialized Components ---

class StarRendererComponent extends Component {
    private element: HTMLElement;
    private logger: ILoggingService;
    private viewport: ViewportComponent;
    private initializedStyle: boolean = false;
    
    private starTypes = [ //
        { name: "M-Type", color: "#ff6b6b", temp: 3000, size: 60 },
        { name: "K-Type", color: "#ff9f1c", temp: 4500, size: 70 },
        { name: "G-Type", color: "#ffeb3b", temp: 5500, size: 80 },
        { name: "F-Type", color: "#fff3b0", temp: 6500, size: 90 },
        { name: "A-Type", color: "#ffffff", temp: 8000, size: 100 },
        { name: "B-Type", color: "#b0e0ff", temp: 15000, size: 120 },
        { name: "O-Type", color: "#9bb0ff", temp: 30000, size: 140 }
    ];

    constructor(actor: StarActor, viewportActor: Actor) {
        super(actor);
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        this.viewport = viewportActor.getComponent(ViewportComponent);
        this.element = document.createElement('div');
        this.element.className = 'star';
        document.getElementById('viewport')!.appendChild(this.element);
        // this.updateStyle();
    }

    public updateStyle() {
        const starActor = this.actor as StarActor;
        // Add a check to ensure starTypeIndex is available
        if (starActor.starTypeIndex === undefined || starActor.starTypeIndex === null) {
            this.logger.debug("StarRendererComponent: StarActor index not ready, deferring style update.");
            return; // Not ready yet
        }
        const star = this.starTypes[starActor.starTypeIndex];
        if (!star) {
            this.logger.error(`StarRendererComponent: Invalid starTypeIndex: ${starActor.starTypeIndex}`);
            return;
        }

        this.element.style.width = `${star.size}px`;
        this.element.style.height = `${star.size}px`;
        this.element.style.background = `radial-gradient(circle, #fff, ${star.color})`;
        this.element.style.boxShadow = `0 0 ${star.size}px ${star.color}, 0 0 ${star.size * 2}px ${star.color}`;
        this.initializedStyle = true; // Mark as initialized
        this.logger.info(`Star style updated to ${star.name}`);
    }

    @RenderUpdate()
    update() {
        // Ensure style is set once after StarActor constructor finishes
        if (!this.initializedStyle) {
            this.updateStyle();
        }
        // If style couldn't be set (e.g., index wasn't ready), try again next frame.
        if (!this.initializedStyle) return;
        
        const camera = this.viewport.getCamera();
        const x = window.innerWidth / 2 + camera.x;
        const y = window.innerHeight / 2 + camera.y;

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.transform = `translate(-50%, -50%) scale(${camera.zoom})`;
        this.element.style.opacity = (Math.sin(Date.now() * 0.001) * 0.1 + 0.9).toString(); //
    }

    public getStarInfo() {
        const starActor = this.actor as StarActor;
        // Add a check here too for safety
        if (starActor.starTypeIndex === undefined || starActor.starTypeIndex === null) {
            return { name: "Initializing...", color: "#ccc", temp: 0, size: 80 }; // Return default/loading state
        }
        return this.starTypes[starActor.starTypeIndex];
    }

    dispose() {
        this.element.remove();
    }
}

class PlanetRendererComponent extends Component {
    private element: HTMLElement;
    private orbitElement: HTMLElement;
    private logger: ILoggingService;
    private viewport: ViewportComponent;
    private planetActor: PlanetActor; // Store a typed reference

    constructor(actor: PlanetActor, viewportActor: Actor) { // Expect PlanetActor
        super(actor);
        this.planetActor = actor; // Keep reference
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        this.viewport = viewportActor.getComponent(ViewportComponent);
        this.createElement();
        this.createOrbit();
    }

    private lightenColor = (color: string): string => { //
        const num = parseInt(color.slice(1), 16);
        const r = Math.min(255, (num >> 16) + 60);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + 60);
        const b = Math.min(255, (num & 0x0000FF) + 60);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    private createElement() {
        this.element = document.createElement('div');
        this.element.className = 'planet';
        this.element.style.width = `${this.planetActor.data.radius * 2}px`; //
        this.element.style.height = `${this.planetActor.data.radius * 2}px`; //
        this.element.style.background = `radial-gradient(circle at 30% 30%, ${this.lightenColor(this.planetActor.data.color)}, ${this.planetActor.data.color})`; //
        this.element.addEventListener('click', () => this.onSelect());
        document.getElementById('viewport')!.appendChild(this.element);
    }

    private createOrbit() {
        this.orbitElement = document.createElement('div');
        this.orbitElement.className = 'orbit';
        this.orbitElement.style.width = `${this.planetActor.data.orbitRadius * 2}px`; //
        this.orbitElement.style.height = `${this.planetActor.data.orbitRadius * 2}px`; //
        this.orbitElement.style.left = '50%'; //
        this.orbitElement.style.top = '50%'; //
        this.orbitElement.style.transform = 'translate(-50%, -50%)'; //
        document.getElementById('viewport')!.appendChild(this.orbitElement);
    }

    private onSelect() {
        this.planetActor.selected = !this.planetActor.selected;
        this.element.style.boxShadow = this.planetActor.selected
            ? `0 0 40px ${this.planetActor.data.color}, 0 0 60px ${this.planetActor.data.color}`
            : '0 0 20px rgba(255, 255, 255, 0.3)';

        if (this.planetActor.selected) {
            this.logger.info(`Selected planet: ${this.planetActor.data.name}`); //
            this.showPlanetInfo();
        }
    }

    private showPlanetInfo() { //
        const infoPanel = document.getElementById('system-info')!;
        const info = document.createElement('div');
        info.className = 'info-item';
        info.innerHTML = `
            <strong>${this.planetActor.data.name}</strong><br>
            Type: ${this.planetActor.data.type}<br>
            Temperature: ${this.planetActor.data.temperature}°C<br>
            Atmosphere: ${this.planetActor.data.atmosphere}<br>
            Orbit Radius: ${this.planetActor.data.orbitRadius} AU
        `;
        infoPanel.appendChild(info);
        setTimeout(() => info.remove(), 10000);
    }

    @RenderUpdate()
    updatePosition() {
        const camera = this.viewport.getCamera();
        const { x, y } = this.planetActor; // Get position from Actor

        this.element.style.left = `${window.innerWidth / 2 + x * camera.zoom + camera.x}px`;
        this.element.style.top = `${window.innerHeight / 2 + y * camera.zoom + camera.y}px`;
        this.element.style.transform = `translate(-50%, -50%) scale(${camera.zoom})`;
        this.orbitElement.style.transform = `translate(-50%, -50%) scale(${camera.zoom})`;
    }

    dispose() {
        this.element.remove();
        this.orbitElement.remove();
    }
}


// --- Specialized Actors ---

class StarActor extends Actor {
    public starTypeIndex: number;
    private viewportActor: Actor;

    constructor(label: string, starTypeIndex: number, viewportActor: Actor) {
        super(label);
        this.starTypeIndex = starTypeIndex; // Set index BEFORE initialize runs
        this.viewportActor = viewportActor;
        // Now call initialize. Since initialize calls addComponent, which
        // now *doesn't* call updateStyle, this is safer.
        this.initialize();
        // Manually trigger the first style update IF the component exists.
        try {
            this.getComponent(StarRendererComponent).updateStyle();
        } catch(e) {
            console.error("Could not set initial star style. Will try on next frame.", e);
        }
    }

    protected initialize(): void {
        this.addComponent('renderer', StarRendererComponent, this.viewportActor);
    }

    public updateStarType(typeIndex: number) {
        this.starTypeIndex = typeIndex;
        // Ensure component exists before updating its style
        if (this.hasComponent(StarRendererComponent)) {
            this.getComponent(StarRendererComponent).updateStyle();
        }
    }

    public getStarInfo() {
        return this.getComponent(StarRendererComponent).getStarInfo();
    }
}

class PlanetActor extends Actor {
    public data: PlanetData;
    public angle: number;
    public x: number = 0;
    public y: number = 0;
    public selected: boolean = false;
    private viewportActor: Actor;

    constructor(label: string, data: PlanetData, viewportActor: Actor) {
        super(label);
        this.data = data;
        this.angle = Math.random() * Math.PI * 2;
        this.viewportActor = viewportActor;
        this.initialize();
    }

    protected initialize(): void {
        this.addComponent('renderer', PlanetRendererComponent, this.viewportActor);
        this.updateOrbit(0); // Set initial position
    }

    @FixedTickUpdate()
    updateOrbit(deltaTime: number) {
        const simSpeed = (window as any).simulationSpeed || 1;
        this.angle += (this.data.orbitSpeed * deltaTime * simSpeed) / this.data.orbitRadius;
        this.x = Math.cos(this.angle) * this.data.orbitRadius;
        this.y = Math.sin(this.angle) * this.data.orbitRadius;
        // console.log(`Planet <span class="math-inline">${this.data.name}: angle=</span>${this.angle.toFixed(2)}, x=<span class="math-inline">${this.x.toFixed(2)}, y=</span>${this.y.toFixed(2)}, orbitRadius=<span class="math-inline">${this.data.orbitRadius}, orbitSpeed\=</span>{this.data.orbitSpeed}`);
    }
}

class SystemManagerActor extends Actor {
    private starActor: StarActor | null = null;
    private planetActors: PlanetActor[] = [];
    private logger: ILoggingService;
    private systemConfig: SystemConfigResource;
    private currentSystem: SystemData | null = null;
    private viewportActor: Actor;

    constructor(label: string, viewportActor: Actor) {
        super(label);
        this.viewportActor = viewportActor;
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        this.systemConfig = new SystemConfigResource("SystemPresets", serviceRegistry); //
        this.setupControls();
        this.loadResources();
    }

    private async loadResources() {
        // ... (Keep implementation from original app.ts, but call updateResourceStatus)
        this.logger.info("Loading system resources...");
        updateResourceStatus("SystemPresets", ResourceStatus.LOADING);

        try {
            await this.systemConfig.load();
            updateResourceStatus("SystemPresets", ResourceStatus.LOADED);

            const textures = ["RockyPlanet", "GasGiant", "IcePlanet"];
            for (const textureName of textures) {
                const texture = new TextureResource(textureName, serviceRegistry);
                updateResourceStatus(textureName, ResourceStatus.LOADING);
                await texture.load();
                updateResourceStatus(textureName, ResourceStatus.LOADED);
            }

            this.logger.info("All resources loaded successfully");
            this.generateSystem();
        } catch (error) {
            this.logger.error("Failed to load resources", error);
            updateResourceStatus("SystemPresets", ResourceStatus.FAILED_TO_LOAD);
        }
    }

    private setupControls() { //
        document.getElementById('generate-btn')!.addEventListener('click', () => this.generateSystem());
        document.getElementById('save-btn')!.addEventListener('click', () => this.saveSystem());
        document.getElementById('load-btn')!.addEventListener('click', () => this.loadSystem());
        // Setup sliders...
        const starTypeSlider = document.getElementById('star-type') as HTMLInputElement;
        starTypeSlider.addEventListener('input', (e) => { /* ... */ });
        const planetCountSlider = document.getElementById('planet-count') as HTMLInputElement;
        planetCountSlider.addEventListener('input', (e) => { /* ... */ });
        const ageSlider = document.getElementById('system-age') as HTMLInputElement;
        ageSlider.addEventListener('input', (e) => { /* ... */ });
        const speedSlider = document.getElementById('sim-speed') as HTMLInputElement;
        speedSlider.addEventListener('input', (e) => { /* ... */ });
    }

    private clearSystem() {
        this.logger.debug("Clearing current system");
        this.starActor?.destroy();
        this.starActor = null;
        this.planetActors.forEach(p => p.destroy());
        this.planetActors = [];
        document.getElementById('system-info')!.innerHTML = '';
    }

    generateSystem() {
        this.clearSystem();

        const starType = parseInt((document.getElementById('star-type') as HTMLInputElement).value);
        const planetCount = parseInt((document.getElementById('planet-count') as HTMLInputElement).value);
        const systemAge = parseFloat((document.getElementById('system-age') as HTMLInputElement).value);
        this.logger.info(`Generating new system: ${planetCount} planets, age ${systemAge} billion years`);

        // Create star actor
        this.starActor = new StarActor('Star', starType, this.viewportActor);

        const planetsData: PlanetData[] = [];
        const planetTypes = ["Terrestrial", "Gas Giant", "Ice Giant", "Super-Earth", "Mini-Neptune"];
        const atmospheres = ["None", "CO2", "N2/O2", "H2/He", "CH4", "NH3"];

        for (let i = 0; i < planetCount; i++) {
            const data: PlanetData = {
                name: `Planet ${String.fromCharCode(65 + i)}`,
                radius: 8 + Math.random() * 20,
                color: this.generatePlanetColor(i, planetCount),
                orbitRadius: 100 + i * 80 + Math.random() * 40,
                orbitSpeed: 0.5 + Math.random() * 0.5,
                type: planetTypes[Math.floor(Math.random() * planetTypes.length)],
                temperature: Math.round(300 - i * 50 + Math.random() * 100),
                atmosphere: atmospheres[Math.floor(Math.random() * atmospheres.length)]
            };
            planetsData.push(data);
            // Create planet actor
            this.planetActors.push(new PlanetActor(`Planet_${i}`, data, this.viewportActor));
        }

        this.currentSystem = {
            name: `System_${Date.now()}`,
            starType: this.starActor.getStarInfo().name,
            age: systemAge,
            planets: planetsData
        };

        this.logger.info("System generation complete");
        this.displaySystemInfo();
    }

    private generatePlanetColor = (index: number, total: number): string => { /* ... */ return this.hslToHex( (index / total) * 360, 40 + Math.random() * 40, 40 + Math.random() * 30); } //
    private hslToHex = (h: number, s: number, l: number): string => { /* ... */  l /= 100; const a = s * Math.min(l, 1 - l) / 100; const f = (n: number) => { const k = (n + h / 30) % 12; const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * color).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; } //
    private displaySystemInfo() { /* ... */ } //
    private saveSystem() { /* ... */ } //
    private loadSystem() { /* ... */ } //
}


// --- Helper function (Unchanged) ---
function updateResourceStatus(name: string, status: ResourceStatus) {
    // ... (Keep implementation from original app.ts)
    const resourceList = document.getElementById('resource-list')!;
    let statusElement = document.getElementById(`resource-${name}`);
    if (!statusElement) { statusElement = document.createElement('div'); statusElement.id = `resource-${name}`; resourceList.appendChild(statusElement); }
    const statusText = ResourceStatus[status];
    const statusClass = status === ResourceStatus.LOADED ? 'loaded' : status === ResourceStatus.LOADING ? 'loading' : 'failed';
    statusElement.className = statusClass;
    statusElement.textContent = `${name}: ${statusText}`;
}

// --- Initialize the system ---

const system = new System(); //

// Initialize simulation speed
(window as any).simulationSpeed = 1; //

// Create core actors using new subclasses
const viewportActor = new Actor('Viewport'); // Keep as base or make ViewportManagerActor
viewportActor.addComponent('viewport', ViewportComponent); //
viewportActor.addComponent('backgroundStars', BackgroundStarsComponent); //

// Create the System Manager Actor - It now handles generation.
const systemManager = new SystemManagerActor('SystemManager', viewportActor);

const uiActor = new Actor('UI'); // Keep as base or make UIManagerActor
uiActor.addComponent('logger', UILoggerComponent); //
uiActor.addComponent('stats', StatsMonitorComponent); //

// Log initial system state
loggingService.info('NASA Deep Space Survey System initialized (Refactored)'); //
loggingService.info(`Framework: ${System.actors.length} actors, ${ProcessorRegistry.getAll().length} processors`); //
loggingService.debug('Viewport controls: Mouse drag to pan, scroll to zoom'); //
loggingService.debug('Click planets to view details'); //