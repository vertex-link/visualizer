import Actor from "../src/core/Actor.ts";
import Component, { ComponentClass } from "../src/core/component/Component.ts";
import { Scene } from "../src/core/scene/Scene.ts";
import { Event, EventBus, emit, getEventBus, initializeEventBus, on } from "../src/core/events/Event.ts";
import { OnEvent, registerEventListeners, unregisterEventListeners } from "../src/core/events/Decorators.ts";
import { RequireComponent } from "../src/core/component/Decorators.ts";
import { ProcessorRegistry } from "../src/core/processor/ProcessorRegistry.ts";
import { RenderProcessor } from "../src/engine/processors/RenderProcessor.ts";
import { FixedTickProcessor } from "../src/engine/processors/FixedTickProcessor.ts";
import { HOOKED_METHODS_METADATA_KEY } from "../src/core/processor/Decorators.ts"; // For cleanup

// Helper to generate simple IDs (if uuid.ts is not used directly or for simpler cases)
const generateSimpleId = () => Math.random().toString(36).substring(2, 9);

// --- Enums & Interfaces ---
enum CreatureType {
    NORMAL = "Normal",
    FIRE = "Fire",
    WATER = "Water",
    GRASS = "Grass",
    ELECTRIC = "Electric",
}

interface CreatureTemplate {
    id: string;
    name: string;
    type: CreatureType;
    baseStats: { hp: number; attack: number; defense: number; speed: number };
    render: { color: string; shape: 'circle' | 'square' | 'emoji'; emojiChar?: string; size: number };
}

// --- Creature Templates ---
const CREATURE_TEMPLATES: CreatureTemplate[] = [
    { id: 'pika', name: 'Sparky', type: CreatureType.ELECTRIC, baseStats: { hp: 35, attack: 55, defense: 40, speed: 90 }, render: { color: '#FFDE00', shape: 'emoji', emojiChar: '⚡️', size: 40 } },
    { id: 'char', name: 'Flamer', type: CreatureType.FIRE, baseStats: { hp: 39, attack: 52, defense: 43, speed: 65 }, render: { color: '#F08030', shape: 'emoji', emojiChar: '🔥', size: 40 } },
    { id: 'squi', name: 'Shelly', type: CreatureType.WATER, baseStats: { hp: 44, attack: 48, defense: 65, speed: 43 }, render: { color: '#6890F0', shape: 'emoji', emojiChar: '💧', size: 40 } },
    { id: 'bulb', name: 'Leafton', type: CreatureType.GRASS, baseStats: { hp: 45, attack: 49, defense: 49, speed: 45 }, render: { color: '#78C850', shape: 'emoji', emojiChar: '🌿', size: 40 } },
    { id: 'rat', name: 'Squeaky', type: CreatureType.NORMAL, baseStats: { hp: 30, attack: 56, defense: 35, speed: 72 }, render: { color: '#A8A878', shape: 'emoji', emojiChar: '🐀', size: 35 } },
    { id: 'cat', name: 'Meowser', type: CreatureType.NORMAL, baseStats: { hp: 40, attack: 45, defense: 35, speed: 90 }, render: { color: '#A8A090', shape: 'emoji', emojiChar: '😼', size: 40 } },
];

// --- Game Events ---
class BattleStartEvent extends Event<{ playerCreature: Actor; enemyCreature: Actor }> { static readonly eventType = 'game.battle.start'; }
class BattleEndEvent extends Event<{ winner?: Actor; loser?: Actor }> { static readonly eventType = 'game.battle.end'; }
class TurnChangeEvent extends Event<{ activeCreature: Actor; turnNumber: number }> { static readonly eventType = 'game.turn.change'; }
class PlayerAttackCommandEvent extends Event<{ attacker: Actor; defender: Actor }> { static readonly eventType = 'game.command.player_attack'; }
class AIAttackCommandEvent extends Event<{ attacker: Actor; defender: Actor }> { static readonly eventType = 'game.command.ai_attack'; }
class DamageAppliedEvent extends Event<{ defender: Actor; damage: number; attacker: Actor }> { static readonly eventType = 'game.damage.applied'; }
class CreatureFaintedEvent extends Event<{ faintedCreature: Actor; defeatedBy?: Actor }> { static readonly eventType = 'game.creature.fainted'; }
class UIMessageEvent extends Event<{ message: string; type: 'info' | 'battle' | 'warning' | 'success' }> { static readonly eventType = 'game.ui.message'; }

