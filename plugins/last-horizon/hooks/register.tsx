import type { Register, ThemeSetArgs, ThemeMessageRule } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BLINK } from './scene'

// The still wallpaper is the same portrait with the blink animation taken out.
// (The old traced ground was over the app's 100,000-character backdrop limit,
// so the app refused the whole theme.)
const STILL = BLINK.replace(/<style>[\s\S]*?<\/style>/, '')

// The Last Horizon palette: near-black, bone white, dusty rose, faded teal.
// The blacks are warmed to the portrait's own shadow browns, so the app's
// message box and panels sit in the picture instead of on top of it.
const { theme, problems } = makeColors({
  label: 'Last Horizon',
  only: 'dark',
  // fillShade 400 keeps button labels readable when hovered.
  roles: {
    accent: { seed: '#b59790', fillShade: 400 },
    danger: { seed: '#c38b7b', fillShade: 400 },
    success: { seed: '#87a9b0', fillShade: 400 },
    warning: '#c9a16e',
    pro: { seed: '#a5a0b6', fillShade: 400 },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#100b09',
        'surface-1': '#140e0b',
        'surface-2': '#1b1310',
        'surface-3': '#211713',
        'text-primary': '#f4f1ef',
        'text-secondary': '#d4d0c9',
        'text-muted': '#aa9d98',
      },
    },
  },
})

// Panels like translucent terminal tiles over the dusk.
const tile: ThemeMessageRule = {
  backgroundColor: '#100b09ee',
  color: '#e2dddc',
  borderColor: '#5a4842',
  borderWidth: 1,
  radius: 0,
  padding: 14,
}

// The app's own panels (the bar under the conversation, the top bar, the
// sidebar) as liquid glass over the portrait: a heavy blur that melts the
// picture behind them and a light veil of its shadow brown, so the wallpaper
// flows through them instead of a solid black strip.
const GLASS = { blur: 32, tint: '#1d1411', opacity: 0.3 }

const BASE: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { scene: 'blink', glass: GLASS },
}

const LOOK: ThemeSetArgs = {
  ...BASE,
  style: {
    Text: { fontFamily: ['mono'], fontSize: 14, lineHeight: 22 },
    Heading: { fontFamily: ['mono'], fontWeight: 'bold', letterSpacing: 1, color: '#e9c9b8' },
    UserMessage: { ...tile, borderColor: '#b59790', color: '#f4f1ef' },
    AssistantMessage: tile,
    ToolUse: { fontFamily: ['mono'], color: '#c38b7b', backgroundColor: '#100b09dd', radius: 0, paddingX: 8 },
  },
}

const BLINKING: ThemeSetArgs = { ...LOOK, backdrop: { scene: 'blink', glass: GLASS } }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await $.command.register({ name: 'blink', description: 'Last Horizon: the animated wallpaper, eyes opening and closing' })
    await $.command.register({ name: 'still', description: 'Last Horizon: the still wallpaper' })
    // The blinking wallpaper is always on: every session start, reconnect, app
    // reload or resume puts it back. /still only lasts until the next one.
    await $.store.set('wallpaper', 'blink')
    try {
      await $.theme.set(BLINKING)
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
    await $.theme.set({ ...LOOK, backdrop: { scene: 'still', glass: GLASS } })

    return { text: 'Last Horizon: still wallpaper on until this session reconnects; blinking comes back after that.' }
  })

  // Last Horizon stays on. Another plugin that replaces or clears the theme
  // (theme-examples does both for its "merged" fireworks, then leaves the
  // app's plain black) is refused. Only this plugin's own calls go through.
  on('theme.set', ($, e, next) => {
    if (next.origin.plugin === 'last-horizon') {
      return next(e)
    }

    return { deny: 'Last Horizon is always on, so it keeps the theme.' }
  })

  on('theme.clear', ($, e, next) => {
    if (next.origin.plugin === 'last-horizon') {
      return next(e)
    }

    return { deny: 'Last Horizon is always on, so it keeps the theme.' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    if (e.props.scene !== 'still') {
      return <Svg source={BLINK} alt="A painted close-up of a face looking up, eyes slowly opening and closing" isInteractive />
    }

    return <Svg source={STILL} alt="A painted close-up of a face looking up" isInteractive />
  })
}
