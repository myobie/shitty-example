import { css } from 'http://esm.sh/@emotion/css'
import { h } from 'https://esm.sh/preact'

export type Props = {
  count: number
}

export const Number = (props: Props) => {
  let color: string

  if (props.count > 10) {
    color = 'red'
  } else {
    color = 'blue'
  }

  return (
    <span
      class={css `
        color: ${color};
      `}
    >
      {props.count}
    </span>
  )
}
