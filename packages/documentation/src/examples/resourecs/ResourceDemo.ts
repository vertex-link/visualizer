import {Actor, Component, Resource} from "@vertex-link/acs";
import { ResourceComponent } from "@vertex-link/acs";
import { TransformComponent } from "@vertex-link/engine";

type ResourceData = {
  text: string;
}

class DependencyTestComponent extends Component {
  _resources?: ResourceComponent;
  _transform?: TransformComponent;
  
  constructor(actor: Actor) {
    super(actor);
  }

  get transform(): TransformComponent {
    if (this._transform) {
      return this._transform;
    }

    this._transform = this.actor.getComponent(TransformComponent);
    if (!this._transform) {
      throw new Error('Transform not initialized');
    }
    return this._transform;
  }
  
  get resources(): ResourceComponent {
    if (this._resources) {
      return this._resources;
    }

    this._resources = this.actor.getComponent(ResourceComponent);
    if (!this._resources) {
      throw new Error('Transform not initialized');
    }
    return this._resources;
  }

  private initializeWithDependencies(): void {
    // Your component initialization logic that requires dependencies
  }
} 

class CustomActor extends Actor {
  resources?: ResourceComponent;

  constructor() {
    super('customactor');
    this.resources = this.getComponent(ResourceComponent);
  }

  protected onBeforeInitialize(): void {
    console.log('[DEBUG] onBeforeInitialize - adding components');
    // Add components here - decorators not yet processed
    const resourceComponent = this.addComponent(ResourceComponent);
    
    console.log('[DEBUG] Added ResourceComponent:', resourceComponent);
    console.log('[DEBUG] Has ResourceComponent after adding:', this.hasComponent(ResourceComponent));
    console.log('[DEBUG] Can get ResourceComponent:', this.getComponent(ResourceComponent));
  }

  protected onInitialize(): void {
  }
}

class CustomResource extends Resource<ResourceData> {
  constructor(name: string, payload: ResourceData) {
    super(name, payload)
  }

  async compile(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.payload.text = this.payload.text.toUpperCase();
        console.log('Compilation completed after 3 seconds');
        resolve();
      }, 3000);
    });
  }

  protected async loadInternal(): Promise<ResourceData> {
    return this.payload;
  }
}

export class ResourceDemo {
  resource: CustomResource;
  constructor() {
    console.log('resources are fun');

    const myActor = new CustomActor();
    myActor.addComponent(TransformComponent);
    myActor.addComponent(DependencyTestComponent);

    console.log('Actor components:', myActor.getAllComponents());
    console.log('Has ResourceComponent:', myActor.hasComponent(ResourceComponent));

    this.resource = new CustomResource('one', { text: 'das is sooo cools' });

    this.resource.whenLoaded().then(res => console.log(res));
  }
}