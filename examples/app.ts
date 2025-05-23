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

// Initialize service registry and logging
const serviceRegistry = new ServiceRegistry();
const loggingService = new ConsoleLoggingService(LogLevel.DEBUG);
serviceRegistry.register(ILoggingServiceKey, loggingService);

// Initialize processors
const renderProcessor = new RenderProcessor();
const fixedTickProcessor = new FixedTickProcessor("fixedTick", 60);
ProcessorRegistry.register(renderProcessor);
ProcessorRegistry.register(fixedTickProcessor);

// Start processors
renderProcessor.start();
fixedTickProcessor.start();

// --- Resources ---

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
    protected async performLoad(): Promise<void> {
        const logger = this.serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        logger.info(`Loading system configuration: ${this.name}`);

        // Simulate loading preset system configurations
        await new Promise(resolve => setTimeout(resolve, 500));

        this.data = {
            presets: [
                {
                    name: "Sol System",
                    starType: "G-Type",
                    age: 4.6,
                    planets: [
                        { name: "Mercury", radius: 8, color: "#8c7853", orbitRadius: 80, orbitSpeed: 0.8, type: "Terrestrial", temperature: 167, atmosphere: "None" },
                        { name: "Venus", radius: 12, color: "#ffc649", orbitRadius: 120, orbitSpeed: 0.6, type: "Terrestrial", temperature: 464, atmosphere: "CO2" },
                        { name: "Earth", radius: 13, color: "#4a90e2", orbitRadius: 180, orbitSpeed: 0.5, type: "Terrestrial", temperature: 15, atmosphere: "N2/O2" },
                        { name: "Mars", radius: 10, color: "#cd5c5c", orbitRadius: 240, orbitSpeed: 0.4, type: "Terrestrial", temperature: -65, atmosphere: "CO2" }
                    ]
                },
                {
                    name: "Kepler-452",
                    starType: "G-Type",
                    age: 6.0,
                    planets: [
                        { name: "Kepler-452b", radius: 16, color: "#6a9bd1", orbitRadius: 200, orbitSpeed: 0.3, type: "Super-Earth", temperature: 22, atmosphere: "Unknown" }
                    ]
                }
            ]
        };

        logger.info("System configuration loaded successfully");
    }

    protected async performUnload(): Promise<void> {
        const logger = this.serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        logger.debug("Unloading system configuration");
        this.data = null;
    }
}

class TextureResource extends Resource {
    protected async performLoad(): Promise<void> {
        const logger = this.serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        logger.info(`Loading texture: ${this.name}`);

        // Simulate texture loading
        await new Promise(resolve => setTimeout(resolve, 300));

        // Generate procedural planet textures
        this.data = {
            loaded: true,
            textureType: this.name
        };

        logger.debug(`Texture ${this.name} loaded`);
    }

    protected async performUnload(): Promise<void> {
        this.data = null;
    }
}

// --- Components ---

class ViewportComponent extends Component {
    private viewport: HTMLElement;
    private camera = { x: 0, y: 0, zoom: 1 };
    private isDragging = false;
    private lastMousePos = { x: 0, y: 0 };

    constructor(actor: Actor) {
        super(actor);
        this.viewport = document.getElementById('viewport')!;
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoom = Math.max(0.2, Math.min(3, this.camera.zoom * delta));
        });

        this.viewport.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.camera.x += e.clientX - this.lastMousePos.x;
                this.camera.y += e.clientY - this.lastMousePos.y;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    getCamera() {
        return this.camera;
    }
}

class StarComponent extends Component {
    private element: HTMLElement;
    private starType: number = 3;
    private logger: ILoggingService;
    private viewportActor: Actor | null = null;

    private starTypes = [
        { name: "M-Type", color: "#ff6b6b", temp: 3000, size: 60 },
        { name: "K-Type", color: "#ff9f1c", temp: 4500, size: 70 },
        { name: "G-Type", color: "#ffeb3b", temp: 5500, size: 80 },
        { name: "F-Type", color: "#fff3b0", temp: 6500, size: 90 },
        { name: "A-Type", color: "#ffffff", temp: 8000, size: 100 },
        { name: "B-Type", color: "#b0e0ff", temp: 15000, size: 120 },
        { name: "O-Type", color: "#9bb0ff", temp: 30000, size: 140 }
    ];

    constructor(actor: Actor) {
        super(actor);
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
    }

