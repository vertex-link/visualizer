import { Actor, Component } from "@vertex-link/acs";

// 1. Define a simple Component
class PlayerDataComponent extends Component {
  public health = 100;
  public name = "Player 1";
}

const playerActor = new Actor("Player");
const playerData = playerActor.addComponent(PlayerDataComponent);
const output = document.getElementById("output")!;

function renderOutput() {
    const component = playerActor.getComponent(PlayerDataComponent);
    if (component) {
        output.innerHTML = `
        <h2>Actor: ${playerActor.label}</h2>
        <div>Component Found: <code>${component.constructor.name}</code></div>
        <div>Player Name: <code>${component.name}</code></div>
        <div>Health: <code>${component.health}</code></div>
        `;
    } else {
        output.innerHTML = "Could not find PlayerDataComponent on the actor.";
    }
}

// Initial setup from default values that will be sent on load
window.addEventListener('message', (event) => {
  const { key, value } = event.data;
  if (key === 'playerName') {
    playerData.name = value;
  }
  if (key === 'health') {
    playerData.health = value;
  }
  renderOutput();
});

// Initial render
renderOutput();
