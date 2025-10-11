import { Event, emit, on } from "@vertex-link/space";

// 1. Define the event payload and class
interface ButtonClickPayload {
  timestamp: number;
  message: string;
}

class ButtonClickedEvent extends Event<ButtonClickPayload> {
  public static readonly eventType = "ButtonClicked";
  constructor(payload: ButtonClickPayload) {
    super(payload);
  }
}

const button = document.getElementById("emit-event-button")!;
const output = document.getElementById("output")!;
let eventMessage = 'Hello Events!'; // Default

// 2. Set up a listener for the event
on(ButtonClickedEvent, (event) => {
  const { timestamp, message } = event.payload;
  output.innerHTML = `
    Event <code>${ButtonClickedEvent.eventType}</code> received! <br>
    Message: <code>${message}</code> <br>
    Timestamp: <code>${timestamp}</code>
  `;
});

// 3. Emit the event when the button is clicked
button.addEventListener("click", () => {
  output.innerHTML = "Emitting event...";
  emit(new ButtonClickedEvent({ timestamp: Date.now(), message: eventMessage }));
});

window.addEventListener('message', (event) => {
    const { key, value } = event.data;
    if (key === 'eventMessage') {
        eventMessage = value;
    }
});