    setViewportActor(viewportActor: Actor) {
        this.viewportActor = viewportActor;
        this.createElement();
    }

    private createElement() {
        this.element = document.createElement('div');
        this.element.className = 'star';
        this.element.style.position = 'absolute';
        this.element.style.width = '80px';
        this.element.style.height = '80px';
        document.getElementById('viewport')!.appendChild(this.element);
        this.updateStarType(3);
    }

    updateStarType(type: number) {
        this.starType = type;
        const star = this.starTypes[type];
        this.element.style.width = `${star.size}px`;
        this.element.style.height = `${star.size}px`;
        this.element.style.background = `radial-gradient(circle, #fff, ${star.color})`;
        this.element.style.boxShadow = `0 0 ${star.size}px ${star.color}, 0 0 ${star.size * 2}px ${star.color}`;

        this.logger.info(`Star type changed to ${star.name} (${star.temp}K)`);
    }

    @RenderUpdate()
    update(deltaTime: number) {
        if (!this.viewportActor || !this.element) return;

        const viewport = this.viewportActor.getComponent(ViewportComponent);
        const camera = viewport.getCamera();

        // Position star at center of viewport with camera offset
        const x = window.innerWidth / 2 + camera.x;
        const y = window.innerHeight / 2 + camera.y;

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.transform = `translate(-50%, -50%) scale(${camera.zoom})`;

        // Pulse effect
        const intensity = Math.sin(Date.now() * 0.001) * 0.1 + 0.9;
        this.element.style.opacity = intensity.toString();
    }

    getStarInfo() {
        return this.starTypes[this.starType];
    }

    dispose() {
        if (this.element) {
            this.element.remove();
        }
    }
}

class PlanetComponent extends Component {
    private element: HTMLElement;
    private orbitElement: HTMLElement;
    public data: PlanetData;
    private angle = Math.random() * Math.PI * 2;
    private selected = false;
    private logger: ILoggingService;
    private viewportActor: Actor | null = null;

    constructor(actor: Actor) {
        super(actor);
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        // Data will be set via setData method after component is added
    }

    setData(data: PlanetData, viewportActor: Actor) {
        this.data = data;
        this.viewportActor = viewportActor;
        this.createElement();
        this.createOrbit();
    }

    private createElement() {
        this.element = document.createElement('div');
        this.element.className = 'planet';
        this.element.style.width = `${this.data.radius * 2}px`;
        this.element.style.height = `${this.data.radius * 2}px`;
        this.element.style.background = `radial-gradient(circle at 30% 30%, ${this.lightenColor(this.data.color)}, ${this.data.color})`;

        this.element.addEventListener('click', () => this.onSelect());

        document.getElementById('viewport')!.appendChild(this.element);
    }

    private createOrbit() {
        this.orbitElement = document.createElement('div');
        this.orbitElement.className = 'orbit';
        this.orbitElement.style.width = `${this.data.orbitRadius * 2}px`;
        this.orbitElement.style.height = `${this.data.orbitRadius * 2}px`;
        this.orbitElement.style.left = '50%';
        this.orbitElement.style.top = '50%';
        this.orbitElement.style.transform = 'translate(-50%, -50%)';

        document.getElementById('viewport')!.appendChild(this.orbitElement);
    }

    private lightenColor(color: string): string {
        const num = parseInt(color.slice(1), 16);
        const r = Math.min(255, (num >> 16) + 60);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + 60);
        const b = Math.min(255, (num & 0x0000FF) + 60);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    private onSelect() {
        this.selected = !this.selected;
        this.element.style.boxShadow = this.selected ?
            `0 0 40px ${this.data.color}, 0 0 60px ${this.data.color}` :
            '0 0 20px rgba(255, 255, 255, 0.3)';

        if (this.selected) {
            this.logger.info(`Selected planet: ${this.data.name}`);
            this.showPlanetInfo();
        }
    }

    private showPlanetInfo() {
        const infoPanel = document.getElementById('system-info')!;
        const info = document.createElement('div');
        info.className = 'info-item';
        info.innerHTML = `
            <strong>${this.data.name}</strong><br>
            Type: ${this.data.type}<br>
            Temperature: ${this.data.temperature}°C<br>
            Atmosphere: ${this.data.atmosphere}<br>
            Orbit Radius: ${this.data.orbitRadius} AU
        `;
        infoPanel.appendChild(info);

        // Remove old info after delay
        setTimeout(() => {
            if (infoPanel.contains(info)) {
                info.remove();
            }
        }, 10000);
    }

