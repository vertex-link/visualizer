import { UIMessageEvent } from '../game/events.ts';
import { getEventBus } from '../../src/core/events/Event.ts';
const { defineComponent: defineMsgLog, ref: refMsg, onMounted: onMountedMsg, onUnmounted: onUnmountedMsg } = Vue;

export default defineMsgLog({
    setup() {
        const messages = refMsg<{ text: string, type: string }[]>([]);
        const eventBus = getEventBus();
        const addMessage = (event: UIMessageEvent) => messages.value.unshift({ text: event.payload.message, type: event.payload.type });
        onMountedMsg(() => {
            eventBus.on(UIMessageEvent, addMessage);
            addMessage(new UIMessageEvent({ message: 'Welcome! Click "Find Battle" to start.', type: 'info' }));
        });
        onUnmountedMsg(() => eventBus.off(UIMessageEvent, addMessage));
        return { messages };
    },
    template: `
        <div class="message-log">
            <p v-for="(msg, index) in messages" :key="index" :class="msg.type">{{ msg.text }}</p>
        </div>`
});
