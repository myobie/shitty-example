import { Application, Router, send } from 'https://deno.land/x/oak/mod.ts'
import loggerMiddleware from 'https://deno.land/x/oak_logger/mod.ts'
import { compilerMiddleware } from './compiler-middleware.ts'

const app = new Application()
const router = new Router()
const encoder = new TextEncoder()
const port = 3000

app.addEventListener('listen', () => {
  console.log(`Listening on http://localhost:${port}`)
})

router
  .get('/_health', c => {
    c.response.headers.set('Content-type', 'application/json')
    c.response.body = JSON.stringify({ ok: true })
  })

// NOTE: add other API routes here

app
  .use(loggerMiddleware.responseTime)
  .use(loggerMiddleware.logger)
  .use(router.routes())
  .use(compilerMiddleware)
  .use((c, next) => {
    if (c.request.url.pathname.startsWith('/sw/')) {
      c.response.status = 500
      c.response.body = encoder.encode(JSON.stringify({
        error: 'service worker request reached the server; something has gone horribly wrong'
      }))
      return
    }

    return next()
  })
  .use(async c => {
    await send(c, c.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      index: 'index.html'
    })
  })
  .listen({ port })
