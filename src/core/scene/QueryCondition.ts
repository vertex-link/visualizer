// src/core/scene/QueryCondition.ts

import { ComponentClass } from '../component/Component.ts';

/**
 * Query condition types
 */
export interface ComponentQueryCondition {
    readonly type: 'component';
    readonly components: ComponentClass[];
}

export interface TagQueryCondition {
    readonly type: 'tag';
    readonly tags: string[];
}

export interface ExcludeTagQueryCondition {
    readonly type: 'excludeTag';
    readonly tags: string[];
}

export type QueryCondition = ComponentQueryCondition | TagQueryCondition | ExcludeTagQueryCondition;

/**
 * Interface for providing data to query builders
 */
export interface IQueryDataProvider {
    getAllActors(): Set<any>;
    getActorsWithAnyTag(tags: string[]): Set<any>;
    getActorsWithAllComponents(components: ComponentClass[]): Set<any>;
    getActorsWithoutTags(tags: string[]): Set<any>;
}