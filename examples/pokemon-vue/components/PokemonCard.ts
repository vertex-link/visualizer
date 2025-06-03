import { PokemonStatsComponent } from '../game/components.ts';
const { defineComponent, computed, ref } = Vue;

export default defineComponent({
    props: { actor: Object, isPlayer: Boolean },
    setup(props) {
        const elementRef = ref(null);
        const stats = computed(() => props.actor?.getComponent(PokemonStatsComponent));
        const hpPercentage = computed(() => stats.value ? (stats.value.currentHp / stats.value.maxHp) * 100 : 0);
        const hpClass = computed(() => hpPercentage.value < 20 ? 'critical' : hpPercentage.value < 50 ? 'low' : '');
        const applyAnimation = (cls: string) => {
            if (elementRef.value) {
                elementRef.value.classList.add(cls);
                setTimeout(() => elementRef.value.classList.remove(cls), 1000);
            }
        };
        return { stats, hpPercentage, hpClass, elementRef, applyAnimation };
    },
    template: `
        <div :ref="'elementRef'" class="pokemon-card" :class="{ player: isPlayer, enemy: !isPlayer }" v-if="stats">
            <h3 class="pokemon-name">{{ stats.data.name }}</h3>
            <span class="pokemon-level">Lv. {{ stats.level }}</span>
            <img :src="stats.data.spriteUrl" :alt="stats.data.name">
            <div class="hp-bar-container">
                <div class="hp-bar" :class="hpClass" :style="{ width: hpPercentage + '%' }"></div>
            </div>
            <p class="hp-text">{{ stats.currentHp }} / {{ stats.maxHp }}</p>
        </div>`
});
