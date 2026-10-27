# Computer Use MCP

独立的 Windows 电脑控制 MCP，迁移自 [dsh-computer-use](https://github.com/copylee711/dsh-computer-use)。通过标准 **stdio** 接入 WorkBuddy 或其他支持本地 MCP 的客户端，无需 DSH、Electron、Python 或第三方原生 Node 扩展。

支持 Windows 10/11 的交互式桌面，Node.js **22.19+**。截图返回标准 MCP image，模型需支持视觉才能看图；不支持视觉时仍可使用 UI Automation 读取元素与文本。本项目的“通用”指兼容 MCP 客户端，当前不支持 macOS/Linux 桌面操作，也不提供远程 HTTP 入口。

## 接入 WorkBuddy / 其他 MCP 客户端

在客户端本地 MCP 配置中添加以下 server。WorkBuddy 支持编辑自定义 `mcp.json`，并识别用户级 `.codebuddy` 中的 MCP 与 Skills（参见[官方设置说明](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Setting)及[更新日志](https://www.codebuddy.cn/docs/workbuddy/Changelog)）。不同客户端的设置页面和顶层 JSON 结构可能不同；这里使用常见的 `mcpServers` 格式：

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "npx",
      "args": ["-y", "@copylee/computer-use-mcp@0.1.0"]
    }
  }
}
```

如果 Windows 客户端不能直接启动 `npx`，使用下面的形式：

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "cmd",
      "args": ["/d", "/s", "/c", "npx -y @copylee/computer-use-mcp@0.1.0"]
    }
  }
}
```

确保客户端继承的 PATH 中能找到 Node/npm，必要时将 command 改成你自己的 `node.exe` 或 `cmd.exe` 绝对路径。服务必须运行在要控制的 Windows 电脑上；锁屏、UAC 安全桌面和更高权限窗口不能按普通桌面操作。

首次使用时，Windows 自带的 .NET Framework C# 编译器将 helper 源码编译到 `%LOCALAPPDATA%\computer-use-mcp\helper-<hash>`。只在首次桌面调用启动 helper，MCP 握手不编译。应用控制策略可能阻止自编译 helper；服务会尝试通过 Windows PowerShell 承载同一程序集，仍失败时会返回诊断，不修改系统策略。

## 配套 skill

[`skills/computer-use/SKILL.md`](skills/computer-use/SKILL.md) 可复制到客户端支持的 skills 目录中，例如 `<skills目录>/computer-use/SKILL.md`；具体位置以客户端设置为准。

不支持文件 skill 的客户端可以读取 MCP resource `computer-use://skill`，或调用 MCP prompt `computer_use`。也可以输出正文后放入客户端的项目指令：

```shell
npx -y @copylee/computer-use-mcp@0.1.0 --print-skill
```

建议首个任务：“读取 computer_use 操作说明，然后列出窗口并截图。”WorkBuddy 的真实客户端接入需要在其 MCP 设置中完成；协议验证不等于已验证其具体版本的图片展示或审批 UI。

## 能力

| 工具 | 用途 |
| --- | --- |
| `computer` | 截图、缩放、点击、拖动、滚动、Unicode 输入、快捷键、等待、光标位置 |
| `computer_batch` | 最多 30 个顺序动作，失败停止；末尾返回截图/文本/无图 |
| `open_application` | 按名称/路径/URL 打开应用，优先复用窗口或恢复托盘应用 |
| `windows` | 枚举、聚焦、最小化、最大化、恢复、关闭、整理窗口 |
| `ui_elements` | UI Automation 元素及截图坐标，或直接读取窗口文本 |
| `switch_display` | 多显示器列表与切换，自动处理 DPI 和截图缩放 |
| `clipboard` | 读取/写入文本，任务结束恢复原剪贴板 |
| `app_skill` | 保存和读取本地可编辑的应用操作笔记 |
| `list_granted_applications` | 查询当前应用访问范围 |
| `control` | `status`、`stop`、`resume`、`finish` |

坐标始终来自最新的**整屏截图像素**，不是物理屏幕像素或 zoom 图像像素。操作后自动截图，静止画面可返回“未变化”以节省图片开销。内置常见应用操作笔记，用户笔记默认保存至 `~/.computer-use-mcp/computer-use-skills`。

控制时显示橙色提示；物理 **Esc 暂停/继续**，物理键盘输入时让用户先操作。Stop 按钮会停止并锁住后续控制，须用户要求后才调用 `control resume`。正在执行的单个 native 动作可能在返回后才响应取消。任务结束调用 `control finish`，恢复剪贴板并隐藏提示；断开连接也会清理 helper 和按住的输入。

## 启动配置

通过 MCP server 的 `env` 设置，可选：

| 环境变量 | 含义 |
| --- | --- |
| `COMPUTER_USE_ALLOWED_APPS` | 逗号分隔允许操控的应用；省略时允许所有非屏蔽应用；例如 `notepad,chrome` |
| `COMPUTER_USE_BLOCKED_APPS` | 额外屏蔽应用，逗号分隔 |
| `COMPUTER_USE_HOST_APPS` | 额外的宿主 exe 名称，防止向自己的聊天输入；默认保护 WorkBuddy/Codex/Claude/DSH |
| `COMPUTER_USE_LABEL` | 控制提示中的名称 |
| `COMPUTER_USE_HOME` | 用户应用笔记的父目录 |

应用白名单约束鼠标/键盘输入和窗口变更，不是数据隔离沙箱；截图、窗口枚举、UI Automation 与剪贴板仍可能读取桌面信息。密码管理器默认禁止输入。客户端 MCP 审批由客户端处理，服务不模拟 DSH 授权弹窗，也不暴露让模型自行扩展应用白名单的工具。只把服务连接到你信任的客户端。

## 开发与验证

```shell
npm ci
npm run typecheck
npm test
npm run build
npm run test:integration
npm run pack:check
```

`test:integration` 在 Windows 验证真实 stdio 握手、工具、skill、参数拒绝和停止状态。`npm run test:desktop` 额外打开独立的临时 WinForms 测试窗口，测试截图、Unicode 键盘输入、批量动作和 UI Automation，然后关闭测试窗口。它会短暂聚焦测试窗口，请在可交互的桌面运行。Linux CI 只做静态/模拟验证；不宣称支持 Linux 桌面。

## 发布

首次发布可通过本机 npm token 执行 `npm publish --access public`。此仓库不存储 token。后续在 npm 包的 Trusted Publisher 中配置：

- Provider: **GitHub Actions**
- Organization or user: **copylee711**
- Repository: **computer-use-mcp**
- Workflow filename: **publish.yml**
- Environment name: **留空**（工作流未使用 environment）

随后更新 `package.json` 和 `package-lock.json` 的版本以及 README 中的固定版本，提交到 main，再推送对应 `vX.Y.Z` tag；也可从 main 手动运行 Publish to npm。工作流验证版本、main 祖先关系、测试和包内容，使用 OIDC 发布及 provenance，并下载 registry tarball 校验 SHA-512。需要 npm Trusted Publisher 配置完成后才能首次验证 Actions 发布。

CI 在 Windows 和 Linux 运行；真实桌面测试不在托管 CI 自动运行。已发布版本不能覆盖，请为后续版本递增版本号。

MIT。原实现出处和版本见 [NOTICE](NOTICE)。
