# Gamemaster's Codex

A desktop companion for game masters who run their games on Discord: prep, run the table, stream it, and remember it. Works with any system, including your own homebrew, in fantasy, sci-fi or cyberpunk settings.

**[Download the latest installer](https://github.com/lostmaguss/gamemasters-codex/releases/latest)** (`GamemastersCodex-Setup-x.y.z.exe`). Windows may warn that the app isn't signed: click *More info → Run anyway*. After that the app updates itself.

## The sections

| Section | What it's for |
|---|---|
| **Prep** | Plan the next session: strong start, scenes, secrets & clues, cast, encounters, treasure, handouts. *Start session* hands it all to Live. |
| **Live** | Run the session: soundboard, soundscapes, music, weather on stream, handouts, tonight's secrets, monster HP and attacks, quick tables, session timer. |
| **Combat** | Initiative, HP (type `7` for damage, `+5` to heal, `=20` to set), conditions that count down, combat log. Space = next turn. |
| **Map** | Battle maps with a grid, tokens, fog of war you paint away, measuring, area templates. |
| **Dice** | Physics-driven 3D dice, saved rolls, secret rolls. |
| **Stream** | Full-screen scenes (starting soon, chapter title, recap, break, end card), name cards, countdown, atmosphere. |
| **Party** | Character sheets laid out the way your system works; stat rolls follow your formula. Party stash for shared money and loot, with a ledger. |
| **Forge** | Generators: NPCs, places, missions, items, loot, encounters, all genre-aware. |
| **Tables** | Your own random tables with dice inside rows and tables that roll other tables. |
| **Bestiary** | Creatures with your own stat layout; abilities become one-click rolls. |
| **Codex** | A wiki of your world with `[[links]]`, backlinks, templates and pictures. |
| **Board** | A corkboard canvas with cards, pictures and yarn. *World web* builds one from your Codex. |
| **Clocks** | Progress clocks and a world calendar. |
| **Chronicle** | Every session as a chapter: scenes, quotes, loot, spotlight, threads, recaps for Discord. |

## Streaming on Discord

1. Click **Stream window** in the top bar. A second window opens with just the table.
2. In Discord: *Share Screen → Applications → Codex Dice (stream)*. Turn on **Sound** if you use the soundboard.
3. Keep working in the main window. Everything you choose to show goes to the stream window: dice, maps with fog, handouts, the turn order, party health, clocks, scenes, name cards and weather. Secret rolls never do.

In the stream window: **H** hides the roll history, **F** goes fullscreen, the control bar fades out on its own.

## Posting to a Discord channel

*Campaign menu → Connect Discord*. In Discord: *channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL*, then paste it. You can post rolls, handouts, turn order and session recaps automatically or with Post buttons.

## Player dice bot (experimental)

Players roll from Discord and the dice land on your stream window with their name.

1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**.
2. **Bot → Reset Token**, copy it, and paste it in *Campaign menu → Discord → Player dice bot*. Press **Connect**.
3. Open the invite link the app shows and add the bot to your server.
4. Put each player's Discord name on their party sheet.

| Command | Does |
|---|---|
| `/roll 1d20+5 Stealth` (or `/r`) | Any roll, any notation |
| `/check Agility` | Rolls that player's stat with your sheet's formula |
| `/init` | Rolls their initiative straight into your combat tracker |
| `/me` | Shows them their own sheet, privately |
| `/stash` | Shows the party's money and loot |

The bot only answers while the app is open.

## Dice notation

| Write | Means |
|---|---|
| `2d6+3`, `d20`, `d%` | The usual |
| `2d20kh1`, `4d6dl1` | Keep highest 1, drop lowest 1 |
| `3d6!` | Exploding: a max rolls again |
| `4d6r1` | Reroll 1s once |
| `4dF` | Fate/Fudge dice |
| `1d100<=45` | Roll-under target: Success or Failure |
| `8d6>=5` | Dice pool: count the hits |

Which die makes a critical, whether high or low is good, and initiative order are set in *Campaign menu → Rules & genre*.

## Keyboard

`Ctrl+K` search & commands · `Ctrl+L` log a moment · `Ctrl+1…0` sections · `Ctrl +/−` interface size · `F1` all shortcuts

## Your data

Saved in `%APPDATA%\Gamemasters Codex\`. A dated backup is kept every day for 14 days (*Campaign menu → Restore a backup*). *Export backup* writes one file with pictures included.

## Develop

```
npm install
npm start               # run the app
npm run dist            # build the Windows installer (Wine needed on Linux)
```

Pushing a new `version` in `package.json` to `main` builds and publishes a release automatically (GitHub Actions).
