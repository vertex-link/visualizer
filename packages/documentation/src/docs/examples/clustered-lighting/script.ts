import { Context, ResourceComponent, Scene } from "@vertex-link/space";
import {
  CameraComponent,
  ClusteringComponent,
  Engine,
  GeometryUtils,
  LightComponent,
  LightType,
  MaterialResource,
  MeshRendererComponent,
  MeshResource,
  ProjectionType,
  ShaderResource,
  TransformComponent,
} from "@vertex-link/engine";

// Scene setup
let engine: Engine;
let scene: Scene;
let lights: Array<{ actor: any; speed: number; radius: number; offset: number }> = [];
let lightCount = 100;

// Camera movement
const cameraState = {
  yaw: 0,
  pitch: 0.3,
  distance: 20,
  height: 5,
  moveSpeed: 0.1,
  keys: new Set<string>(),
};

async function main() {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas not found");
    return;
  }

  // Initialize engine
  const context = Context.create();
  engine = new Engine({ canvas }, context);
  await engine.initialize();

  // Create scene
  scene = new Scene();
  Context.runWith(context, () => {
    setupScene();
  });

  engine.setScene(scene);
  engine.start();

  // Setup controls
  setupControls(canvas);
  setupUI();

  // Animation loop for dynamic light movement
  animateLights();

  console.log("✅ Clustered lighting example started");
}

function setupScene() {
  // Enable clustering
  const clusteringActor = scene.createActor("Clustering");
  const clustering = clusteringActor.addComponent(ClusteringComponent);
  clustering.config = { gridX: 16, gridY: 9, gridZ: 24 };
  console.log("✅ Clustering enabled: 16×9×24 = 3,456 clusters");

  // Create camera
  const cameraActor = scene.createActor("Camera");
  cameraActor.addComponent(TransformComponent).setPosition(0, 5, 15);
  cameraActor.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: { fov: Math.PI / 3, aspect: 16 / 9, near: 0.1, far: 100.0 },
    isActive: true,
  });

  // Create ground plane
  createGroundPlane();

  // Create some cubes to light
  createCubes();

  // Create dynamic lights
  createLights(lightCount);
}

function createGroundPlane() {
  const groundActor = scene.createActor("Ground");
  const transform = groundActor.addComponent(TransformComponent);
  transform.setPosition(0, 0, 0);
  transform.setScale(50, 0.1, 50);

  // Create mesh and material
  const resources = groundActor.addComponent(ResourceComponent);
  const mesh = new MeshResource("ground-mesh", GeometryUtils.createCube(), Context.current());
  const material = new MaterialResource(
    "ground-material",
    {
      vertexShader: new ShaderResource("basic-vert", { stage: "vertex", path: "basic.wgsl" }),
      fragmentShader: new ShaderResource("basic-frag", { stage: "fragment", path: "basic.wgsl" }),
      uniforms: { color: new Float32Array([0.2, 0.2, 0.3, 1.0]) },
    },
    Context.current(),
  );

  resources.add(mesh);
  resources.add(material);

  groundActor.addComponent(MeshRendererComponent);
}

function createCubes() {
  const cubePositions = [
    [0, 1, 0],
    [5, 1, 5],
    [-5, 1, 5],
    [5, 1, -5],
    [-5, 1, -5],
    [0, 1, 8],
    [0, 1, -8],
    [8, 1, 0],
    [-8, 1, 0],
  ];

  for (let i = 0; i < cubePositions.length; i++) {
    const [x, y, z] = cubePositions[i];
    const cubeActor = scene.createActor(`Cube${i}`);
    const transform = cubeActor.addComponent(TransformComponent);
    transform.setPosition(x, y, z);
    transform.setScale(1, 2, 1);

    const resources = cubeActor.addComponent(ResourceComponent);
    const mesh = new MeshResource(`cube-mesh-${i}`, GeometryUtils.createCube(), Context.current());
    const color = [Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1.0];
    const material = new MaterialResource(
      `cube-material-${i}`,
      {
        vertexShader: new ShaderResource("basic-vert", { stage: "vertex", path: "basic.wgsl" }),
        fragmentShader: new ShaderResource("basic-frag", { stage: "fragment", path: "basic.wgsl" }),
        uniforms: { color: new Float32Array(color) },
      },
      Context.current(),
    );

    resources.add(mesh);
    resources.add(material);

    cubeActor.addComponent(MeshRendererComponent);
  }
}

