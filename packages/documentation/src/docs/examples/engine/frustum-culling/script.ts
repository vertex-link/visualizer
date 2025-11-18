import {
  Context,
  Actor,
  Scene,
  Component,
} from "@vertex-link/space";
import {
  Engine,
  WebGPUProcessor,
  FrustumCullingProcessor,
  MeshResource,
  MaterialResource,
  ShaderResource,
  ShaderStage,
  TransformComponent,
  MeshRendererComponent,
  CameraComponent,
  ProjectionType,
  GeometryUtils,
  Transform,
} from "@vertex-link/engine";

/**
 * Component that rotates an actor around the Y axis
 */
class RotatingComponent extends Component {
  public rotationSpeed = 1.0; // radians per second

  update(deltaTime: number) {
    const transform = this.actor.getComponent(TransformComponent);
    if (!transform) return;

    const rotation = transform.rotation;
    const angle = this.rotationSpeed * deltaTime;

    // Rotate around Y axis
    const [qx, qy, qz, qw] = rotation;
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const c = Math.cos(halfAngle);

    transform.rotation = [
      qx * c + qy * s,
      qy * c - qx * s,
      qz * c + qw * s,
      qw * c - qz * s,
    ];

    transform.markDirty();
  }
}

/**
 * Component that moves the camera in a circular path
 */
class CameraOrbitComponent extends Component {
  public radius = 30;
  public height = 15;
  public speed = 0.3;
  private time = 0;

  update(deltaTime: number) {
    this.time += deltaTime;

    const transform = this.actor.getComponent(TransformComponent);
    if (!transform) return;

    const angle = this.time * this.speed;
    const x = Math.cos(angle) * this.radius;
    const z = Math.sin(angle) * this.radius;

    transform.position = [x, this.height, z];

    // Look at origin
    const forward: [number, number, number] = [-x, -this.height, -z];
    const len = Math.sqrt(forward[0] ** 2 + forward[1] ** 2 + forward[2] ** 2);
    forward[0] /= len;
    forward[1] /= len;
    forward[2] /= len;

    // Calculate rotation to look at origin
    const up: [number, number, number] = [0, 1, 0];
    const right: [number, number, number] = [
      up[1] * forward[2] - up[2] * forward[1],
      up[2] * forward[0] - up[0] * forward[2],
      up[0] * forward[1] - up[1] * forward[0],
    ];
    const rightLen = Math.sqrt(right[0] ** 2 + right[1] ** 2 + right[2] ** 2);
    right[0] /= rightLen;
    right[1] /= rightLen;
    right[2] /= rightLen;

    const newUp: [number, number, number] = [
      forward[1] * right[2] - forward[2] * right[1],
      forward[2] * right[0] - forward[0] * right[2],
      forward[0] * right[1] - forward[1] * right[0],
    ];

    // Convert to quaternion (simplified)
    const trace = right[0] + newUp[1] + forward[2];
    let qx: number, qy: number, qz: number, qw: number;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      qw = 0.25 / s;
      qx = (newUp[2] - forward[1]) * s;
      qy = (forward[0] - right[2]) * s;
      qz = (right[1] - newUp[0]) * s;
    } else if (right[0] > newUp[1] && right[0] > forward[2]) {
      const s = 2.0 * Math.sqrt(1.0 + right[0] - newUp[1] - forward[2]);
      qw = (newUp[2] - forward[1]) / s;
      qx = 0.25 * s;
      qy = (newUp[0] + right[1]) / s;
      qz = (forward[0] + right[2]) / s;
    } else if (newUp[1] > forward[2]) {
      const s = 2.0 * Math.sqrt(1.0 + newUp[1] - right[0] - forward[2]);
      qw = (forward[0] - right[2]) / s;
      qx = (newUp[0] + right[1]) / s;
      qy = 0.25 * s;
      qz = (forward[1] + newUp[2]) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + forward[2] - right[0] - newUp[1]);
      qw = (right[1] - newUp[0]) / s;
      qx = (forward[0] + right[2]) / s;
      qy = (forward[1] + newUp[2]) / s;
      qz = 0.25 * s;
    }

    transform.rotation = [qx, qy, qz, qw];
    transform.markDirty();
  }
}

