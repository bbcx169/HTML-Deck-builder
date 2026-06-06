# Media Workflow

Use this workflow when a course source includes videos, DOCX images, PDF pages, diagrams, screenshots, or scanned tables.

## Video Priority

1. Prefer local MP4 when a usable local video file exists.
2. Copy local MP4 files to `assets/videos/` with safe English kebab-case filenames before embedding them.
3. Use YouTube embed only as a backup when no local MP4 exists, the MP4 is unavailable, or the user explicitly requests YouTube embed.
4. If both exist, use `[video]` first and add a `[button]` link to the original YouTube source when useful.
5. Avoid unsafe video filenames in HTML paths, especially spaces, `#`, and long CJK names.

Recommended:

```markdown
[video src="assets/videos/demo-video.mp4" title="容器更換示範"]
[button href="https://www.youtube.com/watch?v=VIDEO_ID" label="開啟 YouTube 原始影片"]
```

YouTube backup:

```markdown
[youtube id="VIDEO_ID" title="容器更換示範"]
```

## DOCX Image Extraction

1. Extract images into `assets/<source-stem>/`.
2. Derive `<source-stem>` from the source document using stable English kebab-case.
3. Preserve document order when naming images, such as `08-guidance-01.jpg`.
4. Do not rely on ZIP media filenames such as `image13.png`; those often do not match document order.
5. Place each image immediately after the matching clause, checklist item, table, or process step.
6. Use specific captions, not generic labels.
7. After insertion, compare the extracted image count with the `content.md` references and rendered HTML images.
8. Explain any intentional omission, such as repeated decorative assets or unreadable thumbnails.
