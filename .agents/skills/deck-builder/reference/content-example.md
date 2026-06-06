# 新專案：用 SDD 讓 AI 根據規格建立專案
> 規格驅動開發（Spec-Driven Development）— 讓 AI 不只寫程式，還幫你建立完善的規格文件

## OpenSpec 初始化

### 🔧 為什麼需要 OpenSpec？
- AI 寫程式越來越快，但專案越改越亂，甚至越改越壞
- 關鍵人物離職，沒有文件，系統知識直接斷層
- 解法：白話文對話 → AI 自動建立規格文件 → 根據規格驅動開發

### 📦 安裝與初始化

```prompt [label="安裝指令"]
npm install -g @fission-ai/openspec@latest
openspec init
```

- 選擇使用的 AI 工具（Claude / Cursor）
- 產生 `.claude` / `.cursor` 下 durable skills

### ⚡ Skills 與 Commands
- **Skills** — AI 自動觸發的技能包，不需要背指令
- **Commands** — 用 `/opsx` 前綴強制驅動

```prompt [label="查看 Skill"]
我想知道 openspec 目前安裝的 skill 用途
請使用表格呈現，用白話簡短描述
```

## 從零建立專案

### 🎯 Prompt 設計三要素

[flow]
1. 專案目標 — 大方向描述需求，AI 會釐清細節
2. 使用技術 — 指定技術棧，便於團隊接手
3. 細節討論 — 提醒 AI 主動提問，釐清模糊需求
[/flow]

```prompt [label="建立 Dashboard（Plan Mode）"]
請設計一個公司內部 Dashboard 系統，包含以下功能：
- 登入頁面（帳號密碼驗證）
- 首頁儀表板（顯示關鍵數據卡片：營收、活躍用戶數）
- 員工管理頁（管理者可檢視、新增、編輯、刪除員工資料）

前端使用 React + TypeScript，使用 Mock API 模擬後端回應
```

### 📋 OpenSpec 自動建立規格文件

[flow]
1. proposal.md — 確認目標與範圍
2. design.md — 技術選型與風險評估
3. specs/ — 按功能分類的詳細規格
4. task.md — 任務清單，完成自動打勾
[/flow]

```prompt [label="開始實作"]
開始實作
```

> **AI 正在改變企業決策**
> 過去 Dashboard 這類系統，企業通常找廠商購買、支付年費維護。但 Vibe Coding 的出現正讓企業做出不同的選擇。
>
> 用 OpenSpec 建立規格文件 — 就是讓這個交接過程有據可循，而不是一團無文件的程式碼丟過去。

```prompt [label="歸檔"]
功能符合預期，進行歸檔
```

## 建立專案規則

### 📐 建立專案規則

```prompt [label="初始化規則"]
/init
```

**CLAUDE.md** 是給「做事」用的，**config.yaml** 是給「規畫」用的

---

# 舊專案：根據情境設計 Skills，讓 AI 有執行依據
> 最難的不是 0 到 1，而是 1 到 100；透過 Skills 設計，讓 AI 在迭代功能、版本控制、Code Review 都有規範可循

## OpenSpec 迭代

### ⚠️ 版本控制的必要性
- 反面案例：一個 PR 塞了 18 個檔案、近千行變更、只有一個 commit
- AI 加速開發後，這個問題被成倍放大

```prompt [label="新增功能"]
幫我設計 Dashboard 的深色/淺色主題切換功能
使用者偏好存在 localStorage
使用 OpenSpec
```

> **為什麼 1 到 100 比 0 到 1 更難？**
> 如果沒有規格文件，下次改功能時 AI 不知道之前的設計邏輯，可能把同一個功能重複寫好幾次。
> 用 OpenSpec 每次迭代都會在 Source Control 留下規格變更。

```prompt [label="歸檔變更"]
幫我歸檔
```

⭐ 保持好習慣：每做完一件事就 commit，不要多功能混一起

## 設定 Commit Skill

### 📝 為什麼需要 Commit Skill？

[tags]
- [orange] 人工手打：耗時且風格不一致
- [purple] AI 自動生成：長短隨機、中英混雜
- [green] 解法：git-smart-commit Skill
[/tags]

- 分析變更的檔案 → 判斷應拆成幾個 commit → 分段提交

```prompt [label="拆分 Commit"]
新增 commit
```

## 設定 PR Skill

### 🔀 git-pr-description Skill
- 比對當前分支與目標分支的差異
- 讀取 commit 訊息與變更檔案
- 參考 `pr-template` 生成 Title 與 Description

```prompt [label="生成 PR"]
撰寫 PR
```

## Git Worktree 並行開發

### 🌳 多 Agent 並行開發
- 不同功能使用不同 feature branch，搭配 Git Worktree 建立獨立工作區
- 設計 `git-worktree-design` Skill：一個指令拆分任務、建立 Worktree、新增 SPEC

```prompt [label="Worktree 並行開發"]
採用 Worktree，新增通知中心彈窗、資料匯出 CSV 功能
```

> **人，才是 AI 的瓶頸**
> Code Review 的速度已經跟不上 AI 寫程式的速度。當人成為 AI 的瓶頸時，要去想的是如何降低門檻，而不是放棄審核。
> 真正值錢的不是工具本身，而是知道什麼時候用、怎麼組合。

---

# 導入測試：讓維護與擴充更有底氣
> 自動化測試，是 Vibe Coding 從玩具走向產品的關鍵

### 🛡️ 為什麼 Vibe Coding 一定要測試？

[flow]
1. 穩定性 — 請 AI 修 bug，結果舊功能壞掉
2. 複雜度 — 功能越多，人工測試越不可能覆蓋全部
3. 擴充性 — 功能間有相依性，修改可能引發連鎖影響
[/flow]

不寫測試才浪費時間 — 測試讓你敢大膽修改，遇錯快速定位

## gen-test-cases

### 🔄 測試撰寫流程

[flow]
1. 建立資料夾 — 存放測試清單
2. AI 撰寫清單 — 類型、說明、輸入、期待輸出
3. 人類 Review — 確認情境有無遺漏
4. AI 撰寫測試 — 描述與文件一致
5. 自主驗證 — 最多嘗試 5 次
[/flow]

```prompt [label="生成測試案例"]
/gen-test-cases
（拖入 src/pages/LoginPage.tsx）
```

### ✅ 登入頁測試情境範例

- [x] 電子郵件格式錯誤 → 前端擋住、不呼叫 API
- [x] 密碼不符規則 → 顯示對應錯誤訊息
- [x] 格式正確 → 呼叫 Mock API → 成功取得 Token
- [x] Mock API 回傳密碼錯誤 / 帳號不存在 → 顯示錯誤
- [x] 管理者登入 → 顯示員工管理頁入口；一般用戶 → 不顯示

## GitHub Action 自動化

```prompt [label="自動化測試"]
我希望在 GitHub Action 加入自動化測試的流程
每一個分支將更新推送到 GitHub 都會觸發一次自動化測試
```

---

# 總結

[summary]
- 🏗️ **新專案 — SDD** | OpenSpec + Spec-Driven Development，讓 AI 根據規格建立 Dashboard，同時產生完善文件
- ⚙️ **舊專案 — Skills** | 設計 Commit / PR / Worktree Skills，讓 AI 在大型專案中有規範可循
- 🧪 **導入測試 — CI/CD** | 用 Workflow 驅動 AI 撰寫測試，搭配 GitHub Action 守住品質底線
[/summary]
