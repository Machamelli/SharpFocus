# SharpFocus

SharpFocus is a Firefox browser extension designed to enhance focus on YouTube videos by minimizing distractions. It activates a distraction-free mode that hides non-essential elements on YouTube watch pages and applies a global overlay to block interactions on other tabs, while allowing users to whitelist specific domains for unrestricted access.

## Features

- **Distraction-Free YouTube Viewing**: By default, everything on the YouTube video watch page is blocked to eliminate distractions, including the top bar, video descriptions, comments, recommendations, channel info, and Shorts when a video plays. You can customize which elements to hide or show to tailor the experience to your needs.
- **Global Overlay**: Blocks all interactions on non-whitelisted tabs during focus mode, displaying a themed overlay image.
- **Domain Whitelisting**: Add domains to a whitelist to allow full access on those sites even during focus mode.
- **Theme Support**: Supports light and dark themes for the popup interface and overlay.
- **Settings Persistence**: Saves user preferences, including focus settings, whitelisted domains, and theme, using browser storage.
- **Video Event Handling**: Focus mode activates on video play and deactivates on video end or navigation away from watch pages.

## Installation

1. Download or clone the repository to your local machine.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on" and select the [`manifest.json`](manifest.json) file from the project root.
4. The extension will be loaded temporarily. For permanent installation, package the extension or use Firefox's add-on development tools.

**Note**: This extension is built for Firefox using Manifest V3. Ensure Firefox version 109.0 or higher for compatibility.

## Usage

1. Click the SharpFocus icon in the Firefox toolbar to open the popup.
2. Toggle Focus Mode on/off using the pill-shaped button..
3. Add domains to the whitelist by entering them in the input field and clicking "Add".
4. Customize focus settings by checking/unchecking options to hide specific YouTube elements. By default, all elements are hidden, but you can adjust this to show only what you need for a personalized distraction-free experience.
5. Toggle between light and dark themes using the moon/sun icon in the header.
6. Click "Save" to persist your settings.

**Note**: When watching a YouTube video, focus mode activates automatically, hiding distractions and overlaying other tabs. Whitelisted domains remain accessible.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch for your changes.
3. Test thoroughly in Firefox.
4. Submit a pull request with a clear description of changes.

**Note**: Please ensure the code includes appropriate comments.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
