import { css } from 'http://esm.sh/@emotion/css'
import { h } from 'https://esm.sh/preact'
import { Number } from './number-component.tsx'

export type Props = {
  count: number
  isStarted: boolean
  start: () => void
  stop: () => void
}

export const Increment = (props: Props) => {
  return (
    <div
      class={css `
        display: flex;
      `}
    >
      <p
        class={css `
          margin-right: 20px;
        `}
      >
        <Number count={props.count} />
      </p>
      <p>
        {props.isStarted
          ? <button onClick={e => props.stop()}>Stop</button>
          : <button onClick={e => props.start()}>Start</button>}
      </p>
    </div>
  )
}
