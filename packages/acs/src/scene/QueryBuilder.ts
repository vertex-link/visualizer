import type { ComponentClass } from "../component/Component";
import type { IQueryDataProvider, QueryCondition } from "./QueryCondition";

/**
 * Core QueryBuilder - handles building and executing queries
 */
export class QueryBuilder<T = any> {
  protected conditions: QueryCondition[] = [];
  protected maxResults?: number;
  protected sortBy?: (a: T, b: T) => number;

  /**
   * Filter by components - actors must have ALL specified components
   */
  withComponent(...components: ComponentClass[]): this {
    this.conditions.push({ type: "component", components });
    return this;
  }

  /**
   * Filter by tags - actors must have ANY of the specified tags
   */
  withTag(...tags: string[]): this {
    this.conditions.push({ type: "tag", tags });
    return this;
  }

  /**
   * Exclude actors with any of the specified tags
   */
  withoutTag(...tags: string[]): this {
    this.conditions.push({ type: "excludeTag", tags });
    return this;
  }

  /**
   * Limit number of results
   */
  limit(count: number): this {
    this.maxResults = count;
    return this;
  }

  /**
   * Sort results
   */
  orderBy(compareFn: (a: T, b: T) => number): this {
    this.sortBy = compareFn;
    return this;
  }

  /**
   * Execute the query
   */
  execute(dataProvider: IQueryDataProvider): T[] {
    let candidates: Set<T> | undefined;

    // Apply all conditions using intersection
    for (const condition of this.conditions) {
      const conditionResults = this.evaluateCondition(condition, dataProvider);

      if (candidates === undefined) {
        candidates = new Set(conditionResults);
      } else {
        // Intersection
        candidates = new Set([...candidates].filter((actor) => conditionResults.has(actor)));
      }

      // Early exit if no matches
      if (candidates.size === 0) return [];
    }

    // Convert to array
    let results = Array.from(candidates || dataProvider.getAllActors());

    // Apply sorting
    if (this.sortBy) {
      results.sort(this.sortBy);
    }

    // Apply limit
    if (this.maxResults) {
      results = results.slice(0, this.maxResults);
    }

    return results;
  }

  /**
   * Evaluate a single condition - can be overridden by subclasses
   */
  protected evaluateCondition(condition: QueryCondition, dataProvider: IQueryDataProvider): Set<T> {
    switch (condition.type) {
      case "component":
        return dataProvider.getActorsWithAllComponents(condition.components) as Set<T>;
      case "tag":
        return dataProvider.getActorsWithAnyTag(condition.tags) as Set<T>;
      case "excludeTag":
        return dataProvider.getActorsWithoutTags(condition.tags) as Set<T>;
      default:
        return new Set();
    }
  }
}
