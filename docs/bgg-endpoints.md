# BGG endpoints used by the collection page

Captured 2026-09-07 from a logged-in session on `boardgamegeek.com/collection/user/<username>`
using the legacy "Add a Game to Your Collection" widget. All calls are same-origin,
form-encoded, cookie-authenticated, and carry no CSRF token. Every request sets
`X-Requested-With: XMLHttpRequest`.

## Instant search (name -> objectid)

```
POST https://boardgamegeek.com/geeksearch.php
Content-Type: application/x-www-form-urlencoded

action=instantsearch&ajax=1&objecttype=boardgame&q=<query>
&itemid=0&uniqueid=<any string>&onclick=&extraonclick=&formname=&textareaname=&showexact=&inline=
```

Response is an HTML fragment (not JSON). Each hit is a `<div>` whose `onclick` calls
`SetInstantSearchObject({ itemid, objecttype: 'thing', objectid, name, uniqueid })`, followed by
the display name and `(year)`. Parse `objectid`, `name`, and the year from it. Expansions are
included under `objecttype=boardgame`. A 1-char query returned ~20 hits; an exact title returned 1.

## Add an item to the collection

```
POST https://boardgamegeek.com/geekcollection.php
Content-Type: application/x-www-form-urlencoded

action=additem&ajax=1&objecttype=thing&objectid=<id>
&addowned=true&addwish=false&wishlistpriority=1&force=true
```

- `addowned` / `addwish` are the two status checkboxes the widget exposes; `wishlistpriority`
  is 1-5 and only meaningful when `addwish=true`.
- `force=true` is always sent by the widget. It likely bypasses a duplicate check; untested
  whether omitting it returns a "already in collection" message. Dedupe client-side regardless.
- Success response is HTTP 200 with an **empty body**. There is no returned `collid`; the widget
  simply reloads the collection page afterwards. Treat 200 as success and verify by re-reading.

## Read the collection (for dedupe and verification)

```
GET https://boardgamegeek.com/geekcollection.php?ajax=1&action=collectionpage
    &username=<username>&userid=<userid>&sort=title&sortdir=&page=&pageID=1&gallery=
```

Response is the HTML table. Each item is `<tr id='row_<collid>'>` with cells
`CEcell_objectname<n>` whose `onclick`/`ondblclick` payload includes `collid` and `objectid`, and
a `<a href="/boardgame/<objectid>/<slug>" class='primary'>` title link. Expansions link to
`/boardgameexpansion/<id>/`. Pages hold 300 items; the header text reads `1 to 300 of 461`.
Multiple `collid`s can share one `objectid` (one row per owned version).

The `username` and `userid` are available as hidden inputs (`#username`, `#userid`) on the
collection page, so the content script can read them without asking the user.

## Edit the status of an existing collection row (mark as owned)

Captured 2026-09-07 by clicking a row's status cell on the collection page, ticking Own, saving.

Opening the editor (only needed to learn current flags; the row markup already gives `collid`):

```
GET https://boardgamegeek.com/geekcollection.php?ajax=1&action=editdata
    &fieldname=status&cellid=<n>&collid=<collid>&objecttype=thing&objectid=<id>
```

Returns an HTML form. Checkboxes present, each `value='1'`, `CHECKED` when currently set:
`own`, `prevowned`, `fortrade`, `want` (Want in Trade), `wanttoplay`, `wanttobuy`,
`preordered`, `wishlist`; plus `<select name="wishlistpriority">` 1-5
(1 Must have ... 5 Don't buy this).

Saving:

```
POST https://boardgamegeek.com/geekcollection.php
Content-Type: application/x-www-form-urlencoded

action=savedata&ajax=1&fieldname=status&collid=<collid>&objecttype=thing&objectid=<id>
&own=1&wishlistpriority=3
```

Response is the rendered status cell, e.g. `<div class='owned'>Owned</div>`.

**This is a full replace, not a merge.** It is a plain form submit, so the flags sent are the
row's complete new state and any checkbox omitted is cleared. In the capture the user deliberately
replaced `wanttoplay` + `wanttobuy` with `own`, sending only `own=1`, and the row became just
"Owned". To mark a row owned *without* changing its other flags, read the current flags first
(from the editor GET above or the status cell text in the collection table) and resend all of
them plus `own=1`.

## Verified on a live collection (2026-09-07)

- The default `collectionpage` read returns every row regardless of status: owned, wishlist,
  want-to-play, and rows with no status at all. No status filter parameters are needed.
- The full flow (search, read, additem, savedata) works from a content script in Firefox using
  the logged-in session; no Cloudflare challenge is triggered.

## Still unverified

- Whether `additem` without `force=true` refuses duplicates. The extension dedupes client-side
  and always sends `force=true`, matching the site's own widget.

## Not used

- `api.geekdo.com/api/collections` (the Angular game-page dialog). Works, but BGG's API policy
  grants no license for private endpoints and it's a separate origin. The legacy PHP endpoints
  above are what the collection page itself uses from the same origin.
- `xmlapi2/*` requires a registered application token since 2025-07-02, except downloading your
  own collection while logged in. Possible alternative for the read step.
