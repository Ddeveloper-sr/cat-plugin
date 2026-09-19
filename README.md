# Floating Cat 🐈

A small animated companion for Kettu/Revenge/Vendetta-family Discord mobile clients.

## Features

- Floating cat overlay
- Drag-and-drop positioning
- Idle, walking, sitting and sleeping states
- Automatic edge-to-edge walking
- Persistent position and settings
- Size, speed, opacity and sleep controls
- Clean unload

## Build

npm install
npm run build

Build output:
- dist/index.js
- dist/manifest.json

Host the dist folder on GitHub Pages or another static host and install the plugin folder URL from Kettu's Plugins screen.

## Compatibility

Target: Kettu 1.4.3. The plugin checks for an available host overlay helper and fails safely when a particular build does not expose one.
