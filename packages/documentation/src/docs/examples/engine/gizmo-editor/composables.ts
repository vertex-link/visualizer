import { Scene, Actor, ResourceComponent } from "@vertex-link/space";
import {
  TransformComponent,
  MeshRendererComponent,
  CameraComponent,
  ProjectionType,
  MeshResource,
  MaterialResource,
  ShaderResource,
  ShaderStage,
  GeometryUtils,
  type Vec3,
} from "@vertex-link/engine";
import { CameraPivotComponent } from "../rotating-cube/CameraPivotComponent";

/**
 * Create a scene with the given name
 */
export function createScene(name: string): Scene {
  return new Scene(name);
}

/**
 * Create a camera with orbit controls
 */
export function createCamera(scene: Scene, canvas: HTMLCanvasElement): CameraComponent {
  const cameraActor = new Actor("Camera");

  const cameraTransform = cameraActor.addComponent(TransformComponent);
  cameraTransform.position = [0, 3, 8];
  cameraTransform.lookAt([0, 0, 0]);

  const camera = cameraActor.addComponent(
    CameraComponent,
    {
      type: ProjectionType.Perspective,
      fov: (60 * Math.PI) / 180,
      near: 0.1,
      far: 100,
    },
    cameraTransform,
  );
  camera.isActive = true;

  // Add pivot controls
  cameraActor.addComponent(CameraPivotComponent, canvas, [0, 0, 0]);

  scene.addActor(cameraActor);
  return camera;
}

/**
 * Create a cube actor
 */
export function createCube(
  scene: Scene,
  position: Vec3 = [0, 0, 0],
  color: [number, number, number, number] = [1, 1, 1, 1],
): Actor {
  const cube = new Actor("Cube");

  // Transform
  const transform = cube.addComponent(TransformComponent);
  transform.position = position;

  // Create cube geometry
  const cubeGeometry = GeometryUtils.createCube(1, 1, 1);

  // Create mesh
  const meshResource = new MeshResource("Cube", cubeGeometry);

  // Create material
  const materialDescriptor = {
    name: "CubeMaterial",
    uniforms: [
      {
        name: "color",
        type: "vec4" as const,
        value: color,
      },
    ],
  };

  // Vertex shader
  const vertexShader = new ShaderResource("cube_vertex", {
    stage: ShaderStage.Vertex,
    code: `
      struct GlobalUniforms {
        viewProjection: mat4x4f,
      }

      struct VertexInput {
        @location(0) position: vec3f,
        @location(1) normal: vec3f,
        @location(2) instanceModel0: vec4f,
        @location(3) instanceModel1: vec4f,
        @location(4) instanceModel2: vec4f,
        @location(5) instanceModel3: vec4f,
        @location(6) instanceColor: vec4f,
      }

      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) normal: vec3f,
      }

      @group(0) @binding(0) var<uniform> global: GlobalUniforms;

      @vertex
      fn main(input: VertexInput) -> VertexOutput {
        let model = mat4x4f(
          input.instanceModel0,
          input.instanceModel1,
          input.instanceModel2,
          input.instanceModel3
        );

        var output: VertexOutput;
        output.position = global.viewProjection * model * vec4f(input.position, 1.0);
        output.color = input.instanceColor;
        output.normal = (model * vec4f(input.normal, 0.0)).xyz;
        return output;
      }
    `,
  });

  // Fragment shader
  const fragmentShader = new ShaderResource("cube_fragment", {
    stage: ShaderStage.Fragment,
    code: `
      struct FragmentInput {
        @location(0) color: vec4f,
        @location(1) normal: vec3f,
      }

      @fragment
      fn main(input: FragmentInput) -> @location(0) vec4f {
        let lightDir = normalize(vec3f(1.0, 1.0, 1.0));
        let diffuse = max(dot(normalize(input.normal), lightDir), 0.4);
        return vec4f(input.color.rgb * diffuse, input.color.a);
      }
    `,
  });

  const materialResource = new MaterialResource(materialDescriptor, vertexShader, fragmentShader);

  // Renderer
  const meshRenderer = cube.addComponent(MeshRendererComponent);
  meshRenderer.setMesh(meshResource);
  meshRenderer.setMaterial(materialResource);

  scene.addActor(cube);
  return cube;
}
