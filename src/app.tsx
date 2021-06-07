import { useCallback, useEffect, useState } from 'https://esm.sh/preact/hooks'
import { h } from 'https://esm.sh/preact'
import { onIncrement, onStateChange, register, startIncrementing, stopIncrementing } from './client.ts'
import { Increment } from './increment-component.tsx'
import { copy, initialState, merge } from './state.ts'
import type { State } from './state.ts'

export const App = () => {
  const [state, update] = useState(initialState)

  useEffect(() => {
    register('/service-worker.ts?bundle=iife', { update: true })

    onStateChange(s => {
      let isReady: boolean

      if (s === 'unreachable') {
        isReady = false
      } else {
        isReady = true
      }

      update(merge.curry<State>({ isReady }))
    })

    onIncrement(() => {
      update(copy.curry(c => {
        c.count += 1
      }))
    })

    return () => {
      stopIncrementing()
    }
  }, [])

  const start = useCallback(() => {
    update(copy.curry(c => {
      c.isStarted = true
    }))

    startIncrementing()
  }, [])

  const stop = useCallback(() => {
    update(copy.curry(c => {
      c.isStarted = false
    }))

    stopIncrementing()
  }, [])

  if (!state.isReady) {
    return <p>Loading service worker…</p>
  }

  return <Increment {...state} start={start} stop={stop} />
}
