export const meta = {
  name: 'ForgeCouncil-BalloonStamp',
  description: '多专家评审气球大乱踩项目 — 通过 ForgeCouncil skill 触发，数据隔离在 .forge-council/',
  phases: [
    { title: '架构评审', detail: '代码结构、架构设计、dead code、bug' },
    { title: '玩法评审', detail: '物理手感、游戏机制、AI、难度曲线' },
    { title: '视觉评审', detail: '渲染、角色设计、UI/HUD、视觉反馈' },
    { title: '综合', detail: '汇总分歧、解决冲突、优先级排序' },
  ],
}

// ─── 共享上下文 ───
const PROJECT_ROOT = 'D:\\ProgramData\\Projects\\BalloonStamp'
const SRC = `${PROJECT_ROOT}/src`

// ─── Phase 1: 架构师评审 ───
phase('架构评审')
const architectFindings = await agent(
  `你是资深游戏架构师。对气球大乱踩项目进行架构级代码审查。

项目路径: ${SRC}

重点审查:
1. 游戏循环架构 (GameEngine.js) — fixed-step accumulator 是否正确？有没有帧率无关问题？
2. 状态机设计 (MenuState/PlayState/ResultState) — 状态切换是否干净？enter/exit 配对了吗？有没有内存泄漏（事件监听器累积）？
3. 模块耦合度 — PlayState 是否过于臃肿（9182字节）？系统之间通信是否合理？
4. 实体管理 — Player 和 Enemy 有大量重复代码（tick、_updateState、getAnimName 几乎一样），是否应该有基类？
5. 数据流 — 输入→物理→AI→碰撞→渲染的管线是否合理？有没有遗漏的环节？
6. Dead code / 未使用代码 — SpriteCache、SpatialGrid、entityManager 声明等
7. Bug 排查 — 平台碰撞逻辑、拍打输入延迟、Enemy.effectiveWidth 计算错误等
8. 可维护性 — 硬编码魔法数字、配置分离程度

给出每个问题的: 严重程度(P0/P1/P2)、具体位置、问题描述、修复建议。`,
  { label: 'architect-review', phase: '架构评审', effort: 'high' }
)

// ─── Phase 2: 游戏设计师评审 ───
phase('玩法评审')
const designerFindings = await agent(
  `你是资深 .io 游戏设计师，精通 Balloon Fight / Joust 类游戏手感调校。

项目路径: ${SRC}

重点审查:
1. 物理手感 — 重力(1000/1200/1400)、拍打冲量(-310/-280/0)、摩擦力(0.92)、终速(500/600) 这些值在 2400x1800 世界、60Hz fixed step 下是什么感受？与经典 Balloon Fight 对比如何？
2. 飞行体验 — 重力偏重+拍打偏弱的组合是否让角色感觉"坠"而不是"飘"？
3. 水平移动 — 加速度模型 + 0.92 摩擦系数，在 60Hz 下每步保留 92% → 实际每秒保留 0.92^60 ≈ 0.6%，急停太快还是有飘滑感？
4. 相机 — lerp=0.1 在大地图+高速移动下，视角是否会明显滞后？
5. 踩踏判定 — 从上方踩踏的判定逻辑是否合理？有没有被侧面碰撞误判的情况？
6. 0气球生存链路 — 坠落→着陆→静止2s→充气1.5s→恢复1气球，这个链条在各状态间转换是否正确？有没有卡死的可能？
7. AI 行为 — 4种AI类型的 chaseRate、flapInterval、speed 参数是否产生可区分的游戏体验？AI 是否太弱或太强？
8. 缩圈机制 — 仅施加推力(400px/s²)没有伤害，是否足够有紧张感？
9. 平台布局 — 18个平台在 2400x1800 世界中是否合理分布？高低差够不够？
10. 整体游戏循环 — 菜单→倒计时→游戏→结算→菜单的循环是否有足够正反馈？

给出每个问题的感受描述、数值依据、调校建议。`,
  { label: 'designer-review', phase: '玩法评审', effort: 'high' }
)

