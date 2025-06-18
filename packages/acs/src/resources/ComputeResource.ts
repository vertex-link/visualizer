// Internal type transformation - user doesn't need to know about this

import {Resource} from "./Resource";

export interface ComputeModule {
    [key: string]: Function;
}

class ComputeResourceBase<T extends ComputeModule = {}> extends Resource<ComputeModule> {

    constructor(name: string, wasmModule: any) {
        super(name, wasmModule);
    }

    protected async loadInternal(): Promise<ComputeModule> {
        // Handle vite-plugin-zig format
        if (this.payload && typeof this.payload.instantiate === 'function') {
            // vite-plugin-zig provides an instantiate function
            const { exports } = await this.payload.instantiate();
            return exports as ComputeModule;
        } else if (this.payload && this.payload.exports && this.payload.instantiated) {
            // vite-plugin-zig with ?instantiate query parameter
            await this.payload.instantiated;
            return this.payload.exports as unknown as ComputeModule;
        } else {
            throw new Error(`Unsupported WASM module format. Expected vite-plugin-zig format with instantiate function or ?instantiate query.`);
        }
    }
}

export interface ComputeResourceConstructor {
    new <T extends Record<string, any> = {}>(
        wasmModule: T
    ): ComputeResourceBase<T> & T;
}

const computeResourceImplementation = class <T extends ComputeModule> extends ComputeResourceBase<T> {

    constructor(wasmModule: T) {
        super(crypto.randomUUID(), wasmModule);

        return new Proxy(this, {
            get: (target, prop) => {
                if(typeof prop === 'string' && prop in target.payload) {
                    return target.payload[prop];
                }

                return (target as any)[prop];
            }
        })
    }
}

export const ComputeResource = computeResourceImplementation as ComputeResourceConstructor;