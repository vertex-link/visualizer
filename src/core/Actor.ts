import Component, {ComponentClass} from "./Component.ts";
import System from "./System.ts";

export default class Actor {
    label: string;
    private _components: Map<string, Component> = new Map<string, Component>();

    constructor(label: string) {
        this.label = label;
        System.actors.push(this);
    }

    private isComponentDuplicate(component: Component): boolean {
        return Array.from(this._components.values()).some(comp => comp === component);
    }

    private validateComponent(label: string, component: Component): void {
        if (this._components.has(label)) {
            throw new Error(`Component with label '${label}' already exists`);
        }

        if (this.isComponentDuplicate(component)) {
            throw new Error('Component instance already exists in actor');
        }
    }

    private updateDependencies(): void {
        this._components.forEach(component => component.checkAndResolveDependencies());
    }

    private findComponent<T extends Component>(componentType: new (...args: any[]) => T): T | undefined {
        for (const [, component] of this._components) {
            if (component instanceof componentType) {
                return component as T;
            }
        }
        return undefined;
    }

    hasComponent<T extends Component>(componentType: new (...args: any[]) => T): boolean {
        return this.findComponent(componentType) !== undefined;
    }

    getComponent<T extends Component>(componentType: new (...args: any[]) => T): T {
        const component = this.findComponent(componentType);
        if (!component) {
            throw new Error(
                `Component of type ${componentType.name} not found. ` +
                'Please ensure all dependencies are properly initialized. ' +
                'Component access should only occur during initialization.'
            );
        }
        return component;
    }

    addComponent(label: string, componentClass: ComponentClass): void {
        console.log('Adding Component to Actor', this.label, 'with label', label);
        const component = new componentClass(this);
        console.group('add', component.constructor.name, 'Component to', this.label, 'Actor');
        
        console.log('Adding Component to Actor', this.label, 'with label', label);
        
        this.validateComponent(label, component);
        this._components.set(label, component);
        this.updateDependencies();
    }
}