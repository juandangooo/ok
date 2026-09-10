# Shop Apple TV: auto schedule + laptop control

Runs Home Assistant Core natively on this Mac (not Docker — Docker Desktop
on macOS can't do real host networking, which breaks the local-network
discovery Apple TV control depends on). Home Assistant then:

- Sleeps the Apple TV at 6:00 PM and wakes it at 8:40 AM, every day,
  independent of any phone.
- Gives you a browser dashboard on this laptop to control the Apple TV
  directly, for the "iOS remote can't find it" situations.

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

## Day to day

Bookmark `http://localhost:8123` on this laptop — that's your dashboard
with the Apple TV media/remote controls, any time you want to control it
manually instead of waiting on the schedule.

## Security note

`config/.storage/` holds your Apple TV's pairing credentials once you
finish Part D — this repo's `.gitignore` already excludes it (and
`secrets.yaml`, logs, and the recorder database) so none of that gets
pushed to GitHub. Don't `git add -f` anything under `.storage/`.
