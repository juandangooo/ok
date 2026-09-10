# Shop Apple TV: auto schedule + laptop control

Runs Home Assistant Core natively on this Mac (not Docker — Docker Desktop
on macOS can't do real host networking, which breaks the local-network
discovery Apple TV control depends on). Home Assistant then:

- Sleeps the Apple TV at 6:00 PM and wakes it at 8:40 AM, every day,
  independent of any phone.
- Gives you a browser dashboard on this laptop, and a native app on your
  iPhone, to control the Apple TV directly, for the "iOS remote can't find
  it" situations.

**Reliability note:** this only keeps working while this Mac is powered on,
plugged in, and not asleep, sitting on the shop's network. If it ever
travels home with you or gets closed, both the schedule and the dashboard
stop until it's back. Part C below configures it to survive reboots and
prevents sleep, but there's no substitute for it physically staying at the
shop. If that ever becomes a problem, the same config here runs unchanged
on a $35-70 Raspberry Pi or mini PC instead — nothing to redo, just a
different machine to install it on.

Everything below happens on the physical Mac, in Terminal and in the Apple
TV's own Settings — none of it can be done remotely on your behalf.

## Part A — One-time settings on the Apple TV itself

1. Settings > Video and Audio > **Control TVs and Receivers** > On.
   (This is what makes sleeping/waking the Apple TV also turn the TV
   itself off/on via HDMI-CEC — set the TV's own CEC feature to on too,
   e.g. Anynet+/SimpLink/BRAVIA Sync depending on brand.)
2. Settings > AirPlay and HomeKit > Allow Access > **Everyone on the Same
   Network**. (Without this, Home Assistant's pairing PIN never shows up
   on screen — the single most common reason people get stuck pairing.)

## Part B — Install Home Assistant Core on the Mac

In Terminal:

```bash
brew install python3

# Keep the venv OUTSIDE the git repo — it's large and shouldn't be
# version-controlled. Anywhere is fine; this guide assumes your home dir.
python3 -m venv ~/homeassistant-venv
source ~/homeassistant-venv/bin/activate
python3 -m pip install --upgrade pip wheel
pip install homeassistant
```

Now point it at this repo's config folder (clone this repo onto the Mac
first if you haven't):

```bash
hass -c ~/ok/homeassistant/config
```

Leave that running and open `http://localhost:8123` in a browser — you'll
get the normal Home Assistant first-run wizard (create an admin account,
set your home location, etc.). Finish that, then `Ctrl+C` to stop it before
Part C sets it up to run permanently in the background.

Open `~/ok/homeassistant/config/configuration.yaml` (created by the wizard)
and confirm it has this line (add it if it's missing — recent HA versions
usually include it by default):

```yaml
automation: !include automations.yaml
```

That's what wires up the schedule already sitting in
`config/automations.yaml` in this repo.

## Part C — Keep it running permanently

1. **Prevent sleep** (must stay plugged into power):
   ```bash
   sudo pmset -c sleep 0
   sudo pmset -c disksleep 0
   ```
2. **Auto-login after any reboot** (power flicker, macOS update): System
   Settings > Users & Groups > Login Options > Automatic login > select
   this Mac's user account.
3. **Auto-start Home Assistant and restart it if it ever crashes**, via a
   LaunchAgent:
   ```bash
   mkdir -p ~/Library/LaunchAgents
   cp ~/ok/homeassistant/launchagent/com.homeassistant.core.plist.template \
      ~/Library/LaunchAgents/com.homeassistant.core.plist
   ```
   Edit the copy and replace `__VENV_PATH__` with `~/homeassistant-venv`
   (expanded to the full `/Users/yourname/homeassistant-venv`) and
   `__REPO_CONFIG_PATH__` with the full path to `ok/homeassistant/config`.
   Then load it:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.homeassistant.core.plist
   ```
   Check `/tmp/homeassistant.stdout.log` if it doesn't come up on
   `http://localhost:8123` after a minute.

## Part D — Pair the Apple TV (physical step, do this at the shop)

1. In the Home Assistant UI: Settings > Devices & Services > Add
   Integration > search **Apple TV**.