// --- Components ---
class TransformComponent extends Component {
    constructor(actor: Actor, public x: number = 0, public y: number = 0) { super(actor); }
}

class RenderComponent extends Component {
    @RequireComponent(TransformComponent) public transform!: TransformComponent;
    public color: string;
    public size: number;
    public shape: 'circle' | 'square' | 'emoji';
    public emojiChar?: string;
    public isVisible: boolean = true;

    constructor(actor: Actor, template: CreatureTemplate['render']) {
        super(actor);
        this.color = template.color;
        this.size = template.size;
        this.shape = template.shape;
        this.emojiChar = template.emojiChar;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.isVisible) {
            return;
        }
        if (!this.transform) {
            // console.error(`Actor ${this.actor.label} (${this.actor.id}) RenderComponent: TRANSFORM IS UNDEFINED!`);
            return;
        }
        ctx.save();
        ctx.translate(this.transform.x, this.transform.y);

        if (this.shape === 'emoji' && this.emojiChar) {
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.emojiChar, 0, 0);
        } else if (this.shape === 'circle') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'square') {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.restore();
    }
}

class CreatureStatsComponent extends Component {
    public name: string;
    public type: CreatureType;
    public maxHp: number;
    public currentHp: number;
    public attack: number;
    public defense: number;
    public speed: number;

    constructor(actor: Actor, template: CreatureTemplate) {
        super(actor);
        this.name = template.name;
        this.type = template.type;
        this.maxHp = template.baseStats.hp;
        this.currentHp = template.baseStats.hp;
        this.attack = template.baseStats.attack;
        this.defense = template.baseStats.defense;
        this.speed = template.baseStats.speed;
    }

    takeDamage(amount: number): number {
        const actualDamage = Math.max(0, Math.floor(amount)); // Ensure whole numbers for damage
        this.currentHp = Math.max(0, this.currentHp - actualDamage);
        return actualDamage;
    }
}

class PlayerControlledComponent extends Component { constructor(actor: Actor) { super(actor); } }
class AIControlledComponent extends Component { constructor(actor: Actor) { super(actor); } }
class BattleParticipantComponent extends Component { constructor(actor: Actor) { super(actor); } }
class ActiveTurnComponent extends Component { constructor(actor: Actor) { super(actor); } }

// --- Type Effectiveness Logic (Simplified) ---
const typeEffectivenessChart: Record<CreatureType, Record<CreatureType, number>> = {
    [CreatureType.NORMAL]:   { [CreatureType.NORMAL]: 1, [CreatureType.FIRE]: 1, [CreatureType.WATER]: 1, [CreatureType.GRASS]: 1, [CreatureType.ELECTRIC]: 1 },
    [CreatureType.FIRE]:     { [CreatureType.NORMAL]: 1, [CreatureType.FIRE]: 0.5, [CreatureType.WATER]: 0.5, [CreatureType.GRASS]: 2, [CreatureType.ELECTRIC]: 1 },
    [CreatureType.WATER]:    { [CreatureType.NORMAL]: 1, [CreatureType.FIRE]: 2, [CreatureType.WATER]: 0.5, [CreatureType.GRASS]: 0.5, [CreatureType.ELECTRIC]: 1 },
    [CreatureType.GRASS]:    { [CreatureType.NORMAL]: 1, [CreatureType.FIRE]: 0.5, [CreatureType.WATER]: 2, [CreatureType.GRASS]: 0.5, [CreatureType.ELECTRIC]: 1 },
    [CreatureType.ELECTRIC]: { [CreatureType.NORMAL]: 1, [CreatureType.FIRE]: 1, [CreatureType.WATER]: 2, [CreatureType.GRASS]: 0.5, [CreatureType.ELECTRIC]: 0.5 },
};

function calculateTypeEffectiveness(attackerType: CreatureType, defenderType: CreatureType): number {
    return typeEffectivenessChart[attackerType]?.[defenderType] ?? 1;
}

// --- Main Game Class ---
class MiniPokemonGame {
    private scene: Scene;
    private eventBus: EventBus;
    private renderProcessor: RenderProcessor;
    private gameLogicProcessor: FixedTickProcessor;

    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    private playerCreatureActor?: Actor;
    private enemyCreatureActor?: Actor;

    private gameState: 'IDLE' | 'BATTLE_STARTING' | 'PLAYER_TURN' | 'ENEMY_TURN' | 'BATTLE_ENDING' = 'IDLE';
    private turnNumber: number = 0;

