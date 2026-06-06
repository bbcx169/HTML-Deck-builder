# Design Spec

This document defines the shared visual language for:
- `reference/deck-template.html` HTML Deck presentations

The default style is **Modern Magazine**: clean, editorial, confident, image-led, and highly structured.

## 1. Brand Direction

- Theme: `Modern Magazine`
- Tone: clean, editorial, confident
- Visual identity: bold imagery, strong hierarchy, generous white space
- Primary use: training slides, briefings, policy explainers, case decks, and presentation materials that need a polished editorial feel.

The design should feel like a contemporary magazine feature, not a dark dashboard or a generic SaaS landing page.

## 2. Color Tokens

Use a restrained black, white, red, and neutral palette.

```text
--bg: #ffffff
--bg-card: #ffffff
--bg-card-alt: #f2f2f2
--text: #111111
--text-dim: #555555
--border: #d8d8d8
--accent: #e10600
--accent-rgb: 225 6 0
--accent2: #111111
--accent2-rgb: 17 17 17
--accent3: #777777
--accent3-rgb: 119 119 119
--code-bg: #f2f2f2
--radius: 8px
```

Usage rules:
- `--bg` is the slide background.
- `--bg-card` is used for content cards.
- `--bg-card-alt` is used for neutral bands, image placeholders, and secondary panels.
- `--text` is for primary headings and important body text.
- `--text-dim` is for supporting copy.
- `--accent` is the only strong color and should be used sparingly.
- `--accent2` supports black rules, labels, and high-emphasis metadata.
- `--accent3` is neutral support.

## 3. Typography

Use sans-serif typography for both headings and body copy.

- Headings: `"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif`
- Body: `"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif`
- Mono/meta: `Consolas, "Courier New", monospace`

Rules:
- Use bold weight for editorial hierarchy.
- Keep letter spacing at `0` for normal headings and body text.
- Use uppercase metadata sparingly, only for small labels such as `QUESTION`, `DETAIL`, or `WORKFLOW`.
- Body line-height should stay near `1.6`.

## 4. Layout System

### HTML Deck

- Use 16:9 slide composition with strong hierarchy.
- Content layouts are structured to highlight single takeaways per slide.
- Video slides must feature prominent controls and support for local MP4 files.
- Visual elements should look flat and editorial.
