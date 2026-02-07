# movfix

A Chrome extension that fixes QuickTime/MOV videos not playing in Chrome.

## What it does

Some websites serve videos with `type="video/quicktime"` or `.mov` URLs. Chrome often refuses to play these even though the underlying codec is perfectly supported. Click the movfix icon, and it swaps the source type to `video/mp4` in the page DOM and reloads the player to make Chrome try playing it.

## Install

You can install movfix from the Chrome Web Store:

[Chrome Web Store Link - Coming Soon]

For development, you can load the extension manually:

1. Clone this repository
2. Run `bun install && bun run build` to build the extension
3. Open `chrome://extensions/` in your browser
4. Enable "Developer mode" (toggle in the top right)
5. Click "Load unpacked" and select the `dist` directory from this repository

## How it works

When you click the extension icon, movfix scans the page for `<video>` elements with `<source type="video/quicktime">` or `.mov` source URLs. For each match it:

1. Copies all attributes from the original `<source>` element
2. Swaps the `type` attribute from `video/quicktime` to `video/mp4`
3. Replaces the DOM element to force Chrome to re-evaluate the source
4. Calls `video.load()` to reload the player with the new type
