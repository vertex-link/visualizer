// examples/game/systems.ts
import { emit, getEventBus } from '../../src/core/events/Event.ts';
import { OnEvent, registerEventListeners } from '../../src/core/events/Decorators.ts';
import {
    BattleStartEvent, TurnStartEvent, PlayerChoseMoveEvent, DamageEvent,
    FaintEvent, RequestPlayerActionEvent, UIMessageEvent, UIUpdateEvent,
    UIAnimationEvent, BattleEndEvent
} from './events.ts';
import Actor from '../../../src/core/Actor.ts';
import { PokemonStatsComponent, ActiveTurnComponent } from './components.ts';
import { PokemonMove } from '../services/PokemonService.ts';

export class BattleSystem {
    private player!: Actor;
    private enemy!: Actor;
    private turnNumber = 0;
    private battleInProgress = false;

    constructor() {
        // We rely SOLELY on @OnEvent decorators now.
        // DO NOT call registerEventListeners(this, getEventBus());
        registerEventListeners(this, getEventBus()); // Keep this IF your @OnEvent needs it, REMOVE if @OnEvent auto-registers via addInitializer. Based on your logs, it seems *both* were running, so let's try KEEPING it but adding checks. *Correction*: Based on the error, the best approach is to REMOVE the manual call IF the decorator handles it. If the decorator ONLY adds metadata, you NEED the manual call. Given the decorator logs, it *seems* it tries to register. Let's assume the decorator *should* work and remove the manual call. If errors persist, the decorator itself needs review.
        console.log("BattleSystem Initialized. @OnEvent decorators will handle event registration.");
    }

    @OnEvent(BattleStartEvent)
    private onBattleStart(event: BattleStartEvent): void {
        // Prevent re-starting if an event somehow fires twice
        if (this.battleInProgress) {
            console.warn("BattleStartEvent received while battle already in progress. Ignoring.");
            return;
        }

        console.log("Battle Started:", event.payload);
        this.player = event.payload.player;
        this.enemy = event.payload.enemy;
        this.turnNumber = 1;
        this.battleInProgress = true;
        emit(new UIMessageEvent({ message: `Battle between ${this.player.label} and ${this.enemy.label} starts!`, type: 'info' }));
        // Player goes first for now
        this.startTurn(this.player);
    }

    private startTurn(activePokemon: Actor): void {
        if (!this.battleInProgress) return;

        emit(new UIMessageEvent({ message: `Turn ${this.turnNumber}: ${activePokemon.label}'s turn!`, type: 'info' }));

        const opponent = activePokemon === this.player ? this.enemy : this.player;

        // Ensure opponent doesn't have the turn
        opponent.removeComponent(ActiveTurnComponent);

        // Add component only if it doesn't exist
        if (!activePokemon.hasComponent(ActiveTurnComponent)) {
            activePokemon.addComponent(ActiveTurnComponent);
        }

        // Request action based on who is active
        if(activePokemon === this.player) {
            emit(new RequestPlayerActionEvent({ player: this.player }));
        } else {
            // AI takes its turn after a delay
            setTimeout(() => this.processAITurn(), 1500);
        }

        emit(new TurnStartEvent({ activePokemon: activePokemon, turn: this.turnNumber }));
        emit(new UIUpdateEvent({})); // Ensure UI reflects turn change
    }

    private processAITurn(): void {
        if (!this.battleInProgress) return;
        const enemyStats = this.enemy.getComponent(PokemonStatsComponent);
        if (enemyStats && enemyStats.data.moves.length > 0) {
            // Simple AI: Choose a random move
            const moveIndex = Math.floor(Math.random() * enemyStats.data.moves.length);
            const move = enemyStats.data.moves[moveIndex];
            this.processMove({ attacker: this.enemy, defender: this.player, move });
        } else {
            // Should not happen, but handle gracefully
            emit(new UIMessageEvent({ message: `${this.enemy.label} doesn't know what to do!`, type: 'warning' }));
            this.endTurn(this.enemy);
        }
    }


    @OnEvent(PlayerChoseMoveEvent)
    private onPlayerMove(event: PlayerChoseMoveEvent): void {
        if (!this.battleInProgress || event.payload.attacker !== this.player) return; // Check turn
        this.processMove(event.payload);
    }

    private processMove(payload: { attacker: Actor; defender: Actor; move: PokemonMove }): void {
        const { attacker, defender, move } = payload;
        const attackerStats = attacker.getComponent(PokemonStatsComponent)!;
        const defenderStats = defender.getComponent(PokemonStatsComponent)!;

        emit(new UIMessageEvent({ message: `${attackerStats.data.name} used ${move.name}!`, type: 'battle' }));
        emit(new UIAnimationEvent({ targetId: attacker.id, animation: 'attack-anim' }));


        // Simple Damage Calculation
        const power = move.power || 40;
        const attack = attackerStats.attack;
        const defense = defenderStats.defense;
        let damage = Math.floor((((2 * attackerStats.level / 5 + 2) * power * attack / defense) / 50) + 2);
        damage = Math.max(1, Math.floor(damage * (Math.random() * 0.15 + 0.85)));

        // Apply damage after a short delay for animation
        setTimeout(() => {
            emit(new UIAnimationEvent({ targetId: defender.id, animation: 'shake' }));
            defenderStats.takeDamage(damage);
            emit(new DamageEvent({ target: defender, damage, message: `It dealt ${damage} damage!` }));
            emit(new UIMessageEvent({ message: `It dealt ${damage} damage!`, type: 'battle' }));
            emit(new UIUpdateEvent({})); // Update UI with new HP

            // Check for faint, otherwise end turn
            if (defenderStats.currentHp <= 0) {
                emit(new FaintEvent({ fainted: defender }));
            } else {
                this.endTurn(attacker);
            }
        }, 500);
    }

    private endTurn(lastAttacker: Actor): void {
        if (!this.battleInProgress) return;

        lastAttacker.removeComponent(ActiveTurnComponent); // Remove turn from current
        const nextAttacker = lastAttacker === this.player ? this.enemy : this.player;

        // Increment turn number only after the enemy (second player) has moved
        if (lastAttacker === this.enemy) {
            this.turnNumber++;
        }

        this.startTurn(nextAttacker); // Start the next turn
    }

    @OnEvent(FaintEvent)
    private onFaint(event: FaintEvent): void {
        if (!this.battleInProgress) return; // Ensure we only process faints once per battle end

        const fainted = event.payload.fainted;
        emit(new UIAnimationEvent({ targetId: fainted.id, animation: 'faint' }));
        emit(new UIMessageEvent({ message: `${fainted.label} fainted!`, type: 'warning' }));

        this.battleInProgress = false; // Stop further battle actions
        fainted.removeComponent(ActiveTurnComponent); // Ensure fainted actor isn't active

        const winner = fainted === this.player ? this.enemy : this.player;

        // Announce winner after a delay
        setTimeout(() => {
            emit(new UIMessageEvent({ message: `${winner.label} wins!`, type: 'success' }));
            emit(new BattleEndEvent({ winner: winner }));
            emit(new UIUpdateEvent({})); // Final UI update for 'IDLE' state
        }, 1500);
    }
}