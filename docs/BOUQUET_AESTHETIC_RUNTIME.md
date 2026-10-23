# Album / Bouquet Runtime Aesthetic Spec v2.0

> 用途：参考图 → 视觉理解 → 花束设计 Prompt → 图片生成 → Visual QA
> 原则：本规范用于运行时生成。历史案例、花材库、详细比例表、花艺师制作说明不进入常规生成上下文。

---

## 1. 核心目标

目标不是生成“配色相似且好看的花束”，而是把参考图的 **视觉秩序、综合色彩、空间关系、材质语言与情绪张力** 转译成一个具有独立艺术性的花束对象。

核心判断：

> 不复制参考图中的物体，复制它为什么看起来是它。

最终结果应更接近：

**editorial object / album artwork translated into floral sculpture**

而不是：

**luxury florist bouquet / ecommerce flower arrangement**

---

## 2. 视觉理解优先级

分析参考图时，按以下顺序读取：

1. 整体明度：高调 / 中调 / 低调
2. 环境综合色调与冷暖
3. 最大面积色块与暗部重量
4. 主体与环境的面积关系
5. 光线、高光与阴影结构
6. 构图：偏心、留白、遮挡、重复、断裂、延伸
7. 材质感：哑光、塑料、金属、透明、胶片、数码光、粗糙纸面等
8. 衣服、建筑、物体等有效视觉信息
9. 局部语义细节

### 人像参考图

当画面包含人物时，不因语义显著性自动提高人体特征权重。

优先级：

**环境 / 衣服 / 明暗 / 冷暖 / 构图 > 配饰 > 肤色 / 五官 / 普通发色**

普通黑发、肤色、五官通常属于人体默认特征，不自动进入综合色盘。

只有当头发或人物局部具有明显的异常综合色块、非自然颜色、特殊轮廓或承担关键构图功能时，才作为主要视觉信息。

---

## 3. Primary Gesture

每张参考图只提取 **一个最重要的视觉动作**。

先问：

> 这张图最值得保留的“不正常”是什么？

可能包括：

- 巨大负空间
- 主体明显偏心
- 一块暗色压住画面
- 一个很小但极醒目的暖色点
- 大尺度遮挡
- 极端纵向或横向延伸
- 局部断裂
- 大面积平面与小主体之间的失衡
- 柔软物体与硬质材质冲突
- 模糊主体与锐利高光并存

这个动作成为整束花的 **Primary Gesture**。

其他材料、颜色和花材必须服务它。

禁止同时设计多个同等级“创意点”。

---

## 4. 色彩逻辑

### 4.1 单一主色世界

每束必须在 3 秒内形成一个明确的主色世界。

不要根据像素出现频率机械提取五种颜色，也不要让多个颜色面积接近。

综合色盘优先压缩为：

- Dominant color world
- Supporting hue
- Shadow / neutral
- Accent color

通常控制在 3–4 个有效综合色彩角色。

### 4.2 主色必须有层级

同一个主色内部应至少存在：暗 / 中 / 亮。

高饱和主色不能通过“扩大面积 + 提高饱和度 + 提高亮度”同时强化。若主色鲜艳，最大面积通常使用较深或较哑版本，中饱和色形成主体，最高纯度色只承担局部唤醒。

目标是：**第一眼识别主色，但不刺眼、不塑料、不像整体染色。**

### 4.3 点睛色保真

参考图中面积很小但具有记忆度的颜色必须单独记录。点睛色必须保持实际色相，不因同属暖色而互换橙 / 红 / 黄；通常集中在 1–3 个位置，缩略图中可见即可，不扩大成第二主色。

---

## 5. 从视觉行为到材料，而不是颜色到花

禁止直接执行：

- 蓝色 → 蓝绣球
- 粉色 → 粉玫瑰
- 黑色 → 黑花
- 绿色 → 叶材
- 白色 → 白玫瑰

必须先判断这个颜色在参考图中的 **视觉行为**。

例如：