    @FixedTickUpdate()
    updateOrbit(deltaTime: number) {
        if (!this.viewportActor) return;

        const viewport = this.viewportActor.getComponent(ViewportComponent);
        const simSpeed = (window as any).simulationSpeed || 1;
        this.angle += (this.data.orbitSpeed * deltaTime * simSpeed) / this.data.orbitRadius;

        const camera = viewport.getCamera();
        const x = Math.cos(this.angle) * this.data.orbitRadius * camera.zoom + camera.x;
        const y = Math.sin(this.angle) * this.data.orbitRadius * camera.zoom + camera.y;

        this.element.style.left = `${window.innerWidth / 2 + x}px`;
        this.element.style.top = `${window.innerHeight / 2 + y}px`;
        this.element.style.transform = `translate(-50%, -50%) scale(${camera.zoom})`;

        this.orbitElement.style.transform = `translate(-50%, -50%) scale(${camera.zoom})`;
    }

    dispose() {
        this.element.remove();
        this.orbitElement.remove();
    }
}

class SystemGeneratorComponent extends Component {
    private starActor: Actor | null = null;
    private planetActors: Actor[] = [];
    private logger: ILoggingService;
    private systemConfig: SystemConfigResource;
    private currentSystem: SystemData | null = null;
    private viewportActor: Actor | null = null;

    constructor(actor: Actor) {
        super(actor);
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;
        this.systemConfig = new SystemConfigResource("SystemPresets", serviceRegistry);
    }

    setViewportActor(viewportActor: Actor) {
        this.viewportActor = viewportActor;
        this.setupControls();
        this.loadResources();
    }

    private async loadResources() {
        this.logger.info("Loading system resources...");
        updateResourceStatus("SystemPresets", ResourceStatus.LOADING);

        try {
            await this.systemConfig.load();
            updateResourceStatus("SystemPresets", ResourceStatus.LOADED);

            // Load texture resources
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

    private setupControls() {
        document.getElementById('generate-btn')!.addEventListener('click', () => this.generateSystem());
        document.getElementById('save-btn')!.addEventListener('click', () => this.saveSystem());
        document.getElementById('load-btn')!.addEventListener('click', () => this.loadSystem());

        // Setup sliders
        const starTypeSlider = document.getElementById('star-type') as HTMLInputElement;
        starTypeSlider.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value);
            const types = ["M-Type", "K-Type", "G-Type", "F-Type", "A-Type", "B-Type", "O-Type"];
            document.getElementById('star-type-display')!.textContent = types[value];
        });

        const planetCountSlider = document.getElementById('planet-count') as HTMLInputElement;
        planetCountSlider.addEventListener('input', (e) => {
            document.getElementById('planet-count-display')!.textContent = (e.target as HTMLInputElement).value;
        });

        const ageSlider = document.getElementById('system-age') as HTMLInputElement;
        ageSlider.addEventListener('input', (e) => {
            document.getElementById('system-age-display')!.textContent = (e.target as HTMLInputElement).value;
        });

