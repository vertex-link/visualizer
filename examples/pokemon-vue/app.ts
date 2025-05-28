// examples/app.ts
import { getEventBus, initializeEventBus, EventBus } from '../src/core/events/Event.ts';
import { ServiceRegistry } from '../src/core/Service.ts';
import { PokemonService, IPokemonServiceKey } from './services/PokemonService.ts';
import { BattleSystem } from './game/systems.ts';
import BattleScreen from './components/BattleScreen.ts';
import PokemonCard from './components/PokemonCard.ts';
import ActionBar from './components/ActionBar.ts';
import MessageLog from './components/MessageLog.ts';

const { createApp } = Vue;

// 1. Initialize Core Systems
initializeEventBus(new EventBus());
const serviceRegistry = new ServiceRegistry();
serviceRegistry.register(IPokemonServiceKey, new PokemonService());
const battleSystem = new BattleSystem();

// 2. Create Vue App
const app = createApp({
    data: () => ({ registry: serviceRegistry }), // Provide registry to root
    template: `<BattleScreen :serviceRegistry="registry"></BattleScreen>`
});

// 3. Register Vue Components
app.component('BattleScreen', BattleScreen);
app.component('PokemonCard', PokemonCard);
app.component('ActionBar', ActionBar);
app.component('MessageLog', MessageLog);

// 4. Mount Vue App
app.mount('#app');

console.log("Vue Pokémon App Initialized!");
(window as any).registry = serviceRegistry; // For debugging