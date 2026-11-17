# RemodeLeads — marketing site

The public site for RemodeLeads: pre-booked kitchen & bath appointments for
Southern California contractors.

Plain HTML/CSS/JS. **No build step, no dependencies.** Open `index.html`, or:

```sh
python3 -m http.server 5200
```

## Deploying

GitHub Pages publishes the root of `main` automatically.

After editing CSS or JS you **must** bump the `?v=` on the `<link>` and
`<script>` tags in every HTML file, or returning visitors keep the cached copy:

```sh
sed -i '' 's|?v=8|?v=9|g' *.html
```

## Layout

| Path | What it is |
|---|---|
| `index.html` | Home — the full pitch |
| `how-it-works.html` | Delivery process end to end |
| `pricing.html` | The two plans and the optional filters |
| `who-its-for.html` | Fit by company size |
| `faq.html` | Straight answers |
| `about.html` | Owners, call centre, principles |
| `book.html` | Contact — WhatsApp, phone, or self-signup |
| `assets/js/site.js` | One `CONFIG` block: pricing, counties, contact details |

Prices, counties and contact details live in the `CONFIG` block at the top of
`assets/js/site.js`. Change them there, not in the markup.

## This repo is public

It is generated from an internal working copy by `scripts/sync-public-site.sh`,
which deliberately leaves out the proposal builder and viewer: they depend on a
script carrying commercial terms that are not public. Don't add them by hand.
