// Router location state is `unknown`; this reads the `{ from }` convention without casts.
export function getFrom(state: unknown): string | undefined {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string'
  ) {
    return state.from
  }
  return undefined
}