    private playerCreatureNameUI!: HTMLElement;
    private playerHpBarUI!: HTMLElement;
    private playerHpTextUI!: HTMLElement;
    private enemyCreatureNameUI!: HTMLElement;
    private enemyHpBarUI!: HTMLElement;
    private enemyHpTextUI!: HTMLElement;
    private findBattleButton!: HTMLButtonElement;
    private attackButton!: HTMLButtonElement;
    private battleActionsUI!: HTMLElement;
    private messageLogUI!: HTMLElement;

    constructor() {
        this.eventBus = new EventBus();
        initializeEventBus(this.eventBus);

        this.scene = new Scene("PokemonBattleScene", this.eventBus);

        const renderP = ProcessorRegistry.get("render");
        if (!renderP) throw new Error("RenderProcessor not registered before game instantiation!");
        this.renderProcessor = renderP as RenderProcessor;

        const logicP = ProcessorRegistry.get("gameLogic");
        if (!logicP) throw new Error("FixedTickProcessor 'gameLogic' not registered before game instantiation!");
        this.gameLogicProcessor = logicP as FixedTickProcessor;

        registerEventListeners(this, this.eventBus);
    }

    public initializeGame(): void {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!this.canvas) throw new Error("Canvas element not found!");
        this.ctx = this.canvas.getContext('2d')!;
        if (!this.ctx) throw new Error("Failed to get 2D context from canvas!");

        this.playerCreatureNameUI = document.getElementById('player-creature-name')!;
        this.playerHpBarUI = document.getElementById('player-hp-bar')!;
        this.playerHpTextUI = document.getElementById('player-hp-text')!;
        this.enemyCreatureNameUI = document.getElementById('enemy-creature-name')!;
        this.enemyHpBarUI = document.getElementById('enemy-hp-bar')!;
        this.enemyHpTextUI = document.getElementById('enemy-hp-text')!;
        this.findBattleButton = document.getElementById('find-battle-button') as HTMLButtonElement;
        this.attackButton = document.getElementById('attack-button') as HTMLButtonElement;
        this.battleActionsUI = document.querySelector('.battle-actions') as HTMLElement;
        this.messageLogUI = document.getElementById('message-log')!;

        if (!this.playerCreatureNameUI || !this.playerHpBarUI || !this.playerHpTextUI ||
            !this.enemyCreatureNameUI || !this.enemyHpBarUI || !this.enemyHpTextUI ||
            !this.findBattleButton || !this.attackButton || !this.battleActionsUI || !this.messageLogUI) {
            console.error("One or more UI elements were not found in the DOM. Check HTML IDs.");
            this.addMessageToLog("Critical Error: UI elements missing. Game cannot start.", "warning");
            return;
        }

        this.resizeCanvas();
        this.setupUIListeners();

        // Relying on @OnEvent for these now, manual subscriptions removed for these two
        // console.log("[DEBUG] Manually subscribing to BattleStartEvent.");
        // this.eventBus.on(BattleStartEvent, (event) => {
        //     console.log("[MANUAL_EVENT_HANDLER] BattleStartEvent received. Calling onBattleStart.");
        //     this.onBattleStart(event);
        // }, this);

        // console.log("[DEBUG] Manually subscribing to TurnChangeEvent.");
        // this.eventBus.on(TurnChangeEvent, (event) => {
        //     console.log("[MANUAL_EVENT_HANDLER] TurnChangeEvent received. Calling onTurnChange.");
        //     this.onTurnChange(event);
        // }, this);

        // Manual subscriptions for attack events are also removed to test decorator path
        // console.log("[DEBUG] Manually subscribing to PlayerAttackCommandEvent.");
        // this.eventBus.on(PlayerAttackCommandEvent, (event) => {
        //     console.log("[MANUAL_EVENT_HANDLER] PlayerAttackCommandEvent received. Calling _processAttack.");
        //     this._processAttack(event);
        // }, this);

        // console.log("[DEBUG] Manually subscribing to AIAttackCommandEvent.");
        // this.eventBus.on(AIAttackCommandEvent, (event) => {
        //     console.log("[MANUAL_EVENT_HANDLER] AIAttackCommandEvent received. Calling _processAttack.");
        //     this._processAttack(event);
        // }, this);


        const playerTemplate = CREATURE_TEMPLATES[0];
        this.playerCreatureActor = this.createCreature(playerTemplate, this.canvas.width * 0.25, this.canvas.height * 0.65);
        this.playerCreatureActor.addComponent(PlayerControlledComponent);
        this.updateCreatureUI(this.playerCreatureActor, 'player');

