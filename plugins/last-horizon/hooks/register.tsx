import type { Register, ThemeSetArgs, ThemeMessageRule } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BLINK } from './scene'

// The still wallpaper is the same portrait with the blink animation taken out.
// (The old traced ground was over the app's 100,000-character backdrop limit,
// so the app refused the whole theme.)
const STILL = BLINK.replace(/<style>[\s\S]*?<\/style>/, '')

// The Last Horizon palette: near-black, bone white, dusty rose, faded teal.
const { theme, problems } = makeColors({
  label: 'Last Horizon',
  only: 'dark',
  roles: { accent: '#b59790', danger: '#c38b7b', success: '#87a9b0', warning: '#c9a16e', pro: '#a5a0b6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0c0b0c',
        'surface-1': '#131012',
        'surface-2': '#191517',
        'surface-3': '#1e191b',
        'text-primary': '#f4f1ef',
        'text-secondary': '#cfd3cd',
        'text-muted': '#a69c9a',
      },
    },
  },
})

// Panels like translucent terminal tiles over the dusk.
const tile: ThemeMessageRule = {
  backgroundColor: '#0c0b0cee',
  color: '#e2dddc',
  borderColor: '#584e51',
  borderWidth: 1,
  radius: 0,
  padding: 14,
}

const BASE: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { scene: 'still', glass: false },
}

const LOOK: ThemeSetArgs = {
  ...BASE,
  style: {
    Text: { fontFamily: ['mono'], fontSize: 14, lineHeight: 22 },
    Heading: { fontFamily: ['mono'], fontWeight: 'bold', letterSpacing: 1, color: '#e9c9b8' },
    UserMessage: { ...tile, borderColor: '#b59790', color: '#f4f1ef' },
    AssistantMessage: tile,
    ToolUse: { fontFamily: ['mono'], color: '#c38b7b', backgroundColor: '#0c0b0cdd', radius: 0, paddingX: 8 },
  },
}

const BLINKING: ThemeSetArgs = { ...LOOK, backdrop: { scene: 'blink', glass: false } }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await $.command.register({ name: 'blink', description: 'Last Horizon: the animated wallpaper, eyes opening and closing' })
    await $.command.register({ name: 'still', description: 'Last Horizon: the still wallpaper' })
    // Every reconnect, app reload or resume runs session.start again, so restore
    // the wallpaper the person last chose instead of always going back to still.
    const isBlinking = (await $.store.get('wallpaper')) === 'blink'
    try {
      await $.theme.set(isBlinking ? BLINKING : LOOK)
    } catch (error) {
      $.ui.toast(`Last Horizon: background refused: ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'blink' }, async $ => {
    await $.store.set('wallpaper', 'blink')
    await $.theme.set(BLINKING)

    return { text: 'Last Horizon: blinking wallpaper on. If it does not appear, run /still.' }
  })

  on('command.run', { command: 'still' }, async $ => {
    await $.store.set('wallpaper', 'still')
    await $.theme.set(LOOK)

    return { text: 'Last Horizon: still wallpaper on.' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    if (e.props.scene === 'blink') {
      return <Svg source={BLINK} alt="A painted close-up of a face looking up, eyes slowly opening and closing" isInteractive />
    }

    return <Svg source={STILL} alt="A painted close-up of a face looking up" isInteractive />
  })
}
