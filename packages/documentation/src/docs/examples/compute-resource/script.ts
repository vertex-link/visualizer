import { ComputeResource } from "@vertex-link/space";
import * as mathModule from "./compute/math.zig";

// 1. Define the interface for the Zig module's exports
interface MathExports {
  add(a: number, b: number): Promise<number> | number;
  multiply(a: number, b: number): Promise<number> | number;
}

const output = document.getElementById("output")!;
let math: MathExports | null = null;
let operandA = 12;
let operandB = 34;

async function runCalculation() {
    if (!math) {
        output.innerHTML = 'Compute module not ready yet.';
        return;
    }
    const sum = await math.add(operandA, operandB);
    const product = await math.multiply(operandA, operandB);

    output.innerHTML = `
        <h2>Compute Resource (Zig)</h2>
        <div>Module loaded and ready.</div>
        <div><code>add(${operandA}, ${operandB})</code> = <strong>${sum}</strong></div>
        <div><code>multiply(${operandA}, ${operandB})</code> = <strong>${product}</strong></div>
    `;
}

async function main() {
    output.innerHTML = 'Loading compute module...';
    math = await new ComputeResource<MathExports>(mathModule).whenReady();
    await runCalculation();
}

window.addEventListener('message', (event) => {
  console.log('kommt an')
    const { key, value } = event.data;
    if (key === 'a') {
        operandA = Number(value);
    }
    if (key === 'b') {
        operandB = Number(value);
    }
    runCalculation();
});

main();