        this.addMessageToLog("Game initialized. Click 'Find Battle' to start.", "info");
        this.updateOverallUI();
    }

    private resizeCanvas(): void {
        if (!this.canvas || !this.canvas.parentElement) {
            console.warn("Canvas or its parent not ready for resize.");
            return;
        }
        const container = this.canvas.parentElement!;
        this.canvas.width = container.clientWidth;

        if (this.playerCreatureActor) {
            const transform = this.playerCreatureActor.getComponent(TransformComponent);
            if (transform) {
                transform.x = this.canvas.width * 0.25;
                transform.y = this.canvas.height * 0.65;
            }
        }
        if (this.enemyCreatureActor) {
            const transform = this.enemyCreatureActor.getComponent(TransformComponent);
            if (transform) {
                transform.x = this.canvas.width * 0.75;
                transform.y = this.canvas.height * 0.35;
            }
        }
        this.updateOverallUI();
    }

    private setupUIListeners(): void {
        this.findBattleButton.addEventListener('click', () => this.initiateBattle());
        this.attackButton.addEventListener('click', () => {
            if (this.gameState === 'PLAYER_TURN' && this.playerCreatureActor && this.enemyCreatureActor) {
                console.log("[USER_ACTION] Attack button clicked.");
                emit(new PlayerAttackCommandEvent({ attacker: this.playerCreatureActor, defender: this.enemyCreatureActor }));
            }
        });
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private createCreature(template: CreatureTemplate, x: number, y: number): Actor {
        const creatureActor = new Actor(template.name);
        creatureActor.addComponent(TransformComponent, x, y);
        creatureActor.addComponent(RenderComponent, template.render);
        creatureActor.addComponent(CreatureStatsComponent, template);
        this.scene.addActor(creatureActor);
        console.log(`Created creature: ${template.name} (ID: ${creatureActor.id}) at (${x.toFixed(2)}, ${y.toFixed(2)})`);
        return creatureActor;
    }

    private initiateBattle(): void {
        if (this.gameState !== 'IDLE') {
            console.log("[INITIATE_BATTLE] Ignored: Not in IDLE state. Current state:", this.gameState);
            return;
        }
        this.gameState = 'BATTLE_STARTING';
        this.addMessageToLog("Searching for an opponent...", "info");
        console.log("[INITIATE_BATTLE] State set to BATTLE_STARTING. Updating UI.");
        this.updateOverallUI();

        if (this.enemyCreatureActor) {
            console.log(`[INITIATE_BATTLE] Removing previous enemy: ${this.enemyCreatureActor.label}`);
            this.scene.removeActor(this.enemyCreatureActor);
            this.enemyCreatureActor.destroy();
            this.enemyCreatureActor = undefined;
        }

        let enemyTemplate: CreatureTemplate;
        const playerTemplateId = this.playerCreatureActor?.getComponent(CreatureStatsComponent)?.name === CREATURE_TEMPLATES[0].name ? CREATURE_TEMPLATES[0].id : null;

        const possibleEnemyTemplates = CREATURE_TEMPLATES.filter(t => t.id !== playerTemplateId);

        if (possibleEnemyTemplates.length > 0) {
            enemyTemplate = possibleEnemyTemplates[Math.floor(Math.random() * possibleEnemyTemplates.length)];
        } else {
            enemyTemplate = CREATURE_TEMPLATES.find(t => t.id !== playerTemplateId) || CREATURE_TEMPLATES[1] || CREATURE_TEMPLATES[0];
            if (enemyTemplate.id === playerTemplateId) {
                this.addMessageToLog("Warning: Could only find same type for opponent.", "warning");
            }
        }

        this.enemyCreatureActor = this.createCreature(enemyTemplate, this.canvas.width * 0.75, this.canvas.height * 0.35);
        this.enemyCreatureActor.addComponent(AIControlledComponent);

        if (!this.playerCreatureActor) {
            this.addMessageToLog("Player creature not found! Please refresh.", "warning");
            console.error("[INITIATE_BATTLE] Player creature actor is missing!");
            this.gameState = 'IDLE';
            this.updateOverallUI();
            return;
        }

        const playerStats = this.playerCreatureActor.getComponent(CreatureStatsComponent);
        if(playerStats) playerStats.currentHp = playerStats.maxHp;
        const playerRender = this.playerCreatureActor.getComponent(RenderComponent);
        if(playerRender) playerRender.isVisible = true;

        this.playerCreatureActor.addComponent(BattleParticipantComponent);
        this.enemyCreatureActor.addComponent(BattleParticipantComponent);

        this.updateCreatureUI(this.playerCreatureActor, 'player');
        this.updateCreatureUI(this.enemyCreatureActor, 'enemy');

        console.log(`[INITIATE_BATTLE] Emitting BattleStartEvent for ${this.playerCreatureActor.label} vs ${this.enemyCreatureActor.label}`);
        emit(new BattleStartEvent({ playerCreature: this.playerCreatureActor, enemyCreature: this.enemyCreatureActor }));
    }

    @OnEvent(BattleStartEvent)
    private onBattleStart(event: BattleStartEvent): void {
        console.log(`[EVENT_HANDLER_ENTRY] @OnEvent(BattleStartEvent) triggered. Player: ${event.payload.playerCreature.label}, Enemy: ${event.payload.enemyCreature.label}`);
        const playerCreatureName = event.payload.playerCreature.getComponent(CreatureStatsComponent)?.name || "Player";
        const enemyCreatureName = event.payload.enemyCreature.getComponent(CreatureStatsComponent)?.name || "Enemy";
        this.addMessageToLog(`Battle started between ${playerCreatureName} and ${enemyCreatureName}!`, "battle");
        this.turnNumber = 1;

        const playerStats = this.playerCreatureActor!.getComponent(CreatureStatsComponent)!;
        const enemyStats = this.enemyCreatureActor!.getComponent(CreatureStatsComponent)!;

        if (playerStats.speed >= enemyStats.speed) {
            this.playerCreatureActor!.addComponent(ActiveTurnComponent);
            this.enemyCreatureActor!.removeComponent(ActiveTurnComponent);
            this.gameState = 'PLAYER_TURN';
            console.log("[ON_BATTLE_START] Player's turn. New GameState:", this.gameState, ". Emitting TurnChangeEvent.");
            emit(new TurnChangeEvent({ activeCreature: this.playerCreatureActor!, turnNumber: this.turnNumber }));
        } else {
            this.enemyCreatureActor!.addComponent(ActiveTurnComponent);
            this.playerCreatureActor!.removeComponent(ActiveTurnComponent);
            this.gameState = 'ENEMY_TURN';
            console.log("[ON_BATTLE_START] Enemy's turn. New GameState:", this.gameState, ". Emitting TurnChangeEvent.");
            emit(new TurnChangeEvent({ activeCreature: this.enemyCreatureActor!, turnNumber: this.turnNumber }));
        }
    }

    @OnEvent(TurnChangeEvent)
    private onTurnChange(event: TurnChangeEvent): void {
        const activeCreatureLabel = event.payload.activeCreature.label;
        console.log(`[EVENT_HANDLER_ENTRY] @OnEvent(TurnChangeEvent) triggered. Active: ${activeCreatureLabel}, Turn: ${event.payload.turnNumber}`);

        const activeCreatureStats = event.payload.activeCreature.getComponent(CreatureStatsComponent);
        if (!activeCreatureStats) {
            console.warn(`[ON_TURN_CHANGE] Active creature ${activeCreatureLabel} has no stats. Battle may have ended abruptly.`);
            return;
        }
        const activeCreatureName = activeCreatureStats.name;

        this.addMessageToLog(`Turn ${event.payload.turnNumber}: It's ${activeCreatureName}'s turn.`, "battle");

        if (event.payload.activeCreature.hasComponent(PlayerControlledComponent)) {
            this.gameState = 'PLAYER_TURN';
        } else if (event.payload.activeCreature.hasComponent(AIControlledComponent)) {
            this.gameState = 'ENEMY_TURN';
        } else {
            console.warn("[ON_TURN_CHANGE] Active creature has no control component. Setting to IDLE.");
            this.gameState = 'IDLE';
        }
        console.log(`[ON_TURN_CHANGE] GameState is now ${this.gameState}. Updating UI.`);
        this.updateOverallUI();

        if (this.gameState === 'ENEMY_TURN') {
            setTimeout(() => {
                if (this.gameState === 'ENEMY_TURN' && this.enemyCreatureActor && this.playerCreatureActor && this.enemyCreatureActor.getComponent(CreatureStatsComponent)!.currentHp > 0) {
                    console.log("[ON_TURN_CHANGE] AI is attacking.");
                    emit(new AIAttackCommandEvent({ attacker: this.enemyCreatureActor, defender: this.playerCreatureActor }));
                } else {
                    console.log("[ON_TURN_CHANGE] AI turn skipped (battle state changed, creature fainted, or actors missing). Current state:", this.gameState);
                }
            }, 1200);
        } else if (this.gameState === 'PLAYER_TURN') {
            console.log("[ON_TURN_CHANGE] Player's turn. UI updated and waiting for player action.");
        }
    }

    @OnEvent(PlayerAttackCommandEvent)
    private handlePlayerAttack(event: PlayerAttackCommandEvent): void {
        console.log(`[EVENT_HANDLER_ENTRY] @OnEvent(PlayerAttackCommandEvent) triggered for attacker: ${event.payload.attacker.label}`);
        this._processAttack(event);
    }

    @OnEvent(AIAttackCommandEvent)
    private handleAIAttack(event: AIAttackCommandEvent): void {
        console.log(`[EVENT_HANDLER_ENTRY] @OnEvent(AIAttackCommandEvent) triggered for attacker: ${event.payload.attacker.label}`);
        this._processAttack(event);
    }

    private _processAttack(event: PlayerAttackCommandEvent | AIAttackCommandEvent): void {
        console.log(`[_PROCESS_ATTACK] Attacker: ${event.payload.attacker.label}, Defender: ${event.payload.defender.label}, Current GameState: ${this.gameState}`);
        const { attacker, defender } = event.payload;

        if (!attacker.hasComponent(ActiveTurnComponent)) {
            this.addMessageToLog(`Warning: Not ${attacker.getComponent(CreatureStatsComponent)?.name}'s turn.`, "warning");
            console.warn(`[_PROCESS_ATTACK] Attacker ${attacker.label} does not have ActiveTurnComponent.`);
            return;
        }

        const expectedTurnState = attacker.hasComponent(PlayerControlledComponent) ? 'PLAYER_TURN' : 'ENEMY_TURN';
        if (this.gameState !== expectedTurnState) {
            this.addMessageToLog("Battle action already in progress or not current creature's turn.", "info");
            console.warn(`[_PROCESS_ATTACK] GameState mismatch. Expected ${expectedTurnState}, got ${this.gameState}.`);
            return;
        }

        const attackerStats = attacker.getComponent(CreatureStatsComponent)!;
        const defenderStats = defender.getComponent(CreatureStatsComponent)!;

        this.addMessageToLog(`${attackerStats.name} attacks ${defenderStats.name}!`, "battle");

        let damage = Math.floor(attackerStats.attack * (attackerStats.attack / (attackerStats.attack + defenderStats.defense + 1)) * (Math.random() * 0.3 + 0.85) );
        damage = Math.max(1, damage);

        const effectiveness = calculateTypeEffectiveness(attackerStats.type, defenderStats.type);
        damage = Math.floor(damage * effectiveness);

        if (effectiveness > 1) this.addMessageToLog("It's super effective!", "battle");
        if (effectiveness < 1) this.addMessageToLog("It's not very effective...", "battle");

        emit(new DamageAppliedEvent({ defender, damage, attacker }));

        attacker.removeComponent(ActiveTurnComponent);

        if (defender.getComponent(CreatureStatsComponent)!.currentHp > 0) {
            defender.addComponent(ActiveTurnComponent);
            this.turnNumber++;
            console.log(`[_PROCESS_ATTACK] Attack complete. Emitting TurnChangeEvent for ${defender.label}.`);
            emit(new TurnChangeEvent({ activeCreature: defender, turnNumber: this.turnNumber }));
        } else {
            console.log(`[_PROCESS_ATTACK] Defender ${defender.label} fainted. No new turn event from here.`);
            this.updateOverallUI();
        }
    }

    @OnEvent(DamageAppliedEvent)
    private onDamageApplied(event: DamageAppliedEvent): void {
        console.log(`[EVENT_HANDLER_ENTRY] onDamageApplied to ${event.payload.defender.label} for ${event.payload.damage} damage.`);
        const { defender, damage, attacker } = event.payload;
        const defenderStats = defender.getComponent(CreatureStatsComponent)!;

        defenderStats.takeDamage(damage);
        this.addMessageToLog(`${defenderStats.name} took ${damage} damage!`, "battle");

        this.updateCreatureUI(defender, defender.hasComponent(PlayerControlledComponent) ? 'player' : 'enemy');

        if (defenderStats.currentHp <= 0) {
            console.log(`[ON_DAMAGE_APPLIED] ${defenderStats.name} fainted. Emitting CreatureFaintedEvent.`);
            emit(new CreatureFaintedEvent({ faintedCreature: defender, defeatedBy: attacker }));
        }
    }

    @OnEvent(CreatureFaintedEvent)
    private onCreatureFainted(event: CreatureFaintedEvent): void {
        const faintedStats = event.payload.faintedCreature.getComponent(CreatureStatsComponent);
        if (!faintedStats) return;
        const faintedName = faintedStats.name;
        console.log(`[EVENT_HANDLER_ENTRY] onCreatureFainted: ${faintedName}`);

        const faintedRender = event.payload.faintedCreature.getComponent(RenderComponent);
        if (faintedRender) faintedRender.isVisible = false;

        this.addMessageToLog(`${faintedName} fainted!`, "success");

        let winner: Actor | undefined;
        let loser: Actor | undefined = event.payload.faintedCreature;

        if (event.payload.faintedCreature === this.playerCreatureActor) {
            winner = this.enemyCreatureActor;
        } else if (event.payload.faintedCreature === this.enemyCreatureActor) {
            winner = this.playerCreatureActor;
        }

        event.payload.faintedCreature.removeComponent(ActiveTurnComponent);

        this.gameState = 'BATTLE_ENDING';
        console.log(`[ON_CREATURE_FAINTED] GameState is BATTLE_ENDING. Emitting BattleEndEvent.`);
        emit(new BattleEndEvent({ winner, loser }));
    }

    @OnEvent(BattleEndEvent)
    private onBattleEnd(event: BattleEndEvent): void {
        console.log(`[EVENT_HANDLER_ENTRY] onBattleEnd. Winner: ${event.payload.winner?.label}, Loser: ${event.payload.loser?.label}`);
        if (event.payload.winner) {
            const winnerStats = event.payload.winner.getComponent(CreatureStatsComponent);
            if (winnerStats) {
                this.addMessageToLog(`${winnerStats.name} wins the battle!`, "success");
            } else {
                this.addMessageToLog(`A creature wins the battle!`, "success");
            }
        } else {
            this.addMessageToLog("The battle ended!", "info");
        }

        this.playerCreatureActor?.removeComponent(BattleParticipantComponent);
        this.playerCreatureActor?.removeComponent(ActiveTurnComponent);
        this.enemyCreatureActor?.removeComponent(BattleParticipantComponent);
        this.enemyCreatureActor?.removeComponent(ActiveTurnComponent);


        if (this.enemyCreatureActor && event.payload.loser === this.enemyCreatureActor) {
            setTimeout(() => {
                if(this.enemyCreatureActor) {
                    console.log(`[ON_BATTLE_END] Removing defeated enemy: ${this.enemyCreatureActor.label}`);
                    this.scene.removeActor(this.enemyCreatureActor);
                    this.enemyCreatureActor.destroy();
                    this.enemyCreatureActor = undefined;
                    this.updateCreatureUI(undefined, 'enemy');
                }
            }, 1500);
        }

        this.gameState = 'IDLE';
        console.log("[ON_BATTLE_END] GameState is now IDLE. Updating UI.");
        this.updateOverallUI();
    }

    @OnEvent(UIMessageEvent)
    private onUIMessage(event: UIMessageEvent): void {
        this.addMessageToLog(event.payload.message, event.payload.type);
    }

    private updateOverallUI(): void {
        if (!this.findBattleButton || !this.attackButton || !this.battleActionsUI) {
            return;
        }
        // console.log(`[UI_UPDATE] Game State: ${this.gameState}. Attack button will be ${this.gameState === 'PLAYER_TURN' ? 'enabled' : 'disabled'}.`);

        this.findBattleButton.disabled = this.gameState !== 'IDLE';
        this.attackButton.disabled = this.gameState !== 'PLAYER_TURN';
        this.battleActionsUI.style.display = (this.gameState === 'PLAYER_TURN' || this.gameState === 'ENEMY_TURN') ? 'block' : 'none';

        if(this.playerCreatureActor) this.updateCreatureUI(this.playerCreatureActor, 'player');
        if(this.enemyCreatureActor) {
            this.updateCreatureUI(this.enemyCreatureActor, 'enemy');
        } else {
            this.clearEnemyUI();
        }
    }

    private clearEnemyUI(): void {
        if (!this.enemyCreatureNameUI || !this.enemyHpBarUI || !this.enemyHpTextUI) return;
        this.enemyCreatureNameUI.textContent = "Enemy Creature";
        this.enemyHpBarUI.style.width = `0%`;
        this.enemyHpTextUI.textContent = `HP: --/--`;
    }

    private updateCreatureUI(actor: Actor | undefined, type: 'player' | 'enemy'): void {
        const nameUI = type === 'player' ? this.playerCreatureNameUI : this.enemyCreatureNameUI;
        const hpBarUI = type === 'player' ? this.playerHpBarUI : this.enemyHpBarUI;
        const hpTextUI = type === 'player' ? this.playerHpTextUI : this.enemyHpTextUI;

        if (!nameUI || !hpBarUI || !hpTextUI) return;

        if (!actor) {
            nameUI.textContent = type === 'player' ? "Player" : "Opponent";
            hpBarUI.style.width = '0%';
            hpTextUI.textContent = 'HP: --/--';
            return;
        }

        const stats = actor.getComponent(CreatureStatsComponent);
        const renderInfo = actor.getComponent(RenderComponent);

        if (stats) {
            nameUI.textContent = stats.name;
            const hpPercentage = stats.maxHp > 0 ? (stats.currentHp / stats.maxHp) * 100 : 0;
            hpBarUI.style.width = `${hpPercentage}%`;
            hpTextUI.textContent = `HP: ${stats.currentHp}/${stats.maxHp}`;

            hpBarUI.classList.remove('low', 'critical');
            if (hpPercentage < 25) {
                hpBarUI.classList.add('critical');
            } else if (hpPercentage < 50) {
                hpBarUI.classList.add('low');
            }
        }
        if (renderInfo && stats && stats.currentHp <= 0) {
            renderInfo.isVisible = false;
        } else if (renderInfo) {
            renderInfo.isVisible = true;
        }
    }

    private addMessageToLog(message: string, type: UIMessageEvent['payload']['type']): void {
        if (!this.messageLogUI) return;

        const p = document.createElement('p');
        p.textContent = message;
        p.style.color = type === 'battle' ? '#2c3e50' : type === 'success' ? '#27ae60' : type === 'warning' ? '#e67e22' : '#3498db';

        if (this.messageLogUI.firstChild) {
            this.messageLogUI.insertBefore(p, this.messageLogUI.firstChild);
        } else {
            this.messageLogUI.appendChild(p);
        }

        while (this.messageLogUI.children.length > 20) {
            this.messageLogUI.removeChild(this.messageLogUI.lastChild!);
        }
    }

    public renderScene(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const renderables = this.scene.query().withComponent(RenderComponent).execute();
        renderables.forEach(actor => {
            if (this.scene.getActor(actor.id)) {
                actor.getComponent(RenderComponent)?.render(this.ctx);
            }
        });
    }
}

