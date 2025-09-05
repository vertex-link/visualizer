import { Resource } from "@vertex-link/acs";
import { ComputeResource } from "@vertex-link/acs";
import * as mathModule from "./compute/math.zig";

// Minimal local copy of ComputeModule shape for typing in docs
interface ComputeModule { [key: string]: any }

// Simple Custom Resource demonstrating payload/compile lifecycle
interface ResourceData { text: string }

class UppercaseResource extends Resource<ResourceData> {
  constructor(name: string, payload: ResourceData) { super(name, payload); }
  async compile(): Promise<void> {
    // Simulate async compilation work
    await new Promise((r) => setTimeout(r, 2000));
    this.payload.text = this.payload.text.toUpperCase();
  }
  protected async loadInternal(): Promise<ResourceData> {
    return this.payload;
  }
}

// Types for zig compute exports
interface MathExports extends ComputeModule {
  add(a: number, b: number): Promise<number> | number;
  multiply(a: number, b: number): Promise<number> | number;
}

async function runDemo() {
  const custom = document.getElementById("custom")!;
  const compute = document.getElementById("compute")!;

  // Custom resource usage
  const res = new UppercaseResource("greeting", { text: "resources are fun" });
  custom.innerHTML = `<h2>Custom Resource</h2><div>Payload text before compile: <code>${res.payload.text}</code></div>`;
  res.whenReady().then(() => {
    custom.innerHTML = `<h2>Custom Resource</h2><div>Payload text after compile: <code>${res.payload.text}</code></div>`;
  });

  const math =
    await new ComputeResource<MathExports>(mathModule)
    .whenReady();

  const sum = await math.add(5, 3);
  const prod = await math.multiply(4, 7);
  compute.innerHTML = `<h2>Compute Resource (Zig)</h2>
    <div><code>5 + 3 = ${sum}</code></div>
    <div><code>4 * 7 = ${prod}</code></div>`;
}

runDemo();
