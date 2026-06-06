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

---

## Visual Themes Catalog

When generating a presentation, the compiler reads the `page.theme` property inside `config.yaml`. The deck supports 10 carefully designed visual style themes:

1. **`modern-magazine`** (Default):
   - **Aesthetic**: Editorial, stark white background, black text, vibrant red accents (`#e10600`). Custom serif/sans typography (`Outfit` + `Inter`).
   - **Vibe**: Clean, professional, bold, and modern.
   - **Best suited for**: Corporate presentations, branding updates, modern magazines, new product announcements.
2. **`dark-cyberpunk`**:
   - **Aesthetic**: Dark mode (`#0c0d14`), high-contrast neon cyan (`#00f0ff`) and hot pink (`#ff007f`) accents. Futuristic tech fonts (`Orbitron` + `Space Grotesk`).
   - **Vibe**: Tech-forward, high-energy, immersive.
   - **Best suited for**: Developer pitches, software architecture, artificial intelligence, gaming, cybersecurity.
3. **`nordic-frost`**:
   - **Aesthetic**: Cool light-gray/blue background (`#f4f7f6`), navy text (`#1d2d44`), icy blue accents (`#3a86c8`). Minimalist crisp fonts (`Outfit` + `Inter`).
   - **Vibe**: Calming, clean, professional, and refreshing.
   - **Best suited for**: Healthcare, medical research, environment/sustainability, financial reports, architectural portfolios.
4. **`forest-retreat`**:
   - **Aesthetic**: Sage-tinted off-white background (`#fafaf7`), forest green accents (`#2d6a4f`), dark green text. Balanced organic fonts (`Space Grotesk` + `Inter`).
   - **Vibe**: Natural, organic, eco-friendly, relaxing.
   - **Best suited for**: Wellness, organic products, agriculture, outdoor tourism, sustainability initiatives.
5. **`warm-terracotta`**:
   - **Aesthetic**: Soft warm beige background (`#faf6f0`), earthy espresso text (`#2b1a13`), terracotta orange accents (`#c97a53`). Minimalist balanced fonts (`Outfit` + `Inter`).
   - **Vibe**: Handcrafted, warm, humanistic, and cozy.
   - **Best suited for**: Lifestyle brands, coffee shops, artisan crafts, design studios, humanities, storytelling.
6. **`royal-navy`**:
   - **Aesthetic**: Luxurious navy blue background (`#0f1a2c`), luxury gold accents (`#d4af37`), pale gold text. Elegant serif titles (`Playfair Display` + `Inter`).
   - **Vibe**: High-end, executive, sophisticated.
   - **Best suited for**: Executive business reviews, luxury branding, investment proposals, formal graduation ceremonies.
7. **`sakura-blossom`**:
   - **Aesthetic**: Sweet pale pink background (`#fffbfb`), dark chocolate text (`#331d23`), cherry pink accents (`#ff758c`). Playful geometric fonts (`Outfit` + `Inter`).
   - **Vibe**: Sweet, friendly, energetic, and cute.
   - **Best suited for**: Spring festivals, cosmetics, bakery/food blogs, kids education, wedding/personal albums.
8. **`monochrome-sleek`**:
   - **Aesthetic**: Charcoal black background (`#121212`), stark white text and accents. Sleek hardware fonts (`Space Grotesk` + `Inter`).
   - **Vibe**: Ultra-minimalist, industrial, high-fashion.
   - **Best suited for**: Architectural designs, design agency portfolios, photography showcases, hardware specifications.
9. **`sunset-glow`**:
   - **Aesthetic**: Warm peach background (`#fff9f2`), rich sunset orange (`#f77f00`) and fiery red accents. Warm energetic typography (`Outfit` + `Inter`).
   - **Vibe**: Dynamic, optimistic, warm, and inviting.
   - **Best suited for**: Travel agencies, summer festivals, energetic startups, creative campaigns, marketing.
10. **`academic-editorial`**:
    - **Aesthetic**: Warm cream/paper background (`#fdfbf7`), deep burgundy accent (`#8b0000`), elegant charcoal text. Academic serif fonts (`Playfair Display` + `Lora`).
    - **Vibe**: Intellectual, historical, prestigious, and timeless.
    - **Best suited for**: Scientific research, literature studies, history lectures, graduation defenses, publishing houses.

### Theme Recommendation Protocol

When assisting the user in creating a slide deck, the AI Agent MUST:
1. Analyze the core topic, audience, and mood of the presentation.
2. Select and recommend exactly **3** themes from the catalog above that are the absolute best match for the topic (explaining why they fit).
3. Provide instructions on how to set the selected theme by adding `page.theme: [theme-name]` in `config.yaml`.

