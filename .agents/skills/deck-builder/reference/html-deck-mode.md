# HTML Deck Mode

This repository compiles structured Markdown lectures into HTML Slide Decks. The flow is: `content.md` + `config.yaml` -> `index.html` (the slide deck).

`content.md` serves as the single source of truth. The slide deck compiles and groups the sections and cards into slide presentation pages. It must not add claims, examples, decisions, or conclusions that conflict with or are unsupported by `content.md`.

---

## Source Workflow

1. Create or update `<course-dir>/content.md` from the source material.
2. Build the slide deck by running the build script:
   ```bash
   node .agents/skills/deck-builder/scripts/build.mjs <course-dir>
   ```
3. Open `<course-dir>/index.html` in a web browser to view the compiled presentation.

---

## Automatic Slide Treatment Planning

When the user provides presentation material, the compiler plans the slides:
- **Slide Division**: A new slide is automatically created for each chapter/section (`#`), sub-title (`##`), and content card (`###`).
- **Layout Selection**: Standard markdown lists are rendered as bullets. Tables are rendered as comparison matrices. Terminal code blocks are formatted as mock terminal boxes. Videos are rendered as video player frames.

### Generated Background Image Rules

- Use generated background images for cover, transition, quote, scenario, or conceptual reframing slides when a subject-specific image would improve comprehension and no suitable local source image exists.
- Save or reference generated backgrounds as local deck assets, preferably with stable names such as `assets/slide-bg-01.jpg`.
- Generated backgrounds are illustrative, not evidence. Do not use them to imply a real incident scene, legal finding, or source document detail not present in `content.md`.
- Prefer clean editorial compositions with enough negative space for headline text. Avoid busy images that compete with slide titles.

---

## Output Contract

- Produce one browser-openable `.html` file, usually `index.html` in the course directory.
- Keep CSS and JavaScript inline in the output file.
- Do not depend on external CDNs, web fonts, or remote scripts. Decks must work when opened from disk or served locally without internet access.
- Use real HTML text for slide titles, paragraphs, tables, chart labels, and CTA text.
- Reference local images with paths relative to `index.html`, such as `assets/slide-01.jpg`. Avoid embedding large images as base64 data URIs.
- Keep the deck browser-openable without a dev server.

---

## Global Deck Structure Rules

- Default to no more than 30 slides.
- Follow this standard flow: Title -> Instructor -> Agenda -> Core Sections (Transition slide + Content slides) -> Summary -> Back Cover.
- Content slides must show navigation and pagination.
- Non-content slides must hide navigation and pagination. Non-content slides include Title, Instructor, Agenda, Transition, Summary, and Back Cover.
- Agenda, Transition, and Navigation labels must match character-for-character.
- Generate one Transition slide per agenda/core section.
- Summary slides may contain at most three takeaways, and each takeaway must be traceable to a source section in `content.md`.
- Closing/Back Cover identity text and organization lockup are fixed once established for the project.

---

## Recommended Sequence

Use the global flow below:

1. **Cover**: full-bleed hero image or strong title page.
2. **Instructor**: source the instructor profile from `<course-dir>/config/global.yaml`.
3. **Question**: one large problem statement.
4. **Thesis**: the core reframing.
5. **Overview/Agenda**: clickable section index card grid.
6. **Detail Slides**: split image/text or bullet points representing cards under section 1.
7. **Transition Slide**: chapter opening for section 2.
8. **Detail Slides**: process flows, comparison tables, or code prompt blocks representing section 2 content.
9. **Summary**: three key takeaways from the course.
10. **Back Cover**: closing slide with emblem and social links.
