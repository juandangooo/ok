import { expect, test } from 'claude-code/testing'
import type { Plugin } from 'claude-code/testing'

// How a command typed at the prompt reaches the hooks.
const TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

const DRAWN = { value: { isDrawn: true, requestId: 'r1' } } as const

test('Last Horizon sets its blinking theme at session start', async ($, on) => {
  const scenes: string[] = []

  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('store.set', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    const backdrop = e.backdrop

    scenes.push(backdrop !== undefined && 'scene' in backdrop ? String(backdrop.scene) : 'none')

    return DRAWN
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(scenes).toEqual(['blink'])
})

// Stands in for theme-examples: on a command it puts up fireworks, then clears.
const FIREWORKS: Plugin = {
  name: 'fireworks',
  register(on) {
    on('command.run', { command: 'fireworks' }, async $ => {
      const set = await $.theme.set({ backdrop: { scene: 'night' } }).then(
        () => 'set',
        (error: unknown) => String(error),
      )
      const cleared = await $.theme.clear().then(
        () => 'cleared',
        (error: unknown) => String(error),
      )

      return { text: `${set} | ${cleared}` }
    })
  },
}

test("another plugin can't replace or clear the theme", { plugins: [FIREWORKS] }, async ($, on) => {
  let reachedEngine = 0

  on('command.run', () => ({ text: 'engine' }))

  on('theme.set', () => {
    reachedEngine += 1

    return DRAWN
  })
  on('theme.clear', () => {
    reachedEngine += 1

    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  const ran = await $.command.run({ command: 'fireworks', args: '', ...TYPED })
  const text = JSON.stringify(ran)

  expect(text).toContain('Last Horizon is always on')
  expect(text).not.toContain('set |')
  expect(text).not.toContain('| cleared')
  expect(reachedEngine).toBe(0)
})

test('its own /still and /blink still change the wallpaper', async ($, on) => {
  const scenes: string[] = []

  on('command.run', () => ({ text: 'engine' }))
  on('store.set', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    const backdrop = e.backdrop

    scenes.push(backdrop !== undefined && 'scene' in backdrop ? String(backdrop.scene) : 'none')

    return DRAWN
  })

  await $.command.run({ command: 'still', args: '', ...TYPED })
  await $.command.run({ command: 'blink', args: '', ...TYPED })

  expect(scenes).toEqual(['still', 'blink'])
})

test('the blinking wallpaper goes up again when the app attaches', async ($, on) => {
  const scenes: string[] = []

  on('store.set', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    const backdrop = e.backdrop

    scenes.push(backdrop !== undefined && 'scene' in backdrop ? String(backdrop.scene) : 'none')

    return DRAWN
  })
  on('session.attach', (_, e) => ({ clientId: e.clientId }))

  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  await $.session.attach({ surface: 'terminal', clientId: 'terminal:default' })

  expect(scenes).toEqual(['blink'])
})

test('the wallpaper draws the traced portrait, frosted at the foot, within the size limit', async $ => {
  for (const scene of ['blink', 'still']) {
    const ui = await $.ui.mount({
      plugin: 'last-horizon',
      component: 'Backdrop',
      surface: 'desktop',
      props: { scene, plugin: 'last-horizon', glass: false },
    } as never)
    const svg = (await ui.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined
    const source = svg?.props?.source ?? ''

    expect(source.length).toBeGreaterThan(100000)
    expect(source.length).toBeLessThan(131073)
    expect(source).toContain('mask="url(#lh-bar)"')
    expect(source.includes('class="lid0"')).toBe(true)
    expect(source.includes('@keyframes blink0')).toBe(scene === 'blink')
    await ui.unmount()
  }
})

// The frosted wrapper has no viewBox, so the phone (which sizes an Svg from its
// own markup) drew it as a 300 by 150 strip. The phone gets the portrait alone.
test('on the phone the wallpaper is the portrait alone, sized by its own viewBox', async $ => {
  for (const scene of ['blink', 'still']) {
    const ui = await $.ui.mount({
      plugin: 'last-horizon',
      component: 'Backdrop',
      surface: 'mobile',
      props: { scene, plugin: 'last-horizon', glass: false },
    } as never)
    const svg = (await ui.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined
    const source = svg?.props?.source ?? ''
    const root = source.slice(0, source.indexOf('>') + 1)

    expect(source.length).toBeGreaterThan(100000)
    expect(source.length).toBeLessThan(131073)
    expect(root).toContain('viewBox=')
    expect(root).toContain('preserveAspectRatio="xMidYMid slice"')
    expect(source).not.toContain('mask="url(#lh-bar)"')
    expect(source.includes('@keyframes blink0')).toBe(scene === 'blink')
    await ui.unmount()
  }
})

test('/blink says so when no app draws the wallpaper', async ($, on) => {
  on('command.run', () => ({ text: 'engine' }))
  on('store.set', () => ({ value: undefined }))
  on('theme.set', () => ({ value: { isDrawn: false, reason: 'no desktop or mobile app is attached' } }))

  const ran = JSON.stringify(await $.command.run({ command: 'blink', args: '', ...TYPED }))

  expect(ran).toContain('no app draws it yet: no desktop or mobile app is attached')
  expect(ran).not.toContain('blinking wallpaper on')
})
