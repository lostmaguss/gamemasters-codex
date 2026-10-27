# Gamemaster's Codex

A desktop campaign manager for game masters running games on Discord. Windows app, built with Electron.

- **Prep**: plan the next session (strong start, scenes, secrets & clues, cast, encounters, treasure, handouts).
- **Live**: run the session: soundboard with built-in ambience and effects, handouts on stream, monster HP, quick rolls, beat logging.
- **Dice**: physics-driven 3D dice, secret rolls, saved rolls.
- **Stream window**: a separate window with only the dice table and handouts, for Discord screen share.
- **Forge**: NPC, place, mission and item generators.
- **Tables**: custom random tables with inline dice `{2d6}` and nested tables `@{Weather}`.
- **Bestiary**: creatures with a stat layout you define for your own system.
- **Codex**: a wiki with `[[links]]` and backlinks.
- **Board**: a corkboard canvas with cards and yarn.
- **Chronicle**: detailed session logs with a chapter view and a Discord recap.

## Install

Download `GamemastersCodex-Setup-x.y.z.exe` from [Releases](https://github.com/lostmaguss/gamemasters-codex/releases). The app updates itself from new releases.

## Develop

```
npm install
npm start               # run the app
npm run dist            # build the Windows installer (needs Wine on Linux)
```

Campaign data is saved to `%APPDATA%\Gamemasters Codex\codex-data.json`.
