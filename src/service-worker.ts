/// <reference lib="webworker" />

import { getWindowClientById, getWindowClientFromMessageEvent } from './window-client.ts'

declare let self: ServiceWorkerGlobalScope

const incrementDelay = 3000
const incrementTimers: Map<string, number> = new Map()

// NOTE: periodically sweep timers
setInterval(() => sweepTimers(), 10000)

self.addEventListener('install', (e: ExtendableEvent) => {
  console.debug('install')
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (e: ExtendableEvent) => {
  console.debug('activate')
  e.waitUntil(self.clients.claim())
})

self.addEventListener('message', e => {
  e.waitUntil((async () => {
    console.debug('message', e.data)

    // NOTE: setup the getWindowClientId command callback
    if (e.data.command === 'getWindowClientId') {
      const client = await getWindowClientFromMessageEvent(e)

      if (client) {
        client.postMessage({
          command: 'receiveWindowClientId',
          clientId: client.id
        })
      }

      return
    }

    // NOTE: other commands go here
    if (e.data.command === 'startIncrementTimer') {
      console.debug('start')

      const client = await getWindowClientFromMessageEvent(e)

      if (client && client.id) {
        const incrementTimer = setInterval(() => {
          postIncrmentMessage(client)
        }, incrementDelay)

        incrementTimers.set(client.id, incrementTimer)
      }

      return
    }

    if (e.data.command === 'stopIncrementTimer') {
      console.debug('stop')

      const client = await getWindowClientFromMessageEvent(e)

      if (client && client.id) {
        const incrementTimer = incrementTimers.get(client.id)
        clearInterval(incrementTimer)
      }
    }
  })())
})

self.addEventListener('fetch', e => {
  // deno-lint-ignore require-await
  e.waitUntil((async () => {
    try {
      const url = new URL(e.request.url)

      // NOTE: don't process non-GETs
      if (e.request.method !== 'GET') {
        e.respondWith(fetch(e.request))
      }

      // NOTE: forward outside requests
      if (url.origin !== self.location.origin) {
        e.respondWith(fetch(e.request))
      }

      // NOTE: always respond to pings
      if (url.pathname === '/sw/ping') {
        const resp = new Response('pong', {
          status: 200,
          headers: {
            'content-type': 'text/plain'
          }
        })
        e.respondWith(resp)
      }

      // NOTE: other request handlers go here
    } catch (e) {
      const resp = new Response(String(e), {
        status: 500,
        headers: {
          'content-type': 'text/plain'
        }
      })
      e.respondWith(resp)
    }
  })())
})

function postIncrmentMessage(client: WindowClient): void {
  console.debug('posting increment message…')
  client.postMessage({ command: 'increment' })
}

async function sweepTimers(): Promise<void> {
  for (const [clientId, timer] of incrementTimers) {
    const client = await getWindowClientById(clientId)

    if (!client) {
      console.debug(`${clientId} client is no longer with us`)
      incrementTimers.delete(clientId)
    }
  }
}
