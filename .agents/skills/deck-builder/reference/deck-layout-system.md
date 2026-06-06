# Deck Layout System

Use this reference when generating or restructuring HTML Deck Mode decks. Keep the layout choice explicit with `data-layout="layout_XX_name"` when practical.

## Global Rules

- Default total slide count: no more than 30 unless the user gives a different target.
- Standard flow: Title -> Instructor -> Agenda -> Core Sections -> Transition -> Content/Chart -> Summary -> Back Cover.
- Content slides show navigation, pagination, and progress.
- Non-content slides hide navigation, pagination, and the lower-left hint while keeping progress visible.
- Agenda, Transition, and Navigation labels must match character-for-character.
- Use one Transition slide per core section.
- Summary has at most three takeaways, and each takeaway must be traceable to `content.md` or the named source section.
- Visual style follows the modern magazine design spec: clean layouts, dark/editorial background, clear rule lines, Noto Sans TC, and readable images.

---

## Layout Catalog

### layout_01_title
- role: non-content / Title
- use: cover page with subject background and primary title.
- source: course title, subtitle, hero image, and main takeaway from `content.md` or project config.
- constraints: title is dominant; supporting copy is smaller; hero image must support the topic and preserve text legibility.

### layout_02_instructor
- role: non-content / Instructor
- use: instructor profile page after Title and before Agenda.
- source: `<course-dir>/config/global.yaml`.
- fields: `instructor.name`, `instructor.tagline`, `instructor.bio`, `instructor.avatar`, `instructor.stats`, `instructor.socials`.
- constraints: do not hardcode instructor data from memory; hide navigation, pagination, and hint; keep progress visible; use the avatar/media only when the referenced local asset exists; render `instructor.socials` as icon+text pill buttons with inline SVG or local icons.

### layout_03_agenda
- role: non-content / Agenda
- use: table of contents with numbered icons.
- source: generated core section list.
- constraints: list 3-5 core sections by default; section text must be reused exactly by Transition and Navigation.

### layout_04_transition
- role: non-content / Transition
- use: one chapter opening page per agenda/core section.
- source: Agenda section label and optional one-sentence section promise.
- constraints: the transition title must match the Agenda label exactly; hide navigation, pagination, and hint.

### layout_05_summary
- role: non-content / Summary
- use: final synthesis before closing.
- source: `content.md` summary or the last substantive source-linked sections.
- constraints: maximum three takeaways; every takeaway must be traceable to a source section.

### layout_06_closing
- role: non-content / Back Cover
- use: locked closing identity page.
- source: project identity, locked closing text, local emblem/logo asset, and `<course-dir>/config/global.yaml`.
- constraints: preserve "簡報結束 恭請講評" and established organization identity. Render the locked closing as one horizontal composition: `簡報結束` + organization emblem/logo + `恭請講評`.

### layout_07_image_text
- role: content
- use: image/text explanation.
- source: one source image plus the matching paragraph, rule, or procedure.
- constraints: image must correspond to adjacent content; image opens original source on click; avoid oversized images that force reading by scrolling.

### layout_08_timeline
- role: content
- use: chronological sequence or phased development.
- source: dated events, stages, or ordered milestones.
- constraints: keep each event concise; do not invent dates; use a process layout instead when the source is procedural rather than time-based.

### layout_09_process_flow
- role: content
- use: SOP, inspection process, or operational workflow.
- source: ordered steps from `content.md` or extracted source documents.
- constraints: each step must have one action; preserve required order.

### layout_10_comparison_matrix
- role: content / chart
- use: compare rules, options, responsibilities, or site types.
- source: source-backed categories and criteria.
- constraints: columns and rows must be comparable; avoid fake scores; use text labels when no real quantitative data exists.

### layout_11_map
- role: content / chart
- use: spatial relationship, site zoning, or responsibility area.
- source: map, floor plan, placement rule, or geographic data.
- constraints: label only source-backed areas.

### layout_12_swot
- role: content / chart
- use: SWOT analysis.
- source: source-backed strengths, weaknesses, opportunities, and threats.
- constraints: keep 1-3 bullets per quadrant; do not force SWOT when the source is a procedure or legal rule.

### layout_13_gantt
- role: content / chart
- use: schedule, implementation plan, or multi-stage rollout.
- source: tasks, owners, dependencies, and timing.
- constraints: use only when timing is material; if order matters more than dates, use `layout_09_process_flow`.

### layout_14_case_card
- role: content
- use: incident, scenario, case, or enforcement example.
- source: one case description and its evidence.
- constraints: separate facts, risk, and lesson; do not add unsupported cause or liability conclusions.

### layout_15_gallery
- role: content
- use: multiple source images that need side-by-side inspection.
- source: related images from the same source or subsection.
- constraints: captions must identify what each image proves; image frames must be readable and click to original files.

### layout_16_quote
- role: content
- use: key legal text, source quote, or instructor emphasis.
- source: short quoted text or paraphrased authority.
- constraints: keep quotes short and source-linked.

### layout_17_key_metric
- role: content / chart
- use: one important number or measured indicator.
- source: real numeric data from source material.
- constraints: show units and context; do not create synthetic metrics.

### layout_18_org_tree
- role: content / chart
- use: organization, responsibility, reporting, or coordination structure.
- source: roles, agencies, teams, or accountable parties.
- constraints: maintain hierarchy.

### layout_19_funnel
- role: content / chart
- use: narrowing pipeline, filtering process, or staged qualification.
- source: staged counts, filters, or decision gates.
- constraints: use only when the source describes attrition or narrowing.

### layout_20_profile_card
- role: content
- use: role/person/stakeholder profile.
- source: source-backed role description, responsibilities, and contact or identity fields when available.

### layout_21_youtube_video_focus
- role: content
- use: one training video with focused viewing prompts.
- source: local MP4 file first; YouTube URL/embed as fallback.
- fields: `video.title`, `video.local_mp4`, `video.youtube_url`, `video.youtube_embed_url`, `video.poster`, `video.watch_focus`.
- constraints: prefer a local `<video controls>` when `video.local_mp4` exists. Include an `開啟 YouTube` button outside the video frame.

### layout_22_youtube_video_analysis
- role: content
- use: one training video plus exactly three observation or debrief points.
- source: local MP4 file first; YouTube URL/embed as fallback.
- fields: `video.title`, `video.local_mp4`, `video.youtube_url`, `video.youtube_embed_url`, `video.poster`, `observations[3].title`, `observations[3].detail`.
- constraints: prefer a local `<video controls>` when `video.local_mp4` exists. Show exactly three observation cards.
