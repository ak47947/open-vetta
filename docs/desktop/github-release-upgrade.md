# 个人仓库三端打包发布与客户端一键升级指南

本文说明如何基于 GitHub Actions 与 GitHub Releases 完成 **Atrix 桌面端（Windows / macOS / Linux）** 的自动化打包发布，以及如何发布新版本触发客户端应用内**一键自动升级**。

- **发布工作流**：[`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml)
- **GitHub Release 上传脚本**：[`scripts/release/publish-github-installers.mjs`](../../scripts/release/publish-github-installers.mjs)
- **一键发版脚本**：[`scripts/release-desktop.mjs`](../../scripts/release-desktop.mjs)
- **默认开源构建配置**：[`apps/desktop/scripts/desktop-build-environment.mjs`](../../apps/desktop/scripts/desktop-build-environment.mjs)

---

## 1. 机制概览与三端产物矩阵

客户端内置 `electron-updater`（见 [`apps/desktop/src/main/updater.ts`](../../apps/desktop/src/main/updater.ts)），在打包阶段将个人 GitHub 仓库坐标（`VETTA_UPDATE_PROVIDER=github`、`owner=ak47947`、`repo=open-vetta`）写入安装包内的 `app-update.yml`。

每次发布新版本时，GitHub Actions 会并行编译 Windows、macOS（Apple Silicon `arm64` 与 Intel `x64`）、Linux 四个构建任务，并将安装包与自动更新清单上传至同一 GitHub Release：

| 平台 | GitHub Releases 产物 | 应用内一键升级 | 说明 |
| --- | --- | --- | --- |
| **Windows (x64)** | `Atrix-<version>-win-x64.exe`（推荐安装）<br>`Atrix-<version>-win-x64.exe.blockmap`<br>`Atrix-<version>-win-x64.msi`<br>`Atrix-<version>-win-x64.zip`<br>`latest.yml` | ✅ **支持** | 采用 Inno Setup 版本目录切换机制，无需代码签名证书即可完成差分下载、静默安装与一键重启升级。 |
| **Linux (x64)** | `Atrix-<version>.AppImage`<br>`Atrix-<version>.AppImage.blockmap`<br>`vetta_<version>_amd64.deb`<br>`vetta-<version>.x86_64.rpm`<br>`latest-linux.yml` | ✅ **支持** | 客户端根据当前安装包的格式标识自动匹配对应格式更新包完成一键升级。 |
| **macOS (`arm64` / `x64`)** | `Atrix-<version>-arm64.dmg` / `.zip`（M 系列芯片）<br>`Atrix-<version>.dmg` / `.zip`（Intel 芯片）<br>`*.blockmap` | 📦 **Releases 覆盖安装** | macOS 原生 `Squirrel.Mac` 强制要求 Apple Developer ID 证书验签；无证书时自动产出未签名安装包，DMG 内置 **「修复已损坏.app」** 辅助工具，新版本直接从 Releases 下载覆盖安装。 |

---

## 2. 日常发版与触发客户端一键升级（标准流程）

当旧版本客户端已安装在用户电脑上，修改代码后需要发布新版本并让客户端收到**一键升级**提示时，按以下 3 步操作：

### 第一步：编写新版本的发布说明（必做）

假设当前 [`apps/desktop/package.json`](../../apps/desktop/package.json) 中的版本是 `0.5.64`，即将发布补丁版本 `0.5.65`（如果是次版本升级则为 `0.6.0`）：

1. **新建 GitHub Release 正文文件**：创建 `.github/release-notes/v0.5.65.md`，写入本次版本的更新内容（CI 质量门禁会强制校验该文件存在且非空，并作为 GitHub Release 页面正文）。
2. **（可选）补充客户端内更新日志**：在 [`apps/desktop/CHANGELOG.md`](../../apps/desktop/CHANGELOG.md) 顶部新增 `## [0.5.65]` 章节，打包脚本会提取该段落展示在客户端的升级提示弹窗中。
3. **提交发布说明与业务代码**：
   ```bash
   git add .
   git commit -m "docs(release): 准备 v0.5.65 发布说明"
   ```
   > **注意**：一键发版脚本执行前要求 Git 工作区干净（无未提交改动）。

### 第二步：执行一键发版命令

在仓库根目录运行以下命令之一：

```bash
# 补丁版本升级（如 0.5.64 -> 0.5.65）
bun run release:desktop:patch

# 或：次版本升级（如 0.5.64 -> 0.6.0）
bun run release:desktop:minor
```

该命令会自动完成以下全部操作：
1. 执行代码检查（`check:lint:full`、`typecheck`、`check:guards`）；
2. 校验 `.github/release-notes/v<新版本号>.md` 是否已就绪；
3. 自动递增 [`apps/desktop/package.json`](../../apps/desktop/package.json) 中的 `version` 并更新 `bun.lock`；
4. 自动生成发版提交 `release(desktop): 发布 v<新版本号>` 并创建同名 Git Tag；
5. 使用 `git push --atomic origin <当前分支> refs/tags/v<新版本号>` 一次性推送分支与标签到 GitHub。

> **如果你已经手动修改并提交了 `apps/desktop/package.json` 的版本号**，也可以直接手动打标签并推送：
> ```bash
> git tag v0.5.65
> git push --atomic origin main refs/tags/v0.5.65
> ```

### 第三步：等待 GitHub Actions 完成构建并验证升级

1. 打开仓库的 **Actions → desktop-release** 查看运行进度（整体耗时约 15～25 分钟）。
2. 四个平台构建任务（`build windows`、`build macos-arm64`、`build macos-x64`、`build linux`）完成后，会自动在 **GitHub Releases** 页面创建 `v0.5.65` 并上传全部安装包及 `latest.yml`、`latest-linux.yml`。
3. 此时打开旧版本（如 `0.5.64`）的 Windows 或 Linux 客户端：
   - 应用启动后会自动检查更新（或在设置中手动点击 **检查更新**）；
   - 下载完成后点击 **立即重启 / 一键升级**，应用将自动替换至 `0.5.65` 并重新拉起。

---

## 3. 在 GitHub 网页端手动触发构建（`workflow_dispatch`）

除了推送 `v*` Tag 触发外，你也可以直接在 GitHub 仓库网页端手动触发：

1. 进入 **Actions → desktop-release → Run workflow**。
2. 根据需求选择 `channel` 参数：
   - **`channel = default`（仅构建不发 Release）**：构建三端安装包并保存在该次 Actions 运行底部的 **Artifacts** 中（保留 30 天），适合合入代码后的打包冒烟验证。
   - **`channel = stable`（正式发布到 GitHub Releases）**：构建完成后直接将安装包与 `latest.yml`、`latest-linux.yml` 发布到当前 `apps/desktop/package.json` 对应版本的 GitHub Release。

---

## 4. 在本机（macOS）单独打包安装包

如果只需在本机生成当前平台的开源版安装包（产物位于 `apps/desktop/release/`），可直接执行：

```bash
cd apps/desktop
bun run dist:opensource
```

如只需生成未打包成 DMG 的 `.app` 目录以加快本地验证速度：

```bash
cd apps/desktop
bun run dist:opensource -- --target dir
```

---

## 5. 常见问题与排障

### 5.1 客户端点击“检查更新”提示已是最新版本？
1. **检查版本号是否严格递增**：`electron-updater` 禁用降级且忽略同版本（`0.5.64` 只能升级到 `0.5.65` 或更高版本，用相同版本号重新上传安装包不会触发升级）。
2. **检查 GitHub Release 状态**：确认对应的 Release 处于 **Published（正式公开）** 且为 **Latest**，不是 Draft（草稿）或 Pre-release（预发布）。
3. **检查 `latest.yml` / `latest-linux.yml` 是否已上传**：确认目标版本的 GitHub Release Assets 列表中包含 `latest.yml`（Windows）和 `latest-linux.yml`（Linux）。

### 5.2 GitHub Actions 中某个平台构建偶发网络失败怎么办？
不需要删 Tag 或重新发版。直接进入失败的那次 Actions 运行页面，点击右上角 **Re-run jobs → Re-run failed jobs**，只会重跑失败的那个平台并把产物追加上传到同一个 GitHub Release（详见 [`release-ci.md`](./release-ci.md)）。

### 5.3 macOS 未签名 DMG 安装后提示“已损坏，无法打开”怎么办？
由于未使用 Apple 开发者证书签名公证，macOS 下载的安装包带有系统隔离属性（Quarantine）：
- 打开下载的 `.dmg` 镜像，除了将 `Atrix.app` 拖入 `/Applications`（应用程序）外，镜像内已内置 **「修复已损坏.app」**；
- 右键点击 **「修复已损坏.app」→ 打开**，按提示输入开机密码即可自动移除 `/Applications/Atrix.app` 的隔离属性，之后即可正常双击启动。
- 或在终端执行：`sudo xattr -dr com.apple.quarantine /Applications/Atrix.app`。
