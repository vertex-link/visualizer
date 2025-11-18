import { Engine } from "@vertex-link/engine";
import { Scene, Actor, Component } from "@vertex-link/space";
import { TransformComponent, MeshRendererComponent, CameraComponent } from "@vertex-link/engine";
import { ClusteredLightingResource, Light, LightType } from "@vertex-link/engine";
// @ts-ignore - WASM module
import clusteredLightingWasm from "@vertex-link/engine/compute/clustered-lighting.zig";
import shaderSource from "./shader.wgsl";

class LightAnimationComponent extends Component {
  private time = 0;
  private speed: number;
  private radius: number;
  private offset: [number, number, number];

  constructor(speed: number, radius: number, offset: [number, number, number]) {
    super();
    this.speed = speed;
    this.radius = radius;
    this.offset = offset;
  }

  update(deltaTime: number): void {
    this.time += deltaTime * this.speed;

    const transform = this.actor?.getComponent(TransformComponent);
    if (transform) {
      const x = this.offset[0] + Math.cos(this.time) * this.radius;
      const y = this.offset[1] + Math.sin(this.time * 1.3) * this.radius * 0.5;
      const z = this.offset[2] + Math.sin(this.time) * this.radius;

      transform.setPosition([x, y, z]);
    }
  }
}

class ClusteredLightingDemo {
  private engine!: Engine;
  private scene!: Scene;
  private lightingResource!: ClusteredLightingResource;
  private lights: Light[] = [];
  private lightActors: Actor[] = [];
  private animationEnabled = true;
  private debugMode = false;

  // Configuration
  private config = {
    numLights: 100,
    gridSizeX: 16,
    gridSizeY: 9,
    gridSizeZ: 24,
    zNear: 0.1,
    zFar: 1000,
  };

  async init(container: HTMLElement) {
    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);

    // Initialize engine
    this.engine = new Engine({ canvas });
    await this.engine.initialize();

    // Create scene
    this.scene = new Scene("ClusteredLightingScene");
    this.engine.setScene(this.scene);

    // Initialize clustered lighting resource
    this.lightingResource = new ClusteredLightingResource(clusteredLightingWasm, {
      gridSizeX: this.config.gridSizeX,
      gridSizeY: this.config.gridSizeY,
      gridSizeZ: this.config.gridSizeZ,
      zNear: this.config.zNear,
      zFar: this.config.zFar,
    });
    await this.lightingResource.load();

    // Create camera
    this.createCamera(canvas);

    // Create scene objects
    this.createGround();
    this.createObjects();

    // Create lights
    this.createLights(this.config.numLights);

    // Setup UI
    this.setupUI();

    // Start render loop
    this.engine.start();

    // Update stats
    this.updateStatsLoop();

