import { PlayerChoseMoveEvent, RequestPlayerActionEvent } from '../game/events.ts'; // Path updated
import { getEventBus, emit } from '../../src/core/events/Event.ts'; // Path updated
import { PokemonStatsComponent } from '../game/components.ts'; // Path updated
const { defineComponent: defineActionBar, ref: refAction, computed: computedAction, onMounted: onMountedAction, onUnmounted: onUnmountedAction } = Vue;

export default defineActionBar({
    props: { playerActor: Object, enemyActor: Object, battleState: String },
    emits: ['update:battleState', 'find-battle'],
    setup(props, { emit: vueEmit }) {
        const showMoves = refAction(false);
        const isPlayerTurn = refAction(false);
        const eventBus = getEventBus();
        const playerStats = computedAction(() => props.playerActor?.getComponent(PokemonStatsComponent));
        const handleReq = (e: RequestPlayerActionEvent) => {
            if (e.payload.player === props.playerActor) {
                isPlayerTurn.value = true; showMoves.value = false; vueEmit('update:battleState', 'CHOOSING_ACTION');
            } else {
                isPlayerTurn.value = false; vueEmit('update:battleState', 'BUSY');
            }
        };
        const showMoveSel = () => { showMoves.value = true; vueEmit('update:battleState', 'CHOOSING_MOVE'); };
        const selMove = (move) => {
            emit(new PlayerChoseMoveEvent({ attacker: props.playerActor, defender: props.enemyActor, move }));
            isPlayerTurn.value = false; showMoves.value = false; vueEmit('update:battleState', 'BUSY');
        };
        onMountedAction(() => eventBus.on(RequestPlayerActionEvent, handleReq));
        onUnmountedAction(() => eventBus.off(RequestPlayerActionEvent, handleReq));
        return { showMoves, isPlayerTurn, playerStats, showMoveSelector: showMoveSel, selectMove: selMove };
    },
    template: `
        <div class="action-bar">
            <template v-if="battleState === 'IDLE'">
                 <button @click="$emit('find-battle')">Find Battle</button>
            </template>
            <template v-else-if="isPlayerTurn && battleState !== 'BUSY'">
                <div v-if="!showMoves" class="action-selector">
                    <button @click="showMoveSelector">Fight</button><button disabled>Pokémon</button>
                </div>
                <div v-else class="move-selector">
                    <button v-for="move in playerStats.data.moves" :key="move.name" @click="selectMove(move)">
                        {{ move.name }}
                    </button>
                    <button @click="showMoves = false; $emit('update:battleState', 'CHOOSING_ACTION')">Back</button>
                </div>
            </template>
            <template v-else><button disabled>Waiting...</button></template>
        </div>`
});