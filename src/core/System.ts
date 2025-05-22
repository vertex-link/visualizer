import Actor from "./Actor.ts";

export default class System {
  private _ready: Promise<this>;
  static actors: Actor[] = [];

  constructor() {
    // Initialize the ready promise
    this._ready = Promise.resolve(this);
    
    this.logInitialization();
  }

  /**
   * Logs information about system initialization
   */
  private logInitialization(): void {
    console.group("System");
    console.log(this.constructor.name, "System Initialized");
    console.log("Systemdata:", this);
    console.groupEnd();
  }

  /**
   * Returns a promise that resolves when the system is ready
   */
  public get ready(): Promise<this> {
    return this._ready;
  }

  /**
   * Returns the list of actors in this system
   */
  public get actors(): Actor[] {
    return System.actors; // Return a copy to prevent direct modification
  }
}