2. It should find the shop Apple TV on the network automatically (native
   networking, so this isn't affected by the Docker limitation mentioned
   above). Select it.
3. A PIN appears **on the TV screen** — type it into Home Assistant. This
   happens twice (once for MRP/media control, once for AirPlay) — repeat
   for the second PIN if prompted.
4. Once paired, go to Settings > Devices & Services > Entities, filter by
   "remote", and note the real entity ID (something like
   `remote.living_room` or `remote.shop_apple_tv` depending on what you
   named the device during pairing).

## Part E — Point the schedule at the real entity

Open `config/automations.yaml` in this repo and replace both placeholder
occurrences of `remote.shop_apple_tv` with the entity ID from Part D. Then
either restart Home Assistant, or in the UI: Developer Tools > YAML >
Automations > reload.

Commit the change so it's tracked:

```bash
cd ~/ok
git add homeassistant/config/automations.yaml
git commit -m "Set real Apple TV entity ID for shop schedule"
git push
```

## Part F — Add the laptop control dashboard

In the Home Assistant UI: open the dashboard, click the three-dot menu >
Edit Dashboard > Add Card > search **Media Control** > pick your Apple TV's
`media_player` entity from the dropdown > Save. (A reference YAML version
of this card is in `config/dashboard-apple-tv-card.yaml` if you'd rather
paste it via the card's "Edit in YAML" option.)

## Part G — Control it from your iPhone

No custom app to build — Home Assistant has an official one. It talks to
the same instance running on the Mac; the Mac is still what's actually
running the schedule and pairing either way, the phone is just another
window into it, same as the browser dashboard in Part F.

1. Install **Home Assistant** from the App Store (free, published by Open
   Home Foundation / Nabu Casa — the project itself, not a third party).
2. Make sure the Mac allows incoming connections on port 8123: the first
   time a device connects, macOS may prompt "Allow incoming connections
   for python3/hass" — click **Allow**. If you don't get prompted and the
   app can't connect, check System Settings > Network > Firewall >
   Options for a `python3` or `hass` entry blocked there.
3. On the iPhone, join the **shop's Wi-Fi** (this only works on the same
   network as the Mac, unless you set up remote access — see below), open
   the Home Assistant app, and let it auto-discover the instance. If it
   doesn't show up, enter it manually:
   - Find the Mac's local address: Terminal > `ipconfig getifaddr en0`
     (or check System Settings > Wi-Fi > Details > IP Address), or just
     try the Mac's Bonjour name — System Settings > General > Sharing
     shows it at the top, then use `http://<that-name>.local:8123`.
   - Enter `http://<ip-or-name>:8123` as the server, port `8123`.
4. Log in with the admin account you created in Part B.
5. You'll land on the same dashboard from Part F, including the Apple TV
   media control card — now native on the phone. Optional: long-press the
   Home Screen > Add Widget > Home Assistant, to control the Apple TV
   without even opening the app.

**Only works on the shop's Wi-Fi by default** — walk out the door and the
app can't reach it. That's consistent with how you described using this
(control it while you're there), so it's the default here. If you also
want it reachable from anywhere, the supported path is Home Assistant
Cloud (Nabu Casa, ~$6.50/mo, no port-forwarding or certificates to manage)
via Settings > Home Assistant Cloud in the HA UI — tell me and I'll add
those steps, since it's a real recurring cost and a slightly bigger
security surface, not something to turn on silently by default.

## Day to day

- **On the shop Wi-Fi:** open the Home Assistant app on your iPhone (Part
  G) for the native experience, including any widgets you add.
- **On this laptop:** bookmark `http://localhost:8123` for the same
  dashboard in a browser.

Either one lets you control the Apple TV manually any time, on top of the
automatic 6 PM / 8:40 AM schedule.

## Security note

`config/.storage/` holds your Apple TV's pairing credentials once you
finish Part D — this repo's `.gitignore` already excludes it (and
`secrets.yaml`, logs, and the recorder database) so none of that gets
pushed to GitHub. Don't `git add -f` anything under `.storage/`.
