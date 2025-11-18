import { Actor, Scene, useOnEvent } from "@vertex-link/space";
import { TransformComponent, type Vec3 } from "../rendering/components/TransformComponent";
import { MeshRendererComponent } from "../rendering/components/MeshRendererComponent";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { MeshResource } from "../resources/MeshResource";
import { MaterialResource } from "../resources/MaterialResource";
import { ShaderResource, ShaderStage } from "../resources/ShaderResource";
import { GizmoComponent } from "./GizmoComponent";
import { HandleInteractionComponent } from "./HandleInteractionComponent";
import { ObjectSelectedEvent, SelectionClearedEvent } from "./GizmoEvents";
import { createArrowGeometry } from "./GizmoGeometry";

/**
 * Create a gizmo for manipulating 3D transforms
 *
 * @param scene - The overlay scene to add the gizmo to
 * @param canvas - The canvas element for input handling
 * @param camera - The camera component for raycasting
 * @param targetActor - Optional initial target actor
 * @returns The gizmo actor
 */
export function createGizmo(
  scene: Scene,
  canvas: HTMLCanvasElement,
  camera: CameraComponent,
  targetActor: Actor | null = null,
): Actor {
  // Create main gizmo actor
  const gizmo = new Actor("Gizmo");
  const gizmoTransform = gizmo.addComponent(TransformComponent);
  const gizmoComponent = gizmo.addComponent(GizmoComponent);

  // Create handle actors for each axis
  const axes: Array<{ axis: "X" | "Y" | "Z"; color: [number, number, number, number] }> = [
    { axis: "X", color: [1, 0, 0, 1] }, // Red
    { axis: "Y", color: [0, 1, 0, 1] }, // Green
    { axis: "Z", color: [0, 0, 1, 1] }, // Blue
  ];

  const offset = 1.5;
  for (const { axis, color } of axes) {
    const { handle, localOffset } = createHandle(scene, canvas, camera, axis, color, gizmo);
    scene.addActor(handle);
    gizmoComponent.registerHandle(handle, localOffset);
  }

  // Listen for selection events to update target
  useOnEvent(
    ObjectSelectedEvent,
    (event) => {
      gizmoComponent.setTarget(event.payload.actor);
    },
    gizmoComponent,
  );

  // Listen for selection cleared
  useOnEvent(
    SelectionClearedEvent,
    () => {
      gizmoComponent.setTarget(null);
    },
    gizmoComponent,
  );

  // Set initial target if provided
  if (targetActor) {
    gizmoComponent.setTarget(targetActor);
  }

  scene.addActor(gizmo);
  return gizmo;
}

/**
 * Create a handle actor for a specific axis
 */
function createHandle(
  scene: Scene,
  canvas: HTMLCanvasElement,
  camera: CameraComponent,
  axis: "X" | "Y" | "Z",
  color: [number, number, number, number],
  gizmoActor: Actor,
): { handle: Actor; localOffset: Vec3 } {
  const handle = new Actor(`GizmoHandle_${axis}`);

  // Add transform
  const transform = handle.addComponent(TransformComponent);

  // Position handle offset from gizmo center
  const offset = 1.5;
  let localOffset: Vec3;

  switch (axis) {
    case "X":
      localOffset = [offset, 0, 0];
      transform.position = [0, 0, 0]; // Will be updated by gizmo
      transform.rotation = [0, 0, 0, Math.PI / 2]; // Euler ZYX: rotate 90° around Z
      break;
    case "Y":
      localOffset = [0, offset, 0];
      transform.position = [0, 0, 0]; // Will be updated by gizmo
      transform.rotation = [0, 0, 0, 0];
      break;
    case "Z":
      localOffset = [0, 0, offset];
      transform.position = [0, 0, 0]; // Will be updated by gizmo
      transform.rotation = [-Math.PI / 2, 0, 0, 0]; // Rotate -90° around X
      break;
    default:
      localOffset = [0, 0, 0];
  }

  // Create arrow geometry
  const arrowGeometry = createArrowGeometry();

  // Create mesh resource
  const meshResource = new MeshResource(`GizmoArrow_${axis}`, arrowGeometry);

  // Create material with axis color
  const materialDescriptor = {
    name: `GizmoMaterial_${axis}`,
    uniforms: [
      {
        name: "color",
        type: "vec4" as const,
        value: color,
      },
    ],
  };

  // Simple vertex shader
  const vertexShader = new ShaderResource(`gizmo_vertex_${axis}`, {
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

  // Simple fragment shader
  const fragmentShader = new ShaderResource(`gizmo_fragment_${axis}`, {
    stage: ShaderStage.Fragment,
    code: `
      struct FragmentInput {
        @location(0) color: vec4f,
        @location(1) normal: vec3f,
      }

      @fragment
      fn main(input: FragmentInput) -> @location(0) vec4f {
        let lightDir = normalize(vec3f(1.0, 1.0, 1.0));
        let diffuse = max(dot(normalize(input.normal), lightDir), 0.3);
        return vec4f(input.color.rgb * diffuse, input.color.a);
      }
    `,
  });

  const materialResource = new MaterialResource(materialDescriptor, vertexShader, fragmentShader);

  // Add renderer component
  const meshRenderer = handle.addComponent(MeshRendererComponent);
  meshRenderer.setMesh(meshResource);
  meshRenderer.setMaterial(materialResource);

  // Add interaction component
  handle.addComponent(HandleInteractionComponent, canvas, camera, axis);

  return { handle, localOffset };
}