- 大面积蓝色环境 → 包装平面 /综合色块 / 深蓝结构
- 蓝色高光 → 半透明膜 / 反光线材 / 少量亮花
- 黑色人物轮廓 → 深色结构锚点 / 内部裂缝 / 硬质平面
- 粉色衣服 → 柔软但图形化的综合色块
- 银白反射 → 局部金属 / 透明 / 冷反光材料

材料选择依据：

**形状 > 空间作用 > 表面质感 > 色彩 > 花材名称**

花语不参与主要设计决策。

---

## 6. 空间优先于“丰满”

不要默认把作品补完整。

允许：

- 大面积负空间
- 明显偏心
- 花材集中在单侧
- 部分花头被遮挡
- 大量裸露结构
- 非传统花束比例
- 一张异常大的包装平面
- 极少的花材数量
- 长度远超主体的线性材料

如果加入一个元素只是为了“填空”或“显得丰富”，优先删除。

### Controlled Wrongness

允许保留少量受控的不合理感：

- 某一边明显更重
- 一张纸大得异常
- 一根线过长
- 一个综合色块被孤立
- 主花不完全朝向镜头
- 包装不完整包覆花束
- 某种材料略显人工甚至廉价

不要自动把这些异常修正成传统平衡。

---

## 7. 构图与轮廓

不设默认“上宽下窄扇形”。

根据参考图选择最合适的空间逻辑，例如：

- compressed：低矮压缩
- off-axis：整体偏向一侧
- vertical：狭长纵向
- falling：向下坠落
- fragmented：轮廓断裂
- blocked：主体被大平面遮挡
- split：主体被空间切分
- void-led：负空间成为视觉中心
- sculptural asymmetry：雕塑式不规则轮廓

避免固定套路：

> 中央主花 + 两侧次焦点 + 三根外伸枝条

“标准化的不对称”同样属于模板化。

---

## 8. 花材与人工材料地位平等

花束不要求花占据绝对主体。

可同时使用：

- 花
- 枝条
- 叶片
- 干燥材料
- 苔藓
- 纸
- 半透明膜
- 金属或喷色材料
- 欧根纱
- 铁丝
- 透明线
- 反光平面

允许作品中：

- 只有一种花；
- 花只占视觉面积约三分之一；
- 几乎没有传统填充花；
- 主要视觉由纸、线和空间完成。

不因“花材丰富”自动提高设计质量。

### 现实可制作性

人工材料与花材地位平等，不代表可以使用舞台布景或建筑材料。所有材料必须满足：现实中可购买、可裁剪、可用花艺铁丝或胶带连接、可固定到统一收口点，并能由一个人正常手持。

允许使用真实花艺纸、半透明防水纸、薄 acetate、欧根纱、花艺铁丝、细竹／芦苇支撑，以及可采购的喷色或永生植物材料。

禁止使用：

- 充当背景的巨大网面或穿孔屏风
- 无支撑的悬浮硬板
- 建筑尺度的金属片或塑料结构
- 与茎秆和收口点没有连接的材料
- 只能依赖墙面、地面或隐藏装置成立的结构
- 无法正常搬运、手持或交付给花艺师复现的构造

分析和 Prompt 必须说明人工材料如何连接、承重和收口。若 Primary Gesture 是大面积斜切，应优先用硬挺花艺纸、可绑扎的窄结构片、叶材集群或枝条密度完成，而不是把它变成一面布景墙。

---

## 9. 包装

包装是构图材料，不是礼物边框。

允许：

- 单张巨大平面
- 不完整包覆
- 明显偏向一侧
- 硬质几何折面
- 半透明遮挡
- 主动覆盖部分花头
- 裸露茎秆
- 只存在于背部
- 成为作品最大的综合色块

避免：

- 多层荷叶边
- 每层纸都完整展开
- 对称外翻
- 蛋糕裙轮廓
- 为增加“精致感”不断增加小包装层

---

## 10. 背景与摄影

背景只用于衬托作品。

禁止复制参考图中的：

- 街景
- 房间
- 舞台
- 建筑
- 雨水
- 地面倒影
- 云雾
- 树木
- 灯光散景
- 人物
- 叙事道具

所有生成结果统一使用近似 `#d8d8d4` 的无缝、哑光、浅中性灰影棚背景。背景不继承参考图的主色、纹理、Primary Gesture 或材质，只允许出现轻微自然接触阴影。

