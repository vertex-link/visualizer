// examples/game/components.ts
import Actor from '../../src/core/Actor.ts'; // Path updated
import Component from '../../src/core/component/Component.ts'; // Path updated
import { PokemonData } from '../services/PokemonService.ts'; // Path updated

export class PokemonStatsComponent extends Component {
    public data: PokemonData;
    public currentHp: number;
    public level: number = 50;

    constructor(actor: Actor, data: PokemonData) {
        super(actor);
        this.data = data;
        const hpStat = data.stats.find(s => s.name === 'hp')?.value || 30;
        this.currentHp = Math.floor(((2 * hpStat * this.level) / 100) + this.level + 10);
        const hpStatRef = this.data.stats.find(s => s.name === 'hp');
        if(hpStatRef) hpStatRef.value = this.currentHp;
    }

    get maxHp(): number { return this.data.stats.find(s => s.name === 'hp')?.value || 1; }
    get attack(): number { return this.data.stats.find(s => s.name === 'attack')?.value || 1; }
    get defense(): number { return this.data.stats.find(s => s.name === 'defense')?.value || 1; }

    takeDamage(amount: number) { this.currentHp = Math.max(0, this.currentHp - amount); }
}

export class PlayerControlledComponent extends Component {}
export class AIControlledComponent extends Component {}
export class ActiveTurnComponent extends Component {}