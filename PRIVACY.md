# Privacy Policy

BGG Uploader is a browser extension that bulk-updates your own BoardGameGeek collection.

## What it does with data

The extension runs only on your own collection page at boardgamegeek.com and communicates only
with boardgamegeek.com, using the browser session you are already logged in with.

**Data sent.** The game names you paste are sent to boardgamegeek.com as search queries, and the
resulting collection additions or status changes are sent to boardgamegeek.com to update your
collection. This is the same data the site's own "Add a Game" form sends when you use it by hand.

**Data stored.** None. Your list is held in memory only while the panel is open. The extension
writes nothing to disk, browser storage, or any server.

**Data shared with the developer or third parties.** None. The extension contains no analytics,
telemetry, or crash reporting, and contacts no server other than boardgamegeek.com.

**Credentials.** The extension never sees or handles your BGG password. It relies on the login
session already present in your browser tab.

## Permissions

- Access to `boardgamegeek.com`: required to read your collection page and submit changes to it.
- Content script on your collection page: adds the Bulk update button and panel.

## Changes

If a future version changes any of the above, this document will be updated in the repository
and the change will be described in the release notes.

## Contact

Questions or concerns: https://github.com/Jecoms/bgg-uploader/issues
