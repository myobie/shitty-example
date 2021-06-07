export type State = {
  count: number
  isReady: boolean
  isStarted: boolean
}

export const initialState: State = {
  count: 0,
  isReady: false,
  isStarted: false
}

export function copy<T extends Record<string, unknown>>(o: T, op: (c: T) => T | void): T {
  const copy = Object.assign({}, o)
  const result = op(copy)

  if (result === undefined) {
    return copy
  } else {
    return result
  }
}

copy.curry = function<T extends Record<string, unknown>>(op: (c: T) => T | void): (o: T) => T {
  return (o: T) => copy(o, op)
}

export function merge<T extends Record<string, unknown>>(o: T, m: Partial<T>): T {
  return Object.assign({}, o, m)
}

merge.curry = function<T extends Record<string, unknown>>(m: Partial<T>): (o: T) => T {
  return (o: T) => merge(o, m)
}
