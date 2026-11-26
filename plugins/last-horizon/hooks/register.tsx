import type { EngineInterface, Register, ThemeResult, ThemeSetArgs, ThemeMessageRule } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BLINK } from './scene'

// The still wallpaper is the same portrait with the blink animation taken out.
// (The old traced ground was over the app's 100,000-character backdrop limit,
// so the app refused the whole theme.)
const STILL_PORTRAIT = BLINK.replace(/<style>[\s\S]*?<\/style>/, '')

// Frost on the bottom bar alone. The app's own glass frosts every panel at
// once, the conversation column included, so it is turned off below and the
// wallpaper carries its own frost instead: the portrait once, sharp, and a
// blurred, shadow-veiled copy of it masked to a strip along the foot of the
// window, where the bar sits. The outer svg has no viewBox so its units are
// the window's points, and the strip stays BAR tall on any screen. Above it
// the frost fades in over FADE points on an eased gradient, so the sharp
// portrait melts into the bar instead of stopping at a line.
const BAR = 120
const FADE = 110

function fadeStops(): string {
  const total = BAR + FADE
  const stops = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map(t => {
    const eased = t * t * (3 - 2 * t)

    return `<stop offset="${((t * FADE) / total).toFixed(3)}" stop-color="#fff" stop-opacity="${eased.toFixed(3)}"/>`
  })

  return stops.join('') + '<stop offset="1" stop-color="#fff"/>'
}

function frostBar(portrait: string): string {
  const inner = portrait.replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg id="lh-pic" width="100%" height="100%" ')
  const total = BAR + FADE

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
    '<defs>' +
    '<filter id="lh-frost" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="22"/></filter>' +
    `<linearGradient id="lh-fade" x1="0" y1="0" x2="0" y2="1">${fadeStops()}</linearGradient>` +
    `<mask id="lh-bar"><rect width="100%" height="${total}" y="100%" transform="translate(0 -${total})" fill="url(#lh-fade)"/></mask>` +
    '</defs>' +
    inner +
    '<g mask="url(#lh-bar)">' +
    '<g filter="url(#lh-frost)"><use href="#lh-pic"/></g>' +
    '<rect width="100%" height="100%" fill="#1d1411" fill-opacity="0.35"/>' +
    '</g>' +
    '</svg>'
  )
}

const BLINK_SCENE = frostBar(BLINK)
const STILL = frostBar(STILL_PORTRAIT)

// The phone gets the portrait alone. The frosted wrapper above has no viewBox
// (its units are the window's points), so it has no size or shape of its own:
// the mobile app sizes an Svg from its markup, got a 300 by 150 box, and drew
// a blurred strip or nothing. The portrait keeps its own viewBox and
// preserveAspectRatio slice, so it fills the phone at any size. The phone's
// glass has no blur to lose, and one copy of the picture with no full-screen
// filter is lighter on its GPU.
const PHONE_BLINK = BLINK
const PHONE_STILL = STILL_PORTRAIT

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

// The app's glass is off (no blur, no veil): the frost under the bottom bar is
// drawn into the wallpaper itself (frostBar above), so the middle stays sharp.
const GLASS = { blur: 0, opacity: 0 }

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



// Sets the look and says what the engine said, so a command never claims the
// wallpaper is on when no app draws it.
async function report($: EngineInterface, look: ThemeSetArgs, done: string): Promise<string> {
  let result: ThemeResult

  try {
    result = await $.theme.set(look)
  } catch (error) {
    return `Last Horizon: background refused: ${String(error)}`
  }

  return result.isDrawn ? done : `Last Horizon: the wallpaper is set, but no app draws it yet: ${result.reason}`
}

async function putUp($: EngineInterface) {
  try {
    await $.theme.set(BLINKING)
  } catch (error) {
    $.ui.toast(`Last Horizon: background refused: ${String(error)}`)
  }
}

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
    await putUp($)

    return next(e)
  })

  // In a cloud session the app connects after session.start, so a theme set
  // there can reach no one. Put the blinking wallpaper up again each time the
  // desktop or mobile app attaches, so nobody has to type /blink.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)

    if (e.surface === 'desktop' || e.surface === 'mobile') {
      await $.store.set('wallpaper', 'blink')
      await putUp($)
    }

    return result
  })

  on('command.run', { command: 'blink' }, async $ => {
    await $.store.set('wallpaper', 'blink')

    return { text: await report($, BLINKING, 'Last Horizon: blinking wallpaper on. If it does not appear, run /still.') }
  })

  on('command.run', { command: 'still' }, async $ => {
    const still: ThemeSetArgs = { ...LOOK, backdrop: { scene: 'still', glass: GLASS } }

    return { text: await report($, still, 'Last Horizon: still wallpaper on until this session reconnects; blinking comes back after that.') }
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
    const phone = e.surface === 'mobile'

    if (e.props.scene !== 'still') {
      return <Svg source={phone ? PHONE_BLINK : BLINK_SCENE} alt="A painted close-up of a face looking up, eyes slowly opening and closing" isInteractive />
    }

    return <Svg source={phone ? PHONE_STILL : STILL} alt="A painted close-up of a face looking up" isInteractive />
  })
}