/**
 * Component that displays frustum culling statistics
 */
class StatsDisplayComponent extends Component {
  private statsElement: HTMLElement | null = null;
  private frustumCulling: FrustumCullingProcessor | null = null;

  onInitialize() {
    // Find or create stats display element
    this.statsElement = document.getElementById("culling-stats");
    if (!this.statsElement) {
      this.statsElement = document.createElement("div");
      this.statsElement.id = "culling-stats";
      this.statsElement.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff00;
        padding: 15px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        border-radius: 5px;
        z-index: 1000;
        line-height: 1.6;
      `;
      document.body.appendChild(this.statsElement);
    }

    // Find frustum culling processor
    if (this.actor.context) {
      this.frustumCulling = this.actor.context.processors.find(
        (p) => p instanceof FrustumCullingProcessor,
      ) as FrustumCullingProcessor | null;
    }
  }

  update(deltaTime: number) {
    if (!this.statsElement || !this.frustumCulling) return;

    const stats = this.frustumCulling.getStats();
    const cullingEnabled = this.frustumCulling.isEnabled();
    const fps = Math.round(1 / deltaTime);

    this.statsElement.innerHTML = `
      <strong>🔍 Frustum Culling Demo</strong><br/>
      <br/>
      <strong>Status:</strong> ${cullingEnabled ? "✅ ENABLED" : "❌ DISABLED"}<br/>
      <strong>FPS:</strong> ${fps}<br/>
      <br/>
      <strong>Objects:</strong><br/>
      • Total: ${stats.totalObjects}<br/>
      • Visible: ${stats.visibleObjects} <span style="color: #00ff00">●</span><br/>
      • Culled: ${stats.culledObjects} <span style="color: #ff0000">●</span><br/>
      <br/>
      <strong>Culling Time:</strong> ${stats.lastUpdateTime.toFixed(2)}ms<br/>
      <br/>
      <em>Camera orbits automatically</em>
    `;
  }

  onDestroy() {
    if (this.statsElement && this.statsElement.parentNode) {
      this.statsElement.parentNode.removeChild(this.statsElement);
    }
  }
}

/**
 * Main function to set up the frustum culling demo
 */
export async function main(canvas: HTMLCanvasElement) {
  console.log("🚀 Starting Frustum Culling Demo...");

  // Create context with processors
  const context = new Context();
  const webgpuProcessor = new WebGPUProcessor();
  const frustumCullingProcessor = new FrustumCullingProcessor();

  // IMPORTANT: Add frustum culling BEFORE WebGPU processor
  // This ensures culling happens before render batch creation
  context.addProcessor(frustumCullingProcessor);
  context.addProcessor(webgpuProcessor);

  // Initialize engine
  const engine = new Engine(context, canvas);
  await engine.initialize();

  // Initialize frustum culling processor
  await frustumCullingProcessor.initialize();

  // Create scene
  const scene = new Scene();
  context.setScene(scene);

  // Create resources
  const cubeGeometry = GeometryUtils.createCube(1.0);
  const cubeMesh = new MeshResource("cube", cubeGeometry, context);
  await cubeMesh.whenReady();

  // Create shader
  const vertexShader = `
    struct VertexInput {
      @location(0) position: vec3f,
      @location(1) normal: vec3f,
      @location(2) uv: vec2f,
      @location(4) model_matrix_0: vec4f,
      @location(5) model_matrix_1: vec4f,
      @location(6) model_matrix_2: vec4f,
      @location(7) model_matrix_3: vec4f,
      @location(8) instance_color: vec4f,
    }

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      @location(1) worldPos: vec3f,
      @location(2) color: vec4f,
    }

    struct GlobalUniforms {
      viewProjection: mat4x4f,
    }

    @group(0) @binding(0) var<uniform> globals: GlobalUniforms;

    @vertex
    fn main(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;

      let model_matrix = mat4x4f(
        input.model_matrix_0,
        input.model_matrix_1,
        input.model_matrix_2,
        input.model_matrix_3
      );

      let worldPos = model_matrix * vec4f(input.position, 1.0);
      output.position = globals.viewProjection * worldPos;
      output.worldPos = worldPos.xyz;

      let normalMatrix = mat3x3f(
        model_matrix[0].xyz,
        model_matrix[1].xyz,
        model_matrix[2].xyz
      );
      output.normal = normalize(normalMatrix * input.normal);
      output.color = input.instance_color;

      return output;
    }
  `;

  const fragmentShader = `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      @location(1) worldPos: vec3f,
      @location(2) color: vec4f,
    }

