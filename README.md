# PetSure Homebridge

`PetSure Homebridge` is a maintained fork of the original `homebridge-sure-petcare-platform` project created by Wylan Swets.

The original plugin appears to have gone unmaintained after 2020. This fork keeps the project transparent and up to date for current Homebridge releases and modern Node.js runtimes, including `Node.js 24`.

## What This Fork Changes

- Replaces the deprecated `sure_petcare` and `request` dependency chain with a native `fetch`-based Sure Petcare client.
- Fixes the startup race that could trigger `TypeError: acc.pollStatus is not a function`.
- Improves accessory rehydration for cached Homebridge accessories.
- Adds a Homebridge UI config schema.
- Updates runtime support for modern Homebridge and Node.js versions.

## Attribution

- Original project: `homebridge-sure-petcare-platform`
- Original author: Wylan Swets
- Original repository: `https://github.com/wylanswets/homebridge-sure-petcare-platform`
- This repository is an independently maintained fork and modernization by `k4lls`.

## Runtime Support

- Node.js `18+`
- Homebridge `1.6+`

## Supported Devices

- Sure Petcare Cat Door Connect
- Sure Petcare Pet Door Connect
- Optional pet occupancy sensors based on Sure Petcare pet position data

## Install

Install from npm:

```bash
npm install -g homebridge-petsure
```

If you want to test locally before publishing:

```bash
npm install -g /path/to/homebridge-petsure
```

## Homebridge Config

```json
{
  "platforms": [
    {
      "platform": "PetSure",
      "email": "your_email@example.com",
      "password": "your_password",
      "poll_interval": 30,
      "pet_occupancy": true,
      "occupancy_flipped": false,
      "lock_mode": 1
    }
  ]
}
```

## Options

- `poll_interval`: Defaults to `30`. Minimum practical value is `5` seconds.
- `pet_occupancy`: Creates an occupancy sensor for each pet when enabled.
- `occupancy_flipped`: Inverts occupancy state if you prefer "outside" to appear as occupied.
- `lock_mode`: `1` for in only, `2` for out only, `3` for fully locked.

## Publish Checklist

1. Log in to npm with `npm login`.
2. Publish with `npm publish`.
3. Add a GitHub release and a short changelog entry for each version.

## Notes

This fork keeps the original MIT license and attribution so the maintenance history stays clear.

## Changelog

### 1.0.1

- Cleans the npm package contents so only the maintained fork files are published.
- Adds `displayName` metadata for cleaner Homebridge UI discovery.
