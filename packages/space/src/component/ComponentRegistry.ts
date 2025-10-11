import type { ComponentClass } from "./Component";

export class ComponentTypeRegistry {
  private static typeToId = new Map<ComponentClass, number>();
  private static nextId = 0;

  static getId(componentClass: ComponentClass): number {
    let id = this.typeToId.get(componentClass);
    if (id === undefined) {
      id = this.nextId++;
      this.typeToId.set(componentClass, id);
    }
    return id;
  }

  static createMask(...components: ComponentClass[]): bigint {
    let mask = 0n;
    for (const comp of components) {
      mask |= 1n << BigInt(this.getId(comp));
    }
    return mask;
  }
}
