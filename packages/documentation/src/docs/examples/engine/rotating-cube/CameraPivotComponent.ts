import { Transform, TransformComponent, type Vec3 } from "@vertex-link/engine";
import { type Actor, Component } from "@vertex-link/orbits";

/**
 * Component that allows a camera to pivot around a target point using mouse drag.
 */
export class CameraPivotComponent extends Component {
  private transform!: TransformComponent;
  private canvas: HTMLCanvasElement;
  private pivotPoint: Vec3 = [0, 0, 0];
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private rotationSpeed = 0.005; // Radians per pixel
  
  // Current spherical coordinates (relative to pivot)
  private azimuthAngle = 0; // Rotation around Y axis
  private polarAngle = Math.PI / 4; // Angle from Y axis
  private radius = 10; // Distance from pivot

  constructor(actor: Actor, canvas: HTMLCanvasElement, pivotPoint: Vec3 = [0, 0, 0]) {
    super(actor);
    this.canvas = canvas;
    this.pivotPoint = pivotPoint;
    
    // Calculate initial spherical coordinates from camera position
    this.initializeFromTransform();
    
    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    
    // Register DOM event listeners
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("mouseleave", this.onMouseUp);
  }

  private getTransform(): TransformComponent {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent)!;
    }
    return this.transform;
  }

  /**
   * Initialize spherical coordinates from current camera position
   */
  private initializeFromTransform(): void {
    const transform = this.getTransform();
    if (!transform) return;
    
    // Calculate vector from pivot to camera
    const dx = transform.position[0] - this.pivotPoint[0];
    const dy = transform.position[1] - this.pivotPoint[1];
    const dz = transform.position[2] - this.pivotPoint[2];
    
    // Calculate spherical coordinates
    this.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.azimuthAngle = Math.atan2(dx, dz);
    this.polarAngle = Math.acos(dy / this.radius);
  }

  /**
   * Set the pivot point around which the camera rotates
   */
  public setPivotPoint(point: Vec3): void {
    this.pivotPoint = point;
    this.initializeFromTransform();
  }

  /**
   * Set the rotation speed (radians per pixel of mouse movement)
   */
  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left mouse button
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    
    // Update angles
    this.azimuthAngle -= deltaX * this.rotationSpeed;
    this.polarAngle = Math.max(0.1, Math.min(Math.PI - 0.1, 
      this.polarAngle + deltaY * this.rotationSpeed));
    
    this.updateCameraPosition();
  }

  private onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
  }

  /**
   * Update camera position based on spherical coordinates
   * Note: Rotation is handled by CameraLookAtComponent
   */
  private updateCameraPosition(): void {
    const transform = this.getTransform();
    if (!transform) return;

    // Convert spherical to Cartesian coordinates
    const x = this.radius * Math.sin(this.polarAngle) * Math.sin(this.azimuthAngle);
    const y = this.radius * Math.cos(this.polarAngle);
    const z = this.radius * Math.sin(this.polarAngle) * Math.cos(this.azimuthAngle);

    // Set camera position relative to pivot
    transform.position = [
      this.pivotPoint[0] + x,
      this.pivotPoint[1] + y,
      this.pivotPoint[2] + z,
    ];

    transform.markDirty();
  }

  /**
   * Cleanup event listeners when component is destroyed
   */
  public destroy(): void {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("mouseleave", this.onMouseUp);
  }
}
