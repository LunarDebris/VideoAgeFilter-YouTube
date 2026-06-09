# YouTube Video Age Filter

A browser extension that hides video entries older than an age you choose, on the YouTube **home page** and the **Subscriptions feed**(`youtube.com/feed/subscriptions`). There are also additional toggles to remove things like YouTube Shorts, Explore Topics and the AI question box.

Pick a unit and a value:

| Unit    | Range    |
|---------|----------|
| Minutes | 1 – 59   |
| Hours   | 1 – 23   |
| Days    | 1 – 14   |
| Weeks   | 1 – 4    |
| Months  | 1 – 12   |
| Years   | 1 and up |

When filtering is on, any video whose "X ago" timestamp is **older than** your threshold is hidden. Turn the switch off to show everything again. Changes apply live to open YouTube tabs.

## Install in Chrome (unpacked)
1. Unzip this folder somewhere permanent.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the icon and click it to set your filter.

## Install in Firefox (temporary)
1. Unzip this folder.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**
4. Select the `manifest.json` file inside the folder. (Temporary add-ons are removed when Firefox restarts. For a permanent install, the add-on must be signed by Mozilla via addons.mozilla.org.)

## Notes
- Timestamp detection currently targets the **English** YouTube interface ("3 days ago", "2 weeks ago", etc.).
- Month/year ages are approximated (1 month ≈ 30 days, 1 year ≈ 365 days), matching how YouTube itself rounds its relative dates.
- Items without a readable date (Shorts shelves, ads, mixes) are left untouched.