// ─── Phase 3: 视觉工程师评审 ───
phase('视觉评审')
const visualFindings = await agent(
  `你是资深 Canvas 2D 游戏视觉工程师。

项目路径: ${SRC}

重点审查:
1. 角色渲染 (EntityRenderer.js) — 程序化绘制的角色是否足够好看？与"扁平卡通+精灵缓存"的设计目标差距多大？
2. 气球渲染 — 纯色圆+极小高光(0.35r) vs 渐变+大高光+阴影，视觉层级够不够？
3. 角色动画 — walk 动画仅偏移2px、flap 仅移动矩形位置，是否有足够"生命感"？
4. 菜单/结算 — 纯文字+渐变背景，有没有过场动画、角色预览、氛围元素？
5. HUD — 信息密度、可读性、是否遮挡游戏视野？
6. 背景层次 — 只有1层云+水面，是否需要多层视差背景？
7. 粒子系统 — 仅200粒子上限，淘汰/闪电/鲸鱼时才触发，是否需要更多场景的粒子反馈？
8. 交互反馈 — 拍打有无冲击波？踩踏有无屏幕震动？获气球有无弹出动画？
9. 性能 — 程序化绘制每帧都重绘，在移动端(Canvas 2D)下 20 个实体 + 30 背景云 + 粒子，是否流畅？
10. 响应式 — 720x1280 / 1280x720 双viewport + DPR缩放，是否有渲染模糊或letterbox问题？

给出每个问题的视觉差距描述、具体改进方案。`,
  { label: 'visual-review', phase: '视觉评审', effort: 'high' }
)

// ─── Phase 4: 综合（多专家交叉分析） ───
phase('综合')

const architectSynthesis = await agent(
  `你是架构师。阅读另外两位专家的评审发现，从架构角度综合分析。

架构师发现:
${architectFindings}

游戏设计师发现:
${designerFindings}

视觉工程师发现:
${visualFindings}

任务:
1. 哪些游戏设计或视觉问题根源在架构层面？
2. 哪些物理/手感问题可调参解决，哪些需要架构改动？
3. PlayState 9182字节如何解耦？给出具体方案。
4. Player/Enemy 代码重复：继承还是组合？
5. 最优修复优先级排序。`,
  { label: 'architect-synthesis', phase: '综合', effort: 'high' }
)

const designerSynthesis = await agent(
  `你是游戏设计师。阅读另外两位专家的评审，从玩法角度综合分析。

${architectFindings}
${designerFindings}
${visualFindings}
${architectSynthesis}

任务:
1. 哪些架构问题直接影响游戏手感？
2. 视觉贫乏是否破坏玩法体验？
3. 物理调校优先级：先调重力还是拍打？
4. AI 难度曲线是否需要分阶段调整？
5. 最优迭代路线图。`,
  { label: 'designer-synthesis', phase: '综合', effort: 'high' }
)

const visualSynthesis = await agent(
  `你是视觉工程师。阅读另外两位专家的评审，从视觉角度综合分析。

${architectFindings}
${designerFindings}
${visualFindings}
${architectSynthesis}

任务:
1. 哪些架构问题阻碍视觉改进？
2. 角色渲染：优化程序化绘制还是恢复 SpriteCache？
3. 移动端 Canvas 2D 渲染预算是多少？
4. 哪些视觉改进可直接做，哪些需要架构配合？
5. 视觉改进 MVP 范围。`,
  { label: 'visual-synthesis', phase: '综合', effort: 'high' }
)

// ─── Phase 5: 最终综合报告 ───
phase('综合')
const finalReport = await agent(
  `你是项目技术负责人。综合所有评审输出最终报告。

=== 架构师评审 ===
${architectFindings}

=== 游戏设计师评审 ===
${designerFindings}

=== 视觉工程师评审 ===
${visualFindings}

=== 架构师综合 ===
${architectSynthesis}

=== 游戏设计师综合 ===
${designerSynthesis}

=== 视觉工程师综合 ===
${visualSynthesis}

输出 Markdown 格式:
## 一、执行摘要（健康度评分 1-10 + 3个最紧急问题）
## 二、核心问题 Top 10（P0/P1/P2，含根因/影响/修复难度/方案）
## 三、专家分歧点（列出 + 裁决）
## 四、迭代路线图（Sprint 1/2/3）
## 五、关键数据参考（参数表/架构清单/视觉清单）

用中文输出，保持技术准确性。`,
  { label: 'final-report', phase: '综合', effort: 'xhigh' }
)

return {
  architect: architectFindings,
  designer: designerFindings,
  visual: visualFindings,
  architectSynthesis,
  designerSynthesis,
  visualSynthesis,
  finalReport,
}
