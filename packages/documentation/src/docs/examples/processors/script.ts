import { Processor, Tickers } from "@vertex-link/space";

// 1. Define a Processor
class CounterProcessor extends Processor {
  constructor(fps: number) {
    // Run at 10 frames per second
    super("CounterProcessor", Tickers.fixedFPS(fps));
  }
}

const counterDisplay = document.getElementById("counter")!;
const startStopButton = document.getElementById("start-stop-button")!;

let count = 0;
const processor = new CounterProcessor(10);

// 2. Add a task to the processor
processor.addTask({
  id: "increment-counter",
  update: () => {
    count++;
    counterDisplay.textContent = count.toString();
  },
});

// 3. Control the processor
startStopButton.addEventListener("click", () => {
  if (processor.isRunning) {
    processor.stop();
    startStopButton.textContent = "Start";
  } else {
    processor.start();
    startStopButton.textContent = "Stop";
  }
});

window.addEventListener('message', (event) => {
    const { key, value } = event.data;
    if (key === 'fps') {
        const wasRunning = processor.isRunning;
        processor.stop();
        processor.setTicker(Tickers.fixedFPS(value));
        if (wasRunning) {
            processor.start();
        }
    }
});