        const speedSlider = document.getElementById('sim-speed') as HTMLInputElement;
        speedSlider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            (window as any).simulationSpeed = value;
            document.getElementById('sim-speed-display')!.textContent = `${value}x`;
        });
    }

    private clearSystem() {
        this.logger.debug("Clearing current system");

        // Destroy star actor
        if (this.starActor) {
            this.starActor.destroy();
            this.starActor = null;
        }

        // Destroy all planet actors
        for (const planetActor of this.planetActors) {
            planetActor.destroy();
        }
        this.planetActors = [];

        // Clear info panel
        document.getElementById('system-info')!.innerHTML = '';
    }

    generateSystem() {
        this.clearSystem();

        const starType = parseInt((document.getElementById('star-type') as HTMLInputElement).value);
        const planetCount = parseInt((document.getElementById('planet-count') as HTMLInputElement).value);
        const systemAge = parseFloat((document.getElementById('system-age') as HTMLInputElement).value);

        this.logger.info(`Generating new system: ${planetCount} planets, age ${systemAge} billion years`);

        // Create star
        this.starActor = new Actor('Star');
        this.starActor.addComponent('star', StarComponent);
        const starComponent = this.starActor.getComponent(StarComponent);
        starComponent.setViewportActor(this.viewportActor!);
        starComponent.updateStarType(starType);

        // Generate planets
        const planetTypes = ["Terrestrial", "Gas Giant", "Ice Giant", "Super-Earth", "Mini-Neptune"];
        const atmospheres = ["None", "CO2", "N2/O2", "H2/He", "CH4", "NH3"];

        const planetsData: PlanetData[] = [];

        for (let i = 0; i < planetCount; i++) {
            const planetData: PlanetData = {
                name: `Planet ${String.fromCharCode(65 + i)}`,
                radius: 8 + Math.random() * 20,
                color: this.generatePlanetColor(i, planetCount),
                orbitRadius: 100 + i * 80 + Math.random() * 40,
                orbitSpeed: 0.5 + Math.random() * 0.5,
                type: planetTypes[Math.floor(Math.random() * planetTypes.length)],
                temperature: Math.round(300 - i * 50 + Math.random() * 100),
                atmosphere: atmospheres[Math.floor(Math.random() * atmospheres.length)]
            };

            planetsData.push(planetData);

            const planetActor = new Actor(`Planet_${i}`);
            planetActor.addComponent('planet', PlanetComponent);

            // Get the component and set its data
            const planetComponent = planetActor.getComponent(PlanetComponent);
            planetComponent.setData(planetData, this.viewportActor!);

            this.planetActors.push(planetActor);
        }

        // Store current system
        this.currentSystem = {
            name: `System_${Date.now()}`,
            starType: starComponent.getStarInfo().name,
            age: systemAge,
            planets: planetsData
        };

        this.logger.info("System generation complete");
        this.displaySystemInfo();
    }

    private generatePlanetColor(index: number, total: number): string {
        const hue = (index / total) * 360;
        const saturation = 40 + Math.random() * 40;
        const lightness = 40 + Math.random() * 30;
        return this.hslToHex(hue, saturation, lightness);
    }

    private hslToHex(h: number, s: number, l: number): string {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    private displaySystemInfo() {
        if (!this.currentSystem) return;

        const infoPanel = document.getElementById('system-info')!;
        infoPanel.innerHTML = `
            <div class="info-item">
                <strong>System Overview</strong><br>
                Star Type: ${this.currentSystem.starType}<br>
                Age: ${this.currentSystem.age} billion years<br>
                Planets: ${this.currentSystem.planets.length}
            </div>
        `;
    }

    private saveSystem() {
        if (!this.currentSystem) {
            this.logger.warn("No system to save");
            return;
        }

        const systemData = JSON.stringify(this.currentSystem);
        localStorage.setItem('savedSystem', systemData);
        this.logger.info("System saved successfully");

        // Visual feedback
        const saveBtn = document.getElementById('save-btn')!;
        saveBtn.textContent = "Saved!";
        setTimeout(() => {
            saveBtn.textContent = "Save System";
        }, 2000);
    }

    private loadSystem() {
        const savedData = localStorage.getItem('savedSystem');
        if (!savedData) {
            this.logger.warn("No saved system found");
            return;
        }

        try {
            const system = JSON.parse(savedData) as SystemData;
            this.logger.info(`Loading saved system: ${system.name}`);

            // Clear current system
            this.clearSystem();

            // Create star
            this.starActor = new Actor('Star');
            this.starActor.addComponent('star', StarComponent);
            const starComponent = this.starActor.getComponent(StarComponent);
            starComponent.setViewportActor(this.viewportActor!);
            const starTypeIndex = ["M-Type", "K-Type", "G-Type", "F-Type", "A-Type", "B-Type", "O-Type"]
                .indexOf(system.starType);
            starComponent.updateStarType(starTypeIndex >= 0 ? starTypeIndex : 3);

            // Recreate planets
            system.planets.forEach((planetData, i) => {
                const planetActor = new Actor(`Planet_${i}`);
                planetActor.addComponent('planet', PlanetComponent);

                // Get the component and set its data
                const planetComponent = planetActor.getComponent(PlanetComponent);
                planetComponent.setData(planetData, this.viewportActor!);

                this.planetActors.push(planetActor);
            });

            this.currentSystem = system;
            this.displaySystemInfo();
            this.logger.info("System loaded successfully");

        } catch (error) {
            this.logger.error("Failed to load system", error);
        }
    }
}

// UI Logger Component
class UILoggerComponent extends Component {
    private logElement: HTMLElement;
    private logger: ILoggingService;

