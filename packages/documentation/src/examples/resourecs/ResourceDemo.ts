import {Actor, Component, RequireComponent, Resource} from "@vertex-link/acs";
import { ResourceComponent } from "@vertex-link/acs";
import { TransformComponent } from "@vertex-link/engine";

type ResourceData = {
  text: string;
}

class DependencyTestComponent extends Component {
  @RequireComponent(ResourceComponent)
  resources: ResourceComponent;
  
  @RequireComponent(TransformComponent)
  transform: TransformComponent;
  
  constructor(actor: Actor) {
    super(actor);
    console.log('[DEBUG] DependencyTestComponent constructor - dependencies not yet checked');
  }

  protected onDependenciesResolved(): void {
    console.log('[DEBUG] DependencyTestComponent - all dependencies resolved!');
    console.log('[DEBUG] this.resources:', this.resources);
    console.log('[DEBUG] this.transform:', this.transform);
    
    // Now you can safely use your dependencies
    this.initializeWithDependencies();
  }

  protected onDependenciesLost(): void {
    console.log('[DEBUG] DependencyTestComponent - dependencies lost, cleaning up');
    // Handle cleanup when dependencies are removed
  }

  private initializeWithDependencies(): void {
    // Your component initialization logic that requires dependencies
  }
} 

class CustomActor extends Actor {
  @RequireComponent(ResourceComponent)
  resources: ResourceComponent;

  public someMethod(): void {
    // Safe access - will warn if not available but won't crash
    const resources = this.resources;
    if (resources) {
      // Use resources safely
      console.log('Resources available:', resources);
    } else {
      console.log('Resources not yet available, skipping operation');
    }
  }

  // Alternative explicit approach
  public anotherMethod(): void {
    const resources = this.getDependency(ResourceComponent);
    if (resources) {
      // Use resources
    }
  }

  constructor() {
    super('customactor');
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
    console.log('[DEBUG] onInitialize - checking decorator');
    
    // Debug the component system
    console.log('[DEBUG] All components:', this.getAllComponents());
    console.log('[DEBUG] Has ResourceComponent:', this.hasComponent(ResourceComponent));
    console.log('[DEBUG] getComponent(ResourceComponent):', this.getComponent(ResourceComponent));
    
    // Debug the decorator
    console.log('[DEBUG] Constructor dependencies:', (this.constructor as any)._componentDependencies);
    
    // Now test the decorator getter
    console.log('[DEBUG] Accessing this.resources (decorator getter):', this.resources);
    
    // Try accessing it again
    setTimeout(() => {
      console.log('[DEBUG] Delayed access to this.resources:', this.resources);
    }, 0);
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