function createLights(count: number) {
  // Clear existing lights
  for (const lightData of lights) {
    scene.removeActor(lightData.actor.id);
  }
  lights = [];

  console.log(`🔦 Creating ${count} dynamic lights...`);

  for (let i = 0; i < count; i++) {
    const lightActor = scene.createActor(`Light${i}`);

    // Position lights in a grid with random height
    const gridSize = Math.ceil(Math.sqrt(count));
    const spacing = 20 / gridSize;
    const x = (i % gridSize) * spacing - 10 + Math.random() * spacing * 0.5;
    const z = Math.floor(i / gridSize) * spacing - 10 + Math.random() * spacing * 0.5;
    const y = Math.random() * 3 + 1;

    const transform = lightActor.addComponent(TransformComponent);
    transform.setPosition(x, y, z);

    // Create light component
    const light = lightActor.addComponent(LightComponent);
    light.setType(LightType.Point);

    // Random color
    const hue = Math.random() * 360;
    const color = hslToRgb(hue, 0.8, 0.6);
    light.setColor(color[0], color[1], color[2]);

    // Random intensity and radius
    light.setIntensity(1.5 + Math.random() * 1.5);
    const radius = 3 + Math.random() * 3;
    light.setRadius(radius);

    // Store light data for animation
    lights.push({
      actor: lightActor,
      speed: 0.5 + Math.random() * 1.5,
      radius: radius,
      offset: Math.random() * Math.PI * 2,
    });
  }

  console.log(`✅ Created ${count} lights`);
}

function animateLights() {
  const time = performance.now() * 0.001;

  // Animate lights in circular patterns
  for (let i = 0; i < lights.length; i++) {
    const lightData = lights[i];
    const transform = lightData.actor.getComponent(TransformComponent);
    if (!transform) continue;

    const angle = time * lightData.speed + lightData.offset;
    const orbitRadius = 2 + Math.sin(time * 0.5 + lightData.offset) * 1.5;

    const centerX = (i % 10) * 2 - 10;
    const centerZ = Math.floor(i / 10) * 2 - 10;

    transform.setPosition(
      centerX + Math.cos(angle) * orbitRadius,
      1.5 + Math.sin(time * 2 + lightData.offset) * 0.5,
      centerZ + Math.sin(angle) * orbitRadius,
    );
  }

  // Update camera
  updateCamera();

  requestAnimationFrame(animateLights);
}

function updateCamera() {
  const cameraActor = scene.query().withComponent(CameraComponent).execute()[0];
  if (!cameraActor) return;

  const transform = cameraActor.getComponent(TransformComponent);
  if (!transform) return;

  // Handle keyboard movement
  if (cameraState.keys.has("w")) cameraState.distance -= cameraState.moveSpeed;
  if (cameraState.keys.has("s")) cameraState.distance += cameraState.moveSpeed;
  if (cameraState.keys.has("a")) cameraState.yaw -= 0.02;
  if (cameraState.keys.has("d")) cameraState.yaw += 0.02;
  if (cameraState.keys.has(" ")) cameraState.height += cameraState.moveSpeed;
  if (cameraState.keys.has("shift")) cameraState.height -= cameraState.moveSpeed;

  // Clamp values
  cameraState.distance = Math.max(5, Math.min(50, cameraState.distance));
  cameraState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraState.pitch));
  cameraState.height = Math.max(1, Math.min(20, cameraState.height));

  // Calculate camera position
  const x = Math.cos(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance;
  const y = cameraState.height + Math.sin(cameraState.pitch) * cameraState.distance;
  const z = Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * cameraState.distance;

  transform.setPosition(x, y, z);
  transform.lookAt([0, 1, 0]);
}

function setupControls(canvas: HTMLCanvasElement) {
  // Mouse controls
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;

    cameraState.yaw += deltaX * 0.005;
    cameraState.pitch -= deltaY * 0.005;

    lastX = e.clientX;
    lastY = e.clientY;
  });

  canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    cameraState.keys.add(e.key.toLowerCase());

    // Number keys to change light count
    if (e.key === "1") changeLightCount(100);
    if (e.key === "2") changeLightCount(250);
    if (e.key === "3") changeLightCount(500);
    if (e.key === "4") changeLightCount(1000);
  });

  window.addEventListener("keyup", (e) => {
    cameraState.keys.delete(e.key.toLowerCase());
  });
}

function setupUI() {
  const info = document.getElementById("info");
  if (!info) return;

  setInterval(() => {
    info.innerHTML = `
      <strong>Clustered Forward+ Rendering</strong><br>
      Lights: ${lights.length}<br>
      Clusters: 16×9×24 = 3,456<br>
      <br>
      <em>Controls:</em><br>
      Mouse: Rotate camera<br>
      WASD: Move camera<br>
      Space/Shift: Up/Down<br>
      1/2/3/4: 100/250/500/1000 lights
    `;
  }, 100);
}

function changeLightCount(count: number) {
  lightCount = count;
  createLights(count);
}

// Utility: HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return [r, g, b];
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

main();
