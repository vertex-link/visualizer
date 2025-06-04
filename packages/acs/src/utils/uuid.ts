/**
 * Generates a simple Version 4 UUID.
 * @returns A string representing the generated UUID.
 */
export function generateUUID(): string {
  // TODO: Delete this and use only cypto... duh!
  return crypto.randomUUID()
}
