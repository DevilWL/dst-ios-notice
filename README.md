# 注意事项远程更新

游戏里的「注意事项」弹窗不再写死，而是读取本仓库根目录的 `notice.txt`。
游戏只访问 jsDelivr CDN，不接触 Notion；Notion token 只保存在 GitHub Secrets 里。

## 数据流

```
Notion 页面（私有，分享给集成）
        │  GitHub Actions 每 10 分钟
        ▼
notice.txt（本仓库）
        │  jsDelivr CDN
        ▼
游戏弹窗（拉取失败时用上次缓存，再失败用包内默认文案）
```

## 最快路径：GitHub Desktop 发布

1. 安装 <https://desktop.github.com/>，打开并用 GitHub 账号登录。
2. `File` → `Add Local Repository…` → 选择本目录（本目录已经是本地 git 仓库）。
3. 点右上角 `Publish repository`，把仓库名改成英文（例如 `dst-ios-notice`），**取消勾选** `Keep this code private`，点 `Publish repository`。
4. 发布后按下面第 2 步继续配置 Notion 和 Secrets。

## 一次性配置

1. **发布 GitHub 仓库**：用上方 GitHub Desktop 最快路径，或网页新建公开仓库后上传本目录（必须包含 `.github` 目录）。
2. **创建 Notion 集成**：打开 <https://www.notion.so/my-integrations>，新建 internal integration，复制 token。
3. **共享页面给集成**：打开要作为注意事项的 Notion 页面 → 右上角 `...` → `连接`/`Connections` → 添加刚建的集成。
4. **复制页面链接**：在浏览器打开该页面，整条链接形如 `https://www.notion.so/页面名-<32位ID>?pvs=4`。
5. **配置 Secrets**：GitHub 仓库 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`：
   - `NOTION_TOKEN`：第 2 步的 token
   - `NOTION_PAGE_ID`：第 4 步的页面链接或 32 位 ID（脚本会自动提取）
6. **手动跑一次**：`Actions` → `同步注意事项` → `Run workflow`，确认 `notice.txt` 被更新。
7. **拿到游戏地址**：
   ```
   https://cdn.jsdelivr.net/gh/<GitHub用户名>/<仓库名>@main/notice.txt
   ```
   把它填进补丁目录 `scripts/notice.lua` 的 `Notice.url`（或把地址发给维护者代填）。

## 日常更新

1. 直接在 Notion 页面修改内容。
2. 等最多 10 分钟（或到仓库 Actions 页手动 `Run workflow` 立即同步）。
3. 完全退出游戏再启动。已启动的游戏不会热更新，重新进入主菜单时才可能刷新。

## 内容规则

- 只提取文字：段落、标题、项目符号、编号列表、待办、引用、代码、分隔线。
- 图片、视频、颜色、字体样式、表格外观不会出现在弹窗里；表格文字会按行拼接。
- 建议控制在 4000 字以内，客户端超出会截断；长内容在游戏里以滚动列表显示。
- 同步失败时不会覆盖旧的 `notice.txt`，游戏继续显示上次缓存。

## 故障排查

- **Actions 报 401/403**：token 不对或页面没有分享给集成。
- **Actions 报 404**：`NOTION_PAGE_ID` 不对，或集成没有页面权限。
- **改了 Notion 但游戏没变**：
  1. 看 Actions 是否成功、`notice.txt` 是否变化；
  2. 手动打开 `https://purge.jsdelivr.net/gh/<用户名>/<仓库名>@main/notice.txt` 刷新 CDN；
  3. 完全退出并重启游戏；
  4. 检查游戏 `scripts/notice.lua` 里的 `Notice.url` 是否与仓库一致。
- **想确认 CDN 当前内容**：用 Safari 打开上面的 jsDelivr 地址即可。

## 安全

- 不要把 Notion token 写进仓库、`notice.txt` 或游戏安装包里。
- 仓库公开只包含 `notice.txt` 和同步脚本；Notion 页面本身可以保持私有。
