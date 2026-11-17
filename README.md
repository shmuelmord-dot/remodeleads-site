# RemodeLeads — marketing site

The public site for RemodeLeads: pre-booked kitchen & bath appointments for
Southern California contractors.

Plain HTML/CSS/JS. **No build step, no dependencies.** Open `index.html` and it
works, or serve the folder:

```sh
python3 -m http.server 5200
```

## Deploying

GitHub Pages publishes the root of `main` automatically. After editing CSS or
JS you **must** bump the `?v=` on the `<link>` and `<script>` tags in every
HTML file, or returning visitors keep the cached copy:

```sh
sed -i '' 's|?v=7|?v=8|g' *.html
```

## Layout

| Path | What it is |
|---|---|
| `index.html` | Home — the full pitch |
| `how-it-works.html` | Delivery process end to end |
| `pricing.html` | Basic $250 · Confirmation + Insurance $350 · optional filters |
| `who-its-for.html` | Fit by company size |
| `faq.html` | Straight answers |
| `about.html` | Owners, call centre, principles |
| `book.html` | Contact — WhatsApp, phone, or self-signup |
| `quote.html` | Renders a proposal from a `?d=` payload. Blank without one. |
| `assets/js/site.js` | One `CONFIG` block: pricing, counties, contact details |

Contact details and prices live in the `CONFIG` block at the top of
`assets/js/site.js`. Change them there, not in the markup.

## Not in this repo

The internal proposal builder is deliberately absent — it is an internal
pricing tool and this repo is public.

The proposal viewer is not here either. It depends on a script holding
commercial terms used only in privately negotiated deals, so it stays on the
internal host alongside the builder that generates its links.
