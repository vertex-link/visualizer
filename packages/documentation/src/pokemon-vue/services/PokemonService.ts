import {IService} from "@vertex-link/acs";

export const IPokemonServiceKey: ServiceKey = Symbol.for('IPokemonService');

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const POKE_SPRITE_URL = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

export interface PokemonMove {
    name: string;
    power: number | null;
    type: string;
    accuracy: number | null;
    pp: number | null;
    damage_class: string;
    url: string;
}

export interface PokemonData {
    id: number;
    name: string;
    types: string[];
    stats: { name: string; value: number }[];
    moves: PokemonMove[];
    spriteUrl: string;
}

export interface IPokemonService extends IService {
    getPokemon(idOrName: number | string): Promise<PokemonData>;
    getRandomPokemonId(): number;
}

export class PokemonService implements IPokemonService {
    private cache = new Map<number | string, PokemonData>();
    private moveCache = new Map<string, PokemonMove>();
    private maxPokemonId = 151;

    public getRandomPokemonId(): number {
        return Math.floor(Math.random() * this.maxPokemonId) + 1;
    }

    public async getPokemon(idOrName: number | string): Promise<PokemonData> {
        if (this.cache.has(idOrName)) {
            return this.cache.get(idOrName)!;
        }

        try {
            const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${idOrName}`);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            const data = await response.json();

            const availableMoves = data.moves
                .map((m: any) => m.move.url)
                .slice(0, 10);

            const movesDetails = await Promise.all(
                availableMoves.map((url: string) => this.getMoveDetails(url))
            );

            const attackingMoves = movesDetails
                .filter(m => m.power && (m.damage_class === 'physical' || m.damage_class === 'special'))
                .slice(0, 4);

            const pokemonData: PokemonData = {
                id: data.id,
                name: data.name,
                types: data.types.map((t: any) => t.type.name),
                stats: data.stats.map((s: any) => ({ name: s.stat.name, value: s.base_stat })),
                moves: attackingMoves.length > 0 ? attackingMoves : [await this.getMoveDetails("https://pokeapi.co/api/v2/move/1/")],
                spriteUrl: POKE_SPRITE_URL(data.id),
            };

            this.cache.set(idOrName, pokemonData);
            return pokemonData;
        } catch (error) {
            console.error(`Error fetching Pokemon ${idOrName}:`, error);
            throw error;
        }
    }

    private async getMoveDetails(url: string): Promise<PokemonMove> {
        if (this.moveCache.has(url)) return this.moveCache.get(url)!;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch move: ${url}`);
            const data = await response.json();
            const moveData: PokemonMove = {
                name: data.name.replace('-', ' '),
                power: data.power,
                type: data.type.name,
                accuracy: data.accuracy,
                pp: data.pp,
                damage_class: data.damage_class.name,
                url: url,
            };
            this.moveCache.set(url, moveData);
            return moveData;
        } catch (error) {
            console.error(`Error fetching move ${url}:`, error);
            return { name: 'struggle', power: 50, type: 'normal', accuracy: 100, pp: 10, damage_class: 'physical', url: '' };
        }
    }
}
