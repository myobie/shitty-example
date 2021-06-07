import { exists } from 'https://deno.land/std/fs/mod.ts'
import * as path from 'https://deno.land/std/path/mod.ts'
import type { Middleware } from 'https://deno.land/x/oak/mod.ts'
import { helpers } from 'https://deno.land/x/oak/mod.ts'

const denoExts = ['.ts', '.js', '.tsx', '.jsx']
const decoder = new TextDecoder()
const encoder = new TextEncoder()

export const compilerMiddleware: Middleware = async (c, next) => {
  const rawPath = c.request.url.pathname

  // NOTE: don't try to compile directories
  if (rawPath.endsWith('/')) {
    return next()
  }

  const relPath = `./src${rawPath}`
  const absPath = path.resolve(path.relative(Deno.cwd(), relPath))
  const isFile = await exists(absPath)

  // NOTE: don't try to compile non-existent files
  if (!isFile) {
    return next()
  }

  const ext = path.extname(absPath)

  // NOTE: only try to compile extensions we understand
  if (!denoExts.includes(ext)) {
    return next()
  }

  let contents: Uint8Array

  const query = helpers.getQuery(c)

  try {
    if (query.bundle) {
      contents = await bundleFile(absPath, query.bundle)
    } else {
      contents = await compileFile(absPath)
    }

    c.response.headers.set('Content-type', 'application/javascript')
    c.response.body = contents
  } catch (e) {
    console.error('failed to compile', absPath)
    console.error(e)

    c.response.status = 500
    c.response.headers.set('Content-type', 'plain/text')
    c.response.body = 'Failed to compile'
  }
}

async function compileFile(absPath: string): Promise<Uint8Array> {
  const fileBytes = await Deno.readFile(absPath)
  const fileContents = decoder.decode(fileBytes)

  const { diagnostics, files } = await Deno.emit(absPath, {
    check: false,
    compilerOptions: {
      inlineSourceMap: true,
      jsx: 'react',
      jsxFactory: 'h',
      jsxFragmentFactory: 'Fragment',
      lib: ['esnext'],
      target: 'esnext'
    },
    sources: {
      // NOTE: Passing the sources like this will prevent deno from compiling
      // and exposing all dependencies of the root entrypoint
      [absPath]: fileContents
    }
  })

  const absURL = `${path.toFileUrl(absPath).toString()}.js`
  const result = files[absURL]

  if (diagnostics.length) {
    console.warn(Deno.formatDiagnostics(diagnostics))
  }

  return encoder.encode(result)
}

async function bundleFile(absPath: string, type: string): Promise<Uint8Array> {
  let bundle: 'classic' | 'module'

  if (type === 'iife') {
    bundle = 'classic'
  } else {
    bundle = 'module'
  }

  const { diagnostics, files } = await Deno.emit(absPath, {
    bundle,
    check: false,
    compilerOptions: {
      inlineSourceMap: true,
      jsx: 'react',
      jsxFactory: 'h',
      jsxFragmentFactory: 'Fragment',
      lib: ['esnext', 'webworker'],
      target: 'esnext'
    }
  })

  const result = files['deno:///bundle.js']

  if (diagnostics.length) {
    console.warn(Deno.formatDiagnostics(diagnostics))
  }

  return encoder.encode(result)
}
