# HTML Deck Builder

> 透過 AI Agent Skills 與自動化腳本，將 Markdown 講稿快速編譯為 16:9 的精美互動簡報網頁。

❝讓 AI 隨機的輸出，變成可用 Markdown 維護的投影片模板，累積為個人與團隊的長期工具。❞

## 核心特色

1. **零依賴建置工具**：使用 Node.js 原生 API 開發，不需要安裝複雜的前端框架或依賴套件。
2. **自動化 Slide 分割**：依據 Markdown 中的大綱標題 (`#`、`##`、`###`) 自動分割為幻燈片頁面，免去手動排版。
3. **豐富的 UI 元件支援**：支援轉換代碼提示塊 (Prompt Block)、洞察框 (Insight Box)、流程圖 (Flow Steps)、彩色標籤 (Tags)、勾選清單 (Checklist) 等精美元件。
4. **內建本地熱重載伺服器**：提供 `dev.mjs` 監控檔案變更，存檔後自動編譯並即時重新整理瀏覽器網頁。
5. **完全便攜與離線可用**：編譯產出的 `index.html` 整合所有樣式與導覽邏輯，可單檔案離線開啟。

---

## Quick Start

### 1. 安裝與執行

本專案完全零依賴，複製後直接執行即可。

```bash
# 編譯範例課程
node .agents/skills/deck-builder/scripts/build.mjs example

# 啟動熱重載預覽伺服器
node .agents/skills/deck-builder/scripts/dev.mjs example
```

預覽伺服器啟動後，開啟瀏覽器瀏覽 `http://localhost:3000` 即可預覽簡報。

### 2. 簡報導覽操作

- **下一頁**：按鍵盤 `Right Arrow`、`Space`、`PageDown` 或點擊螢幕**右側 30% 區域**。
- **上一頁**：按鍵盤 `Left Arrow`、`PageUp` 或點擊螢幕**左側 30% 區域**。
- **全螢幕**：按鍵盤 `F` 鍵切換。

---

## 專案結構

```
HTML-Deck-builder/
├── .agents/
│   └── skills/
│       └── deck-builder/
│           ├── scripts/
│           │   ├── build.mjs            # 簡報編譯器
│           │   └── dev.mjs              # 熱重載伺服器
│           └── reference/
│               ├── deck-template.html   # 簡報 base 模板
│               ├── deck-layout-system.md# 版面格式規範
│               ├── html-deck-mode.md    # 簡報寫作指引
│               ├── media-workflow.md    # 影像處理工作流
│               ├── design-spec.md       # 視覺色彩規範
│               ├── config-example.yaml  # YAML 設定檔範例
│               └── content-example.md   # Markdown 範例
├── config/
│   ├── global.yaml                      # 共用設定模板 (講師/社群/頁尾)
│   └── assets/                          # 共用設定素材複本
├── example/                             # Runnable 範例課程資料夾
│   ├── config/
│   │   ├── global.yaml                  # 複製自 /config/global.yaml
│   │   └── assets/
│   ├── config.yaml                      # 課程專屬覆蓋設定
│   └── content.md                       # 結構化 Markdown 講稿
├── package.json
└── README.md
```

---

## 新增一門課程簡報

1. **建立課程資料夾與設定**
   ```bash
   mkdir -p my-deck/config my-deck/assets
   ```
2. **複製全域設定**：將根目錄的 `config/global.yaml` 與 `config/assets/` 複製到 `my-deck/config/` 下。
3. **撰寫內容**：建立 `my-deck/content.md` 並使用約定的 Markdown 格式編寫簡報內容。
4. **撰寫課程設定**：建立 `my-deck/config.yaml` 填寫該課程專屬的標題、副標題與引言。
5. **編譯輸出**：
   ```bash
   node .agents/skills/deck-builder/scripts/build.mjs my-deck
   ```
   輸出檔案將為 `my-deck/index.html`。

---

## 視覺風格規範 (Visual System)

本專案預設採用 **Modern Magazine**（現代雜誌）視覺風格：
- **背景色**：`#ffffff` (亮白色)
- **卡片與區塊**：`#ffffff` 與 `#f2f2f2` 交替，具備細緻邊框 (`#d8d8d8`)。
- **字體**：英文與程式碼採 Consolas，中文採 `"Noto Sans TC", "Microsoft JhengHei", sans-serif`，重視排版呼吸感。
- **強調色**：亮紅色 (`#e10600`) 作為唯一的視覺焦點色，用來強化大綱編號、流程數字與連結。
- **佈局**：16:9 投影片比例，自適應支援行動裝置排版。
