import { Event } from "@vertex-link/space";

/**
 * Resource events
 */
export class ResourceReadyEvent extends Event<{
  meshRenderer: any; // Using any to avoid circular import
}> {
  static readonly eventType = "engine.resource.ready";
}

/**
 * Input events
 */
export class KeyDownEvent extends Event<{
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}> {
  static readonly eventType = "engine.input.keydown";
}

export class KeyUpEvent extends Event<{
  key: string;
}> {
  static readonly eventType = "engine.input.keyup";
}

export class MouseClickEvent extends Event<{
  x: number;
  y: number;
  button: number;
  screenX: number;
  screenY: number;
}> {
  static readonly eventType = "engine.input.mouseclick";
}

export class MouseMoveEvent extends Event<{
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
}> {
  static readonly eventType = "engine.input.mousemove";
}
