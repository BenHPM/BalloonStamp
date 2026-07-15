# BalloonStamp — 气球大乱踩

## 项目概述
- `.io` 风格大地图淘汰赛游戏（Canvas 2D）
- 物理驱动：重力、拍打冲量、摩擦力、平台碰撞
- 缩圈机制 + AI 对手 + 多阶段游戏循环

## 多专家评审（ForgeCouncil）

本项目使用 ForgeCouncil 进行多专家评审。触发方式：

```bash
# 在项目根目录执行，数据隔离在本项目
forge-council discuss "评审话题" --data-dir .forge-council -r auto
```

### 默认评审角色

| 专家 | 关注点 |
|------|--------|
| SystemArchitect | 代码结构、架构设计、dead code、bug |
| SoftwareDeveloper | 实现质量、代码重复、可维护性 |
| TheOpponent | 批判性审查、找出薄弱环节 |

### 游戏专项评审

游戏设计相关评审自动加入：
- `UXDesigner` / `WebResearcher` — 玩法机制、手感调校、竞品分析

### 快速触发词

以下表达会自动触发多专家评审（无需手动调用 CLI）：
- "帮我看看" / "帮我评审" / "大家评评" / "多专家评审"
- "代码review" / "架构评审" / "架构合理吗"
- "不同角度" / "交叉评审" / "综合评估"
- "玩起来感觉" / "手感怎么样"

### Workflow 集成

项目的 `.claude/workflows/ForgeCouncil-BalloonStamp.js` 是评审 workflow 的定义。
每次触发评审时：
1. 调用 `forge-council discuss` 获取多专家意见
2. 将结果注入 workflow 的综合阶段
3. 讨论历史和校准数据存储在 `.forge-council/` 目录

## 开发命令
```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建产物
npm test         # 运行测试
```

## 技术栈
- Vite + vanilla JS（无框架）
- Canvas 2D 渲染
- 2400x1800 虚拟世界 + 响应式 viewport

## 项目规范
- 代码注释用中文
- 标识符用英文
- 物理参数集中在 `GameEngine.js` 顶部
