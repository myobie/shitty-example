// NOTE: preact/debug must be first
import 'https://esm.sh/preact/debug'
import { h, render } from 'https://esm.sh/preact'
import { App } from './app.tsx'

const el = document.getElementById('app') as HTMLElement
render(<App />, el, el.lastChild as Element)
