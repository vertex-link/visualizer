/**
 * Loading state enumeration for resource loading lifecycle
 * Used to track the current state of resource loading operations
 */

export enum LoadingState {
  /** Resource is not yet initialized */
  IDLE = 'idle',
  /** Resource loading is in progress */
  LOADING = 'loading',
  /** Resource has been successfully loaded */
  LOADED = 'loaded',
  /** Resource loading failed with an error */
  ERROR = 'error',
  /** Resource is being processed/compiled */
  PROCESSING = 'processing',
  /** Resource is ready for use */
  READY = 'ready'
}