参考图的明度、冷暖和综合色彩必须由花束、包装与摄影光线表达，不能通过更换背景实现。浅色和深色材料都需要与固定灰背景清楚分离。

摄影不默认采用商品照式完整居中展示。

允许：

- off-center framing
- large negative space
- editorial crop
- sculptural presentation
- partial occlusion
- directional light
- deliberate shadow

需要清楚展示作品，但避免：**ecommerce floral photography / luxury florist advertisement / wedding bouquet aesthetic**。

---

## 11. Prompt 生成顺序

生成 Prompt 时严格按照以下顺序组织：

1. Primary Gesture
2. Spatial composition
3. Dominant tension
4. Overall brightness / temperature
5. Color hierarchy
6. Silhouette
7. Material behavior
8. Floral elements
9. Packaging
10. Lighting and background
11. Negative constraints

不要从具体花名开始。

### 推荐 Prompt 逻辑

> An experimental sculptural bouquet built around [Primary Gesture].
> The composition is [spatial logic], with [negative space / scale / occlusion].
> Its dominant visual tension is [tension].
> The overall image is [brightness / temperature].
> Color hierarchy: [dominant], supported by [support], anchored by [shadow], with a restrained [accent].
> Materials include [...] used for their graphic shape, transparency, reflectivity or texture.
> Floral elements are limited and treated as sculptural forms rather than conventional floral decoration.
> [...]

---

## 12. Negative Constraints

默认禁止：conventional round bouquet、symmetrical florist arrangement、evenly distributed flowers、central hydrangea mass、uniformly scattered roses、lush filler flowers、rainbow color balance、excessive natural green、layered ruffled wrapping、wedding bouquet aesthetic、luxury florist advertisement、ecommerce product photography、excessive gloss、uniformly saturated petals、background scenery 和 unnecessary decorative props。

---

## 13. Visual QA

### A. Reference Fidelity

- 是否第一眼保留了参考图的综合色彩世界？
- 明暗和冷暖是否正确？
- 关键点睛色是否存在且色相准确？
- 是否把无关人物特征错误提升成主要设计元素？

### B. Art Direction

- 能否一句话说清 Primary Gesture？
- 是否存在一个真正值得记住的空间、尺度或材质决定？
- 是否有主动删减，而不是不断补满？
- 是否仍明显像普通商业花束？

### C. Visual Quality

- 主色是否过饱和、过亮或塑料化？
- 暗部是否被保留？
- 是否存在清楚的负空间？
- 材质是否能够区分？
- 作品和背景是否清楚分离？
- 背景是否保持统一的浅中性灰，没有继承参考图的颜色、网点或斜切？
- 所有材料是否现实可采购、固定、手持和复现？

### D. Hard Reject

出现以下任一情况，重新生成：综合色彩正确但整体像普通礼物花束；主色靠大面积满饱和实现；点睛色丢失；背景不是统一浅中性灰；背景继承参考图的颜色、图案、网点、斜切或场景；人像图中过度关注黑发、肤色、五官；花材平均散布；所有空间都被填满；包装变成传统多层礼品包装；没有明确 Primary Gesture；出现巨大网墙、穿孔屏风、无支撑平面或其他布景结构；材料无法被真实购买、裁剪、固定、手持和复现。

---

## 14. 最终设计判断

在发送图片给用户之前，最后问两个问题：

> **如果把昂贵花材全部换成普通材料，这个构图还成立吗？**

如果否，说明设计仍依赖“花本身好看”。

以及：

> **这里有什么决定，是普通花店通常不会主动这样做的？**

如果回答不出来，说明作品的艺术导演仍然不足。

最终目标：

> **不是让用户觉得“这束花很好看”，而是让用户觉得“这张图为什么会被转译成这样一束花——但确实应该是这样”。**

---

## 更新纪律

历史案例、花材库、详细比例表、花艺师制作说明继续保存在 `BOUQUET_DESIGN_REFERENCE.md`。Runtime 只在审美经验能够蒸馏为跨案例通用规则时更新，不追加逐次案例记录。
