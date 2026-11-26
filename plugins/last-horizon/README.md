# Last Horizon

A look for Claude Code in the desktop and mobile apps, built on the Last Horizon palette: near-black surfaces, bone-white monospace text, a dusty-rose accent, and square message tiles. Behind the conversation sits a portrait wallpaper, traced from the photo's own pixels into vector layers.

- The animated wallpaper is always on: the eyes blink and slowly close and open, using the photo's own lid skin and lashes. It comes back on every new session, reconnect and app reload.
- `/still` pauses it to the still wallpaper until the session reconnects; `/blink` turns it back on right away.

- Last Horizon keeps the theme: if another plugin tries to replace or clear it (for example theme-examples' automatic fireworks), it is refused.

The terminal draws no wallpaper or theme colors; the look shows in the Claude desktop app and mobile app. On the phone the portrait fills the screen on its own, without the desktop's frosted strip under the bottom bar.

## Install

At the prompt of a Claude Code session:

```
/plugin install last-horizon --marketplace juandangooo/ok
```

Answer `y` to add the marketplace, then pick a scope (user, to have it in every project).

From a shell:

```
claude plugin install last-horizon --marketplace juandangooo/ok
```
