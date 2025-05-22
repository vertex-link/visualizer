import Actor from "../src/core/Actor.ts";
import Component from "../src/core/Component.ts";
import System from "../src/core/System.ts";

class CLoggable extends Component {}
class CDommable extends Component {
    domElem: HTMLElement;
    constructor(actor: Actor) {
        super(actor);
        console.log(this);
        this.domElem = document.createElement('div');
        this.domElem.innerText = this.actor.label;
    }
}
class CUpdatable extends Component {}

class DomSystem extends System {
    private domElem: HTMLElement;
    
    addChilds() {
        for (const actor of this.actors) {
            if(actor.hasComponent<CDommable>(CDommable)) {
                this.domElem.append(actor.getComponent<CDommable>(CDommable).domElem)
            }
        }
    }
    start() {
        this.domElem = document.createElement('div');
        this.domElem.classList.add('dom-system');
        document.body.append(this.domElem);
        this.addChilds();
    }
}
class LoggingSystem extends System {
    logLoggables() {
        for (const actor of this.actors) {
            if(actor.hasComponent<CLoggable>(CLoggable)) {
                console.log(`Has CLoggable: ${actor.label}`);
            } else {
                console.log(`Does not have CLoggable: ${actor.label}`);
            }
        }
    }
}

class UpdateSystem extends System {
    private lastTime: number = 0;

    update(deltaTime: number) {
        // console.log(`UpdateSystem: ${deltaTime}`);
        this.actors.forEach(actor => {
            if(!actor.hasComponent<CUpdatable>(CUpdatable)) return;
            if(actor.hasComponent<CDommable>(CDommable)) {
                // console.log(`Has CDommable: ${actor.label} ${deltaTime}`);
                actor.getComponent<CDommable>(CDommable).domElem.innerText = `${actor.label} ${deltaTime}`;
            }
        })
    }

    private requestAnimationFrame() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        window.requestAnimationFrame(() => this.requestAnimationFrame());
    }

    start() {
        this.lastTime = performance.now();
        this.requestAnimationFrame();
    }
}

const logger = new LoggingSystem();
const domSystem = new DomSystem();
const updateSystem = new UpdateSystem();

const myActorLoggableOne = new Actor('myActorLoggableOne');
myActorLoggableOne.addComponent('loggable', CLoggable);
const myActorLoggableTwo = new Actor('myActorLoggableTwo');
myActorLoggableTwo.addComponent('loggable2', CLoggable);

const myActor = new Actor('MyActor');
myActor.addComponent('domable', CDommable);

const timer = new Actor('Delta Time');
timer.addComponent('domable', CDommable);
timer.addComponent('updatable', CUpdatable);

domSystem.start();
updateSystem.start();
logger.logLoggables();
