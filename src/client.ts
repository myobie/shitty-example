/// <reference lib="webworker" />

export type MessageCallback = (e: MessageEvent) => void
type WorkerState = 'unreachable' | 'reachable'
type WorkerStateCallback = (state: WorkerState) => void

const pingTimeout = 10000

const messageCallbacks: Set<MessageCallback> = new Set()
let heartbeatInterval = 0
let workerState: WorkerState = 'unreachable'
const workerStateCallbacks: Set<WorkerStateCallback> = new Set()

function updateWorkerState(state: WorkerState): void {
  if (workerState !== state) {
    workerState = state

    for (const cb of workerStateCallbacks) {
      cb(state)
    }
  }
}

export function onStateChange(cb: WorkerStateCallback): WorkerStateCallback {
  workerStateCallbacks.add(cb)
  return cb
}

export function startIncrementing(): void {
  postMessage({ command: 'startIncrementTimer' })
}

export function stopIncrementing(): void {
  postMessage({ command: 'stopIncrementTimer' })
}

export function onIncrement(cb: () => Promise<void> | void): void {
  messageCallbacks.add(cb)
}

export function register(
  url: string | URL,
  opts: { update?: boolean; scope?: string }
): Promise<ServiceWorkerRegistration> {
  opts = opts || {}
  const shouldUpdate = !!opts.update

  return new Promise((resolve, reject) => {
    if (!('navigator' in self && 'serviceWorker' in navigator)) {
      updateWorkerState('unreachable')
      reject(new Error('browser must have service workers'))
      return
    }

    let pinging = false
    let success = false

    const pingLater = () => {
      if (pinging || success) { return }
      pinging = true

      // NOTE: need to delay until next tick
      setTimeout(() => {
        heartbeat()
          .then(() => {
            pinging = false
            success = true
            resolve(navigator.serviceWorker.ready)
            startHeartbeat()
          })
          .catch(err => {
            reject(err)
            pinging = false
            setTimeout(() => pingLater(), 10000)
          })
      }, 1)
    }

    navigator.serviceWorker.addEventListener('message', e => {
      for (const cb of messageCallbacks) {
        cb(e)
      }
    })

    // TODO: this will double resolve if the SW is updated while this client is still instantiated
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (navigator.serviceWorker.controller === null) {
        updateWorkerState('unreachable')
        reject(new Error('error installing service worker'))
        return
      }

      pingLater()
    })

    window.navigator.serviceWorker.register(url, { scope: opts.scope })
      .then(reg => {
        if (shouldUpdate) {
          return reg.update()
        }
      })
      .then(() => {
        pingLater()
      })
      .catch(e => {
        updateWorkerState('unreachable')
        reject(e)
      })
  })
}

export function postMessage(data: unknown, transfer: Transferable[] = []): void {
  if (navigator.serviceWorker.controller) {
    console.debug('sending message to sw', data)
    navigator.serviceWorker.controller.postMessage(data, transfer)
  } else {
    // TODO: queue up a buffer of message to send when possible?
    throw new Error('service worker not ready to receive messages')
  }
}

export async function unregisterAll(): Promise<void> {
  if (!('navigator' in self && 'serviceWorker' in navigator)) {
    throw new Error('browser must have service workers')
  }

  const registrations = await navigator.serviceWorker.getRegistrations()

  for (const registration of registrations) {
    await registration.unregister()
  }
}

function ping(): Promise<void> {
  return new Promise((resolve, reject) => {
    let isResolved = false
    // TODO: support older browsers that don't have the fetch abort stuff
    const controller = new AbortController()
    const signal = controller.signal

    // NOTE: it shouldn't take more than 5 seconds to respond to the ping, right?
    const timeout = setTimeout(() => {
      if (isResolved) { return }
      controller.abort()
      isResolved = true
      reject(new Error('ping timeout'))
    }, pingTimeout)

    fetch('/sw/ping', { signal }).then(response => {
      return response.text()
    }).then(answer => {
      if (isResolved) { return }
      clearTimeout(timeout)
      isResolved = true

      if (answer === 'pong') {
        resolve()
      } else {
        reject(new Error('no pong'))
      }
    }).catch(() => {
      if (isResolved) { return }
      clearTimeout(timeout)
      isResolved = true

      reject(new Error('ping request failed'))
    })
  })
}

function startHeartbeat(interval = 25000): void {
  // NOTE: clear any existing intervals
  clearInterval(heartbeatInterval)
  heartbeatInterval = 0

  // NOTE: don't let us have a heartbeat that is faster than a possible ping timeout
  if (interval < pingTimeout) {
    interval = pingTimeout + 1000
  }

  heartbeatInterval = setInterval(() => {
    heartbeat()
  }, interval) as unknown as number
}

export function stopHeartbeat(): void {
  clearInterval(heartbeatInterval)
  heartbeatInterval = 0
}

async function heartbeat(): Promise<void> {
  try {
    await ping()
    updateWorkerState('reachable')
  } catch {
    updateWorkerState('unreachable')
    throw new Error('service worker unreachable')
  }
}
