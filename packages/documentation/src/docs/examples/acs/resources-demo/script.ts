import { ComputeResource, Processor, Resource, Tickers } from "@vertex-link/acs";
import * as mathModule from "./compute/math.zig";

// Simple Custom Resource demonstrating payload/compile lifecycle
interface ResourceData {
  text: string;
}

class UppercaseResource extends Resource<ResourceData> {
  constructor(name: string, payload: ResourceData) {
    super(name, payload);
  }
  async compile(): Promise<void> {
    // Simulate async compilation work
    await new Promise((r) => setTimeout(r, 2000));
    this.payload.text = this.payload.text.toUpperCase();
  }
}

class CustomProcessor extends Processor {
  constructor(name: string = "customProcessor") {
    super(name, Tickers.fixedFPS(1));
  }
}

const cProcessor = new CustomProcessor();

// Types for zig compute exports
interface MathExports {
  add(a: number, b: number): Promise<number> | number;
  multiply(a: number, b: number): Promise<number> | number;
}

async function runDemo() {
  const custom = document.getElementById("custom")!;
  const compute = document.getElementById("compute")!;
  const time = document.getElementById("time")!;
  const startTime = document.getElementById("start-time")!;

  let timeString = new Date().toLocaleTimeString();

  startTime.onclick = () => {
    if (cProcessor.isRunning) {
      cProcessor.stop();
      startTime.innerHTML = "Start";
      return;
    }
    startTime.innerHTML = "Stop";
    cProcessor.start();
  };

  // Custom resource usage
  const res = new UppercaseResource("greeting", { text: "resources are fun" });
  custom.innerHTML = `<h2>Custom Resource</h2><div>Payload text before compile: <code>${res.payload.text}</code></div>`;
  res.whenReady().then(() => {
    custom.innerHTML = `<h2>Custom Resource</h2><div>Payload text after compile: <code>${res.payload.text}</code></div>`;
  });

  time.innerHTML = timeString;

  cProcessor.addTask({
    id: "Show Time",
    update() {
      timeString = new Date().toLocaleTimeString();
      time.innerHTML = timeString;
    },
  });

  const math = await new ComputeResource<MathExports>(mathModule).whenReady();

  const sum = await math.add(5, 3);
  const prod = await math.multiply(4, 7);
  compute.innerHTML = `<h2>Compute Resource (Zig)</h2>
    <div><code>5 + 3 = ${sum}</code></div>
    <div><code>4 * 7 = ${prod}</code></div>`;
}

runDemo();