// --- Global Game Instance & Initialization ---
let gameInstance: MiniPokemonGame;

document.addEventListener('DOMContentLoaded', () => {
    if (!ProcessorRegistry.get("render")) {
        console.log("Registering global RenderProcessor.");
        const renderProc = new RenderProcessor("render");
        ProcessorRegistry.register(renderProc);
        renderProc.start();
    }
    if (!ProcessorRegistry.get("gameLogic")) {
        console.log("Registering global FixedTickProcessor 'gameLogic'.");
        const gameLogicProc = new FixedTickProcessor("gameLogic", 2); // Slower tick for turn-based
        ProcessorRegistry.register(gameLogicProc);
        gameLogicProc.start();
    }

    gameInstance = new MiniPokemonGame();
    gameInstance.initializeGame();

    const renderProcInstance = ProcessorRegistry.get("render") as RenderProcessor;
    if (renderProcInstance) {
        const tasksMap = (renderProcInstance as any).tasks as Map<string|symbol, any> | undefined;
        if (!tasksMap || !tasksMap.has('game_render_loop')) {
            console.log("Adding game_render_loop task to RenderProcessor.");
            renderProcInstance.addTask({
                id: 'game_render_loop',
                update: (_deltaTime: number) => {
                    if (gameInstance) {
                        gameInstance.renderScene();
                    }
                },
                context: gameInstance
            });
        }
    } else {
        console.error("Render processor not found for game loop task!");
    }

    (window as any).game = gameInstance;
    console.log("Mini Pokemon Game setup complete. Access via `window.game`.");
});
