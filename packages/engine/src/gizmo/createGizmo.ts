import { Actor, Scene, ResourceComponent, useOnEvent } from "@vertex-link/space";
import { TransformComponent } from "../rendering/components/TransformComponent";
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

  for (const { axis, color } of axes) {
    const handle = createHandle(scene, canvas, camera, axis, color);
    scene.addActor(handle);
  }

  // Listen for selection events to update target
  useOnEvent(
    ObjectSelectedEvent,
    (event) => {
      const selectedActor = scene.getActor(event.payload.actorId);
      if (selectedActor) {
        gizmoComponent.setTarget(selectedActor);
      }
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
): Actor {
  const handle = new Actor(`GizmoHandle_${axis}`);

  // Add transform
  const transform = handle.addComponent(TransformComponent);

  // Orient handle along axis
  switch (axis) {
    case "X":
      // Rotate 90° around Z to point along X
      transform.rotation = [0, 0, Math.PI / 2, 1];
      break;
    case "Y":
      // Default orientation (points along Y)
      break;
    case "Z":
      // Rotate -90° around X to point along Z
      transform.rotation = [-Math.PI / 2, 0, 0, 1];
      break;
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
  const vertexShader = new ShaderResource("gizmo_vertex", {
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
        output.normal = input.normal;
        return output;
      }
    `,
  });

  // Simple fragment shader
  const fragmentShader = new ShaderResource("gizmo_fragment", {
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

  return handle;
}
