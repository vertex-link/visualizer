import PokemonCard from './PokemonCard.ts';
import ActionBar from './ActionBar.ts';
import MessageLog from './MessageLog.ts';
import Actor from '../../../src/core/Actor.ts';
import { Scene } from '../../src/core/scene/Scene.ts';
import { getEventBus, emit } from '../../src/core/events/Event.ts';
import { IPokemonServiceKey } from '../services/PokemonService.ts';
import { PokemonStatsComponent, PlayerControlledComponent, AIControlledComponent } from '../game/components.ts';
import { BattleStartEvent, UIUpdateEvent, UIAnimationEvent, BattleEndEvent, UIMessageEvent } from '../game/events.ts';
const { defineComponent: defineBattleScreen, ref: refBattle, onMounted: onMountedBattle, onUnmounted: onUnmountedBattle, nextTick } = Vue;

export default defineBattleScreen({
    props: { serviceRegistry: Object },
    components: { PokemonCard, ActionBar, MessageLog },
    setup(props) {
        const scene = new Scene("VueBattle", getEventBus());
        const pokemonService = props.serviceRegistry.resolve(IPokemonServiceKey);
        const playerActor = refBattle<Actor | null>(null);
        const enemyActor = refBattle<Actor | null>(null);
        const battleState = refBattle('IDLE');
        const playerCardRef = refBattle(null);
        const enemyCardRef = refBattle(null);

        if (!pokemonService) throw new Error("PokemonService not resolved!");

        const createActor = async (id, isPlayer) => {
            const data = await pokemonService.getPokemon(id);
            const actor = new Actor(data.name);
            actor.addComponent(PokemonStatsComponent, data);
            actor.addComponent(isPlayer ? PlayerControlledComponent : AIControlledComponent);
            scene.addActor(actor);
            return actor;
        };
        const findBattle = async () => {
            battleState.value = 'BUSY';
            emit(new UIMessageEvent({ message: 'Starting battle...', type: 'info' }));
            if (playerActor.value) scene.removeActor(playerActor.value);
            if (enemyActor.value) scene.removeActor(enemyActor.value);
            playerActor.value = await createActor(pokemonService.getRandomPokemonId(), true);
            let enemyId = pokemonService.getRandomPokemonId();
            while(playerActor.value.label === (await pokemonService.getPokemon(enemyId)).name) {
                enemyId = pokemonService.getRandomPokemonId();
            }
            enemyActor.value = await createActor(enemyId, false);
            await nextTick();
            emit(new BattleStartEvent({ player: playerActor.value, enemy: enemyActor.value }));
        };
        const forceUpdate = () => {
            playerActor.value = playerActor.value ? scene.getActor(playerActor.value.id) : null;
            enemyActor.value = enemyActor.value ? scene.getActor(enemyActor.value.id) : null;
        };
        const handleAnim = (e: UIAnimationEvent) => {
            const targetRef = playerActor.value?.id === e.payload.targetId ? playerCardRef.value
                : enemyActor.value?.id === e.payload.targetId ? enemyCardRef.value
                    : null;
            targetRef?.applyAnimation(e.payload.animation);
        };
        const handleEnd = () => battleState.value = 'IDLE';

        onMountedBattle(() => {
            getEventBus().on(UIUpdateEvent, forceUpdate);
            getEventBus().on(UIAnimationEvent, handleAnim);
            getEventBus().on(BattleEndEvent, handleEnd);
        });
        onUnmountedBattle(() => { /* ... cleanup listeners ... */ });

        return { playerActor, enemyActor, battleState, findBattle, playerCardRef, enemyCardRef };
    },
    template: `
        <div class="battle-screen">
            <div class="battle-arena">
                <PokemonCard :actor="enemyActor" :is-player="false" v-if="enemyActor" ref="enemyCardRef"></PokemonCard>
                <PokemonCard :actor="playerActor" :is-player="true" v-if="playerActor" ref="playerCardRef"></PokemonCard>
            </div>
            <MessageLog></MessageLog>
            <ActionBar :player-actor="playerActor" :enemy-actor="enemyActor" v-model:battleState="battleState" @find-battle="findBattle"></ActionBar>
        </div>`
});