    return () => {
      this.engine.stop();
    };
  }

  private createCamera(canvas: HTMLCanvasElement) {
    const camera = new Actor("Camera");
    const transform = camera.addComponent(TransformComponent);
    transform.setPosition([0, 10, 30]);
    transform.lookAt([0, 0, 0], [0, 1, 0]);

    const cameraComponent = camera.addComponent(CameraComponent);
    cameraComponent.setPerspective(60, canvas.width / canvas.height, this.config.zNear, this.config.zFar);

    this.scene.addActor(camera);
  }

  private createGround() {
    const ground = new Actor("Ground");
    const transform = ground.addComponent(TransformComponent);
    transform.setPosition([0, -2, 0]);
    transform.setScale([50, 0.1, 50]);

    const renderer = ground.addComponent(MeshRendererComponent);
    // Would set mesh and material here

    this.scene.addActor(ground);
  }

  private createObjects() {
    // Create a grid of cubes to be lit
    const gridSize = 5;
    const spacing = 4;

    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const cube = new Actor(`Cube_${x}_${z}`);
        const transform = cube.addComponent(TransformComponent);

        const xPos = (x - gridSize / 2) * spacing;
        const zPos = (z - gridSize / 2) * spacing;
        transform.setPosition([xPos, 0, zPos]);

        const renderer = cube.addComponent(MeshRendererComponent);
        // Would set mesh and material here

        this.scene.addActor(cube);
      }
    }
  }

  private createLights(count: number) {
    // Clear existing lights
    this.lightActors.forEach(actor => this.scene.removeActor(actor));
    this.lightActors = [];
    this.lights = [];

    const colors: [number, number, number][] = [
      [1.0, 0.2, 0.2], // Red
      [0.2, 1.0, 0.2], // Green
      [0.2, 0.2, 1.0], // Blue
      [1.0, 1.0, 0.2], // Yellow
      [1.0, 0.2, 1.0], // Magenta
      [0.2, 1.0, 1.0], // Cyan
      [1.0, 0.6, 0.2], // Orange
    ];

    for (let i = 0; i < count; i++) {
      // Random position in a volume
      const radius = 20;
      const angle = (i / count) * Math.PI * 2;
      const height = (Math.random() - 0.5) * 10;
      const distance = Math.random() * radius;

      const x = Math.cos(angle) * distance;
      const y = height;
      const z = Math.sin(angle) * distance;

      // Create light actor (for animation)
      const lightActor = new Actor(`Light_${i}`);
      const transform = lightActor.addComponent(TransformComponent);
      transform.setPosition([x, y, z]);

      // Add animation
      const animSpeed = 0.3 + Math.random() * 0.7;
      const animRadius = 5 + Math.random() * 10;
      lightActor.addComponent(
        LightAnimationComponent,
        animSpeed,
        animRadius,
        [x, y, z]
      );

      this.scene.addActor(lightActor);
      this.lightActors.push(lightActor);

      // Create light data
      const color = colors[i % colors.length];
      const light: Light = {
        position: [x, y, z],
        radius: 15 + Math.random() * 10,
        color: color,
        intensity: 1.0 + Math.random() * 2.0,
        direction: [0, -1, 0],
        coneAngle: Math.PI / 6,
        lightType: Math.random() > 0.9 ? LightType.SPOT : LightType.POINT,
      };

      this.lights.push(light);
    }
  }

  private updateLights() {
    // Update light positions from actors
    for (let i = 0; i < this.lights.length; i++) {
      const transform = this.lightActors[i]?.getComponent(TransformComponent);
      if (transform) {
        const pos = transform.getPosition();
        this.lights[i].position = pos;
      }
    }
  }

  private setupUI() {
    // Light count slider
    const lightSlider = document.getElementById("light-slider") as HTMLInputElement;
    const lightValue = document.getElementById("light-value")!;
    lightSlider.addEventListener("input", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      lightValue.textContent = value.toString();
      this.config.numLights = value;
      this.createLights(value);
    });

    // Grid size sliders
    const setupGridSlider = (id: string, valueId: string, configKey: keyof typeof this.config) => {
      const slider = document.getElementById(id) as HTMLInputElement;
      const value = document.getElementById(valueId)!;
      slider.addEventListener("input", (e) => {
        const val = parseInt((e.target as HTMLInputElement).value);
        value.textContent = val.toString();
        (this.config as any)[configKey] = val;
        this.recreateClusterGrid();
      });
    };

    setupGridSlider("grid-x", "grid-x-value", "gridSizeX");
    setupGridSlider("grid-y", "grid-y-value", "gridSizeY");
    setupGridSlider("grid-z", "grid-z-value", "gridSizeZ");

    // Toggle animation
    const toggleAnim = document.getElementById("toggle-animation")!;
    toggleAnim.addEventListener("click", () => {
      this.animationEnabled = !this.animationEnabled;
      toggleAnim.textContent = this.animationEnabled ? "Pause Animation" : "Resume Animation";
    });

    // Toggle debug
    const toggleDebug = document.getElementById("toggle-debug")!;
    toggleDebug.addEventListener("click", () => {
      this.debugMode = !this.debugMode;
      toggleDebug.textContent = this.debugMode ? "Hide Cluster Heatmap" : "Show Cluster Heatmap";
      // Would switch shader here
    });

    // Reset
    const reset = document.getElementById("reset")!;
    reset.addEventListener("click", () => {
      this.config = {
        numLights: 100,
        gridSizeX: 16,
        gridSizeY: 9,
        gridSizeZ: 24,
        zNear: 0.1,
        zFar: 1000,
      };
      lightSlider.value = "100";
      lightValue.textContent = "100";
      this.createLights(100);
      this.recreateClusterGrid();
    });
  }

  private recreateClusterGrid() {
    // Recreate the lighting resource with new config
    this.lightingResource = new ClusteredLightingResource(clusteredLightingWasm, {
      gridSizeX: this.config.gridSizeX,
      gridSizeY: this.config.gridSizeY,
      gridSizeZ: this.config.gridSizeZ,
      zNear: this.config.zNear,
      zFar: this.config.zFar,
    });
    this.lightingResource.load();
  }

  private updateStatsLoop() {
    let lastTime = performance.now();
    let frames = 0;

    const updateStats = () => {
      frames++;
      const now = performance.now();
      const delta = now - lastTime;

      if (delta >= 1000) {
        const fps = Math.round((frames * 1000) / delta);
        document.getElementById("fps")!.textContent = fps.toString();
        frames = 0;
        lastTime = now;
      }

      // Update other stats
      document.getElementById("light-count")!.textContent = this.lights.length.toString();
      document.getElementById("cluster-count")!.textContent = this.lightingResource.getClusterCount().toString();

      // Would calculate average lights per cluster from assignment result
      document.getElementById("avg-lights")!.textContent = "N/A";

      requestAnimationFrame(updateStats);
    };

    updateStats();
  }
}

// Initialize
const container = document.getElementById("container");
if (container) {
  const demo = new ClusteredLightingDemo();
  demo.init(container);
}