    constructor(actor: Actor) {
        super(actor);
        this.logElement = document.getElementById('log-content')!;
        this.logger = serviceRegistry.resolve<ILoggingService>(ILoggingServiceKey)!;

        // Override console methods to capture logs
        this.interceptLogs();
    }

    private interceptLogs() {
        const originalMethods = {
            debug: console.debug,
            info: console.info,
            warn: console.warn,
            error: console.error
        };

        console.debug = (...args) => {
            originalMethods.debug.apply(console, args);
            this.addLogEntry('DEBUG', args.join(' '));
        };

        console.info = (...args) => {
            originalMethods.info.apply(console, args);
            this.addLogEntry('INFO', args.join(' '));
        };

        console.warn = (...args) => {
            originalMethods.warn.apply(console, args);
            this.addLogEntry('WARN', args.join(' '));
        };

        console.error = (...args) => {
            originalMethods.error.apply(console, args);
            this.addLogEntry('ERROR', args.join(' '));
        };
    }

    private addLogEntry(level: string, message: string) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${level}`;
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] [${level}] ${message}`;

        this.logElement.insertBefore(entry, this.logElement.firstChild);

        // Keep only last 20 entries
        while (this.logElement.children.length > 20) {
            this.logElement.removeChild(this.logElement.lastChild!);
        }
    }
}

// Stats Monitor Component
class StatsMonitorComponent extends Component {
    private frameCount = 0;
    private lastTime = performance.now();

    @RenderUpdate()
    updateStats(deltaTime: number) {
        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastTime >= 1000) {
            document.getElementById('fps')!.textContent = this.frameCount.toString();
            document.getElementById('actors')!.textContent = System.actors.length.toString();
            document.getElementById('processors')!.textContent = ProcessorRegistry.getAll()
                .filter(p => p.isRunning).length.toString();

            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }
}

// Background Stars Component
class BackgroundStarsComponent extends Component {
    private stars: HTMLElement[] = [];

    constructor(actor: Actor) {
        super(actor);
        this.createStars();
    }

    private createStars() {
        const viewport = document.getElementById('viewport')!;

        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.style.position = 'absolute';
            star.style.width = '2px';
            star.style.height = '2px';
            star.style.background = '#fff';
            star.style.borderRadius = '50%';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.opacity = `${Math.random() * 0.8 + 0.2}`;
            viewport.appendChild(star);
            this.stars.push(star);
        }
    }

    @RenderUpdate()
    twinkle(deltaTime: number) {
        this.stars.forEach((star, i) => {
            const opacity = Math.sin(Date.now() * 0.001 + i) * 0.3 + 0.5;
            star.style.opacity = opacity.toString();
        });
    }

    dispose() {
        this.stars.forEach(star => star.remove());
    }
}

// Helper function to update resource status in UI
function updateResourceStatus(name: string, status: ResourceStatus) {
    const resourceList = document.getElementById('resource-list')!;
    let statusElement = document.getElementById(`resource-${name}`);

    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = `resource-${name}`;
        resourceList.appendChild(statusElement);
    }

    const statusText = ResourceStatus[status];
    const statusClass = status === ResourceStatus.LOADED ? 'loaded' :
        status === ResourceStatus.LOADING ? 'loading' : 'failed';

    statusElement.className = statusClass;
    statusElement.textContent = `${name}: ${statusText}`;
}

// --- Initialize the system ---

const system = new System();

// Initialize simulation speed
(window as any).simulationSpeed = 1;

// Create core actors
const viewportActor = new Actor('Viewport');
viewportActor.addComponent('viewport', ViewportComponent);
viewportActor.addComponent('backgroundStars', BackgroundStarsComponent);

const systemActor = new Actor('SystemGenerator');
systemActor.addComponent('generator', SystemGeneratorComponent);

// Get the generator component and set the viewport actor
const generatorComponent = systemActor.getComponent(SystemGeneratorComponent);
generatorComponent.setViewportActor(viewportActor);

const uiActor = new Actor('UI');
uiActor.addComponent('logger', UILoggerComponent);
uiActor.addComponent('stats', StatsMonitorComponent);

// Log initial system state
loggingService.info('NASA Deep Space Survey System initialized');
loggingService.info(`Framework: ${System.actors.length} actors, ${ProcessorRegistry.getAll().length} processors`);
loggingService.debug('Viewport controls: Mouse drag to pan, scroll to zoom');
loggingService.debug('Click planets to view details');