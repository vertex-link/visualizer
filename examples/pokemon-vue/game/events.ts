// examples/game/events.ts
import { Event } from '../../../src/core/events/Event.ts'; // Path updated
import Actor from '../../../src/core/Actor.ts'; // Path updated
import { PokemonMove } from '../services/PokemonService.ts'; // Path updated

export class BattleStartEvent extends Event<{ player: Actor; enemy: Actor }> { static readonly eventType = 'poke.battle.start'; }
export class BattleEndEvent extends Event<{ winner?: Actor }> { static readonly eventType = 'poke.battle.end'; }
export class TurnStartEvent extends Event<{ activePokemon: Actor; turn: number }> { static readonly eventType = 'poke.turn.start'; }
export class RequestPlayerActionEvent extends Event<{ player: Actor }> { static readonly eventType = 'poke.action.request'; }
export class PlayerChoseMoveEvent extends Event<{ attacker: Actor; defender: Actor; move: PokemonMove }> { static readonly eventType = 'poke.action.move'; }
export class DamageEvent extends Event<{ target: Actor; damage: number; message: string }> { static readonly eventType = 'poke.damage'; }
export class FaintEvent extends Event<{ fainted: Actor }> { static readonly eventType = 'poke.faint'; }
export class UIMessageEvent extends Event<{ message: string; type: 'info' | 'battle' | 'success' | 'warning' }> { static readonly eventType = 'poke.ui.message'; }
export class UIUpdateEvent extends Event<{}> { static readonly eventType = 'poke.ui.update'; }
export class UIAnimationEvent extends Event<{ targetId: string; animation: string }> { static readonly eventType = 'poke.ui.animation'; }