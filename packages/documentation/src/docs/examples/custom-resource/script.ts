import { Resource } from "@vertex-link/acs";

// 1. Define the resource data and class
interface ResourceData {
  text: string;
}

class UppercaseResource extends Resource<ResourceData> {
  constructor(name: string, payload: ResourceData) {
    super(name, payload);
  }

  // 2. Simulate an async compilation step
  async compile(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network/work
    this.payload.text = this.payload.text.toUpperCase();
  }
}

const output = document.getElementById("output")!;

function loadAndRender(text: string) {
    const myResource = new UppercaseResource("greeting", { text });

    output.innerHTML = `
    <h2>Resource: ${myResource.name}</h2>
    <div>Status: <code>${myResource.status}</code></div>
    <div>Payload before compile: <code>${myResource.payload.text}</code></div>
    `;

    myResource.whenReady().then(() => {
    output.innerHTML = `
        <h2>Resource: ${myResource.name}</h2>
        <div>Status: <code>${myResource.status}</code></div>
        <div>Payload after compile: <code>${myResource.payload.text}</code></div>
    `;
    });
}

window.addEventListener('message', (event) => {
    const { key, value } = event.data;
    if (key === 'inputText') {
        loadAndRender(value);
    }
});