    @fragment
    fn main(input: VertexOutput) -> @location(0) vec4f {
      let lightDir = normalize(vec3f(1.0, 1.0, 1.0));
      let diffuse = max(dot(input.normal, lightDir), 0.2);

      return vec4f(input.color.rgb * diffuse, 1.0);
    }
  `;

  const shader = new ShaderResource(
    "cube-shader",
    {
      stages: [
        { stage: ShaderStage.VERTEX, code: vertexShader },
        { stage: ShaderStage.FRAGMENT, code: fragmentShader },
      ],
    },
    context,
  );
  await shader.whenReady();

  const material = new MaterialResource(
    "cube-material",
    {
      shader,
      uniforms: {},
    },
    context,
  );
  await material.whenReady();

  // Create grid of cubes (20x20x20 = 8000 cubes!)
  const gridSize = 20;
  const spacing = 3;
  const offset = (gridSize * spacing) / 2;

  console.log(`🎲 Creating ${gridSize * gridSize * gridSize} cubes...`);

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const cube = new Actor(`cube-${x}-${y}-${z}`);

        const transform = new TransformComponent();
        transform.position = [
          x * spacing - offset,
          y * spacing - offset,
          z * spacing - offset,
        ];
        transform.scale = [0.8, 0.8, 0.8];
        cube.addComponent(transform);

        const meshRenderer = new MeshRendererComponent();
        meshRenderer.mesh = cubeMesh;
        meshRenderer.material = material;

        // Colorful cubes based on position
        const colorHue = ((x + y + z) / (gridSize * 3)) * 360;
        const color = hslToRgb(colorHue, 0.8, 0.6);
        meshRenderer.setColor(color);

        cube.addComponent(meshRenderer);

        // Add rotation to some cubes
        if ((x + y + z) % 3 === 0) {
          const rotating = new RotatingComponent();
          rotating.rotationSpeed = 0.5 + Math.random() * 1.0;
          cube.addComponent(rotating);
        }

        scene.addActor(cube);
      }
    }
  }

  // Create camera with orbital movement
  const cameraActor = new Actor("camera");
  const cameraTransform = new TransformComponent();
  cameraTransform.position = [30, 15, 0];
  cameraActor.addComponent(cameraTransform);

  const camera = new CameraComponent();
  camera.projectionType = ProjectionType.PERSPECTIVE;
  camera.perspectiveConfig = {
    fov: (60 * Math.PI) / 180,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 200.0,
  };
  camera.isActive = true;
  cameraActor.addComponent(camera);

  const orbit = new CameraOrbitComponent();
  cameraActor.addComponent(orbit);

  scene.addActor(cameraActor);

  // Create stats display
  const statsActor = new Actor("stats");
  const statsDisplay = new StatsDisplayComponent();
  statsActor.addComponent(statsDisplay);
  scene.addActor(statsActor);

  console.log("✅ Frustum Culling Demo initialized!");
  console.log(`📊 Total objects: ${gridSize * gridSize * gridSize}`);

  // Start engine
  engine.start();

  return engine;
}

/**
 * Convert HSL color to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number, number] {
  h = h / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [r + m, g + m, b + m, 1.0];
}
