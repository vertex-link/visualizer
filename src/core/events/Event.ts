// src/core/events/EventSystem.ts
import Actor from '../Actor.ts';
import Component from '../component/Component.ts';

// ==================== Event Base Classes ====================
interface Payload<T> {
    data: T;
}

export abstract class Event<T> {
    public readonly timestamp = performance.now();
    public readonly payload?: T;
    target: Actor | Component | null = null;

    constructor(target: Actor | Component = null, payload: T = null) {
        this.payload = payload;
        this.target = target;
    }

    /**
     * Get the event type from the class name
     */
    get type(): string {
        return this.constructor.name;
    }

    /**
     * Static helper to get event type from class
     */
    static get eventType(): string {
        return this.name;
    }
}