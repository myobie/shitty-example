/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

export async function getWindowClientById(clientId: string): Promise<WindowClient | null> {
  const client = await self.clients.get(clientId) as WindowClient
  return windowClient(client)
}

// deno-lint-ignore require-await
export async function getWindowClientFromMessageEvent(e: ExtendableMessageEvent): Promise<WindowClient | null> {
  const client = e.source as WindowClient
  return windowClient(client)
}

function windowClient(client?: WindowClient): WindowClient | null {
  if (!client) {
    return null
  }

  if (client.type !== 'window') {
    console.error('unexpectedly recieved a message from a non-window client')
    return null
  }

  return client
}

export function getAllWindowClients(): Promise<readonly WindowClient[]> {
  return self.clients.matchAll({ type: 'window' })
}
