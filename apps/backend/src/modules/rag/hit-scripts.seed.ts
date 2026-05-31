/**
 * 爆款脚本种子库
 *
 * 这是 VidForge 的差异化护城河之一:
 * 系统默认携带 30+ 条人工标注的电商带货爆款脚本模板,
 * 在 ScriptService.generate 时按 (品类, 风格) 检索 Top-K,作为 few-shot 注入 prompt。
 *
 * 字段说明:
 * - id: 唯一 id(命名:{category}-{style}-{idx})
 * - category: 品类(与 Material 体系对齐)
 * - style: 风格关键字
 * - hookType: 开场钩子类型(疑问/数字/对比/痛点/反差)
 * - shots: 三段式骨架(hook/demo/cta)
 * - keyMessages: 卖点措辞示例
 * - bgmStyle: BGM 建议
 * - reference: 参考来源 / 启发自
 * - performance: 简短描述爆款打法的效果(供 Dashboard 展示)
 */
export interface HitScriptSeed {
  id: string;
  category: string;
  style: string;
  hookType: '疑问' | '数字' | '对比' | '痛点' | '反差' | '揭秘';
  shots: {
    hook: { description: string; voiceover: string; caption: string };
    demo: { description: string; voiceover: string; caption: string };
    cta: { description: string; voiceover: string; caption: string };
  };
  keyMessages: string[];
  bgmStyle: string;
  reference?: string;
  performance: string;
}

export const HIT_SCRIPTS: HitScriptSeed[] = [
  // ───── 美妆个护 ──────────────────────────────
  {
    id: 'beauty-fresh-001',
    category: '美妆个护',
    style: '清新',
    hookType: '疑问',
    shots: {
      hook: {
        description:
          '镜头特写女生苦恼地看着镜子,手指轻触脸颊,光线柔和自然。前景虚化,焦点在表情',
        voiceover: '为什么 30 岁的皮肤,看起来像 40 岁?',
        caption: '皮肤在悄悄衰老?',
      },
      demo: {
        description:
          '俯拍木质梳妆台,产品居中带阴影,旁边有干花和水珠飘落的慢镜头,侧逆光勾边',
        voiceover: '这瓶精华含烟酰胺 + 玻色因双效配方,30 秒就能补水提亮',
        caption: '30 秒补水提亮',
      },
      cta: {
        description: '产品+包装+优惠贴纸的居中构图,镜头缓慢推进,加微动效粒子',
        voiceover: '直播间下单立减 50,前 100 名加赠化妆棉',
        caption: '点购物车下单',
      },
    },
    keyMessages: ['烟酰胺提亮', '玻色因抗老', '30秒见效', '油皮敏感肌都可'],
    bgmStyle: '清新轻柔的钢琴,80-90 BPM',
    reference: 'TikTok #skincareroutine',
    performance: '同类美妆类目完播率 72%,转化率 4.3%',
  },
  {
    id: 'beauty-luxury-002',
    category: '美妆个护',
    style: '奢华',
    hookType: '反差',
    shots: {
      hook: {
        description:
          '高级感大理石台面,产品被滴入金色精华液包围,上方点光源打出戏剧光影',
        voiceover: '一瓶顶 3 瓶,这才是 2026 年的精华',
        caption: '一瓶 = 3 瓶',
      },
      demo: {
        description: '微距镜头展现质地拉丝感,涂抹后皮肤瞬间发光',
        voiceover: '玻尿酸 5 重保湿,A 醇 3 重抗老,全在一瓶里',
        caption: '5+3 双效合一',
      },
      cta: {
        description: '黑金礼盒包装特写,镜头慢慢推开,呈现"限量发售"字样',
        voiceover: '这次只有 200 套,链接在车里,先到先得',
        caption: '限量 200 套',
      },
    },
    keyMessages: ['玻尿酸5重保湿', 'A醇抗老', '限量', '高端礼盒'],
    bgmStyle: '电影感大提琴,慢节奏 60 BPM',
    performance: '高端美妆类目客单价 ↑ 38%',
  },

  // ───── 3C 数码 ──────────────────────────────
  {
    id: '3c-tech-001',
    category: '3C数码',
    style: '科技',
    hookType: '数字',
    shots: {
      hook: {
        description: '黑色背景,产品悬浮慢转,蓝紫色科技光线扫描,粒子从一侧涌出',
        voiceover: '5 秒充满 50% 电量,听过吗?',
        caption: '5秒充50%',
      },
      demo: {
        description:
          '快剪展示充电速度对比表,数字"5%→50%"在屏幕上跳动,旁边是普通充电的进度条',
        voiceover: '120W 超级闪充,出门通勤 5 分钟搞定一天电量',
        caption: '120W 闪充',
      },
      cta: {
        description: '产品配件全家福俯拍,顶部加价格冲击文字,金色描边',
        voiceover: '开学季首发,首批用户立减 200,直接秒杀',
        caption: '立减 200',
      },
    },
    keyMessages: ['120W闪充', '5秒50%', '通勤救急', '安全保护'],
    bgmStyle: '电子节拍 + 鼓点,128 BPM',
    performance: '3C 类目首小时点击率 18%,加购率 7%',
  },
  {
    id: '3c-minimalist-002',
    category: '3C数码',
    style: '极简',
    hookType: '对比',
    shots: {
      hook: {
        description: '左右分屏:左侧凌乱桌面+乱七八糟数据线,右侧清爽桌面只有一个产品',
        voiceover: '你的桌面要不要这么乱?',
        caption: '桌面太乱?',
      },
      demo: {
        description: '产品 360 度旋转,展示极简白色机身和无线设计,字幕标出多种适配端口',
        voiceover: '一个底座解决 6 种接口,Mac、iPad、手机全适配',
        caption: '6 合 1',
      },
      cta: {
        description: '产品居中,底部价格条幅缓慢上升,加"今日 0 点首发"文字',
        voiceover: '今晚 0 点开抢,前 50 名直送 type-c 数据线',
        caption: '0 点首发',
      },
    },
    keyMessages: ['极简设计', '6合1接口', '全设备兼容', '空间整洁'],
    bgmStyle: 'lofi 节奏,80 BPM',
    performance: '3C 极简风类目转化率提升 32%',
  },

  // ───── 服饰鞋包 ──────────────────────────────
  {
    id: 'fashion-dynamic-001',
    category: '服饰鞋包',
    style: '动感',
    hookType: '反差',
    shots: {
      hook: {
        description: '模特正面镜头,身穿基础白T,镜头上摇,下一秒已经换上了爆款外套,转场流畅',
        voiceover: '同一件 T,加上这件外套,气质立刻 +200',
        caption: '气质 +200',
      },
      demo: {
        description: '街头多角度走路镜头,慢动作展示外套的版型与材质细节',
        voiceover: '韩版小香风,加厚不臃肿,通勤约会两不误',
        caption: '一衣两穿',
      },
      cta: {
        description: '产品平铺图加多色彩条,字幕标出尺码 S/M/L',
        voiceover: '三个色号每色限量 100 件,链接小黄车第一个',
        caption: '小黄车第一个',
      },
    },
    keyMessages: ['百搭', '加厚不臃肿', '通勤约会', '限量色'],
    bgmStyle: '动感 pop,110 BPM',
    performance: '女装类目完播率 65%,GMV 提升 2.1x',
  },

  // ───── 食品饮料 ──────────────────────────────
  {
    id: 'food-fresh-001',
    category: '食品饮料',
    style: '清新',
    hookType: '揭秘',
    shots: {
      hook: {
        description: '俯拍精致小盒子被打开,蒸汽缓缓升起,镜头穿过雾气进入主体',
        voiceover: '打工人的下午,需要这一口续命神器',
        caption: '续命神器',
      },
      demo: {
        description:
          '微距展示食品质地拉丝(或饮品流动)、配料,旁边有原料图和"0 添加"标识',
        voiceover: '0 蔗糖 0 反式脂肪,真材实料,孕妇都能吃',
        caption: '0 蔗糖 0 反式',
      },
      cta: {
        description: '产品组合包平铺,加促销贴纸,边角带"今日特价"动态标签',
        voiceover: '今天直播间 5 折,买 2 盒送 1 盒',
        caption: '买 2 送 1',
      },
    },
    keyMessages: ['0蔗糖', '0反式', '健康', '上班补能量'],
    bgmStyle: '清新木吉他,90 BPM',
    performance: '食品类目加购率 12%,客单价 ¥48',
  },

  // ───── 家居家电 ──────────────────────────────
  {
    id: 'home-realistic-001',
    category: '家居家电',
    style: '写实',
    hookType: '痛点',
    shots: {
      hook: {
        description: '镜头跟随主人翁清晨皱眉看脏地板,踩到水迹,背景透入晨光',
        voiceover: '每天扫地拖地 1 小时,你也累了吧?',
        caption: '解放双手',
      },
      demo: {
        description: '产品 360 度展示,清扫+拖地一体动作,加字幕"自动回洗、自动烘干"',
        voiceover: '扫拖一体 + 自动回洗,从此告别脏抹布',
        caption: '扫+拖+洗+烘',
      },
      cta: {
        description: '产品在客厅场景中工作,配上"返券 + 12 期免息"的动效贴',
        voiceover: '今晚 8 点首发,12 期免息,到手价 1999',
        caption: '12 期免息',
      },
    },
    keyMessages: ['扫拖一体', '自动回洗', '免息', '解放双手'],
    bgmStyle: '温暖电子,95 BPM',
    performance: '家电类目客单价 ¥1999,转化率 3.2%',
  },

  // ───── 母婴 ──────────────────────────────
  {
    id: 'mother-fresh-001',
    category: '母婴',
    style: '清新',
    hookType: '痛点',
    shots: {
      hook: {
        description: '宝宝在哭闹,妈妈无奈地看着镜头,光线柔和有家庭氛围',
        voiceover: '半夜哭闹的宝宝,是不是肠胃不舒服?',
        caption: '半夜哭闹?',
      },
      demo: {
        description: '产品罐+冲泡过程慢镜头,展示溶解与气味描述',
        voiceover: '益生菌 + DHA 双重配方,呵护宝宝肠道',
        caption: '益生菌 + DHA',
      },
      cta: {
        description: '产品组合搭配婴儿用品全家福',
        voiceover: '前 100 名加赠辅食工具一套,链接在车里',
        caption: '加赠工具',
      },
    },
    keyMessages: ['益生菌', 'DHA', '肠胃呵护', '宝妈推荐'],
    bgmStyle: '温暖柔和木吉他,85 BPM',
    performance: '母婴类目复购率 35%',
  },

  // ───── 运动户外 ──────────────────────────────
  {
    id: 'sport-dynamic-001',
    category: '运动户外',
    style: '动感',
    hookType: '数字',
    shots: {
      hook: {
        description: '运动员高速跑步镜头切换,慢动作展示鞋底气垫弹起的瞬间',
        voiceover: '一双鞋让你成绩快 3 秒',
        caption: '快 3 秒',
      },
      demo: {
        description: '产品分解动画,展示气垫、鞋面、鞋底纹路,字幕标出科技点',
        voiceover: '碳板 + 全掌气垫,助你刷新 PB',
        caption: '碳板 + 气垫',
      },
      cta: {
        description: '运动员领奖镜头 + 产品三色平铺',
        voiceover: '马拉松限定配色,3 个色号下单立减 80',
        caption: '立减 80',
      },
    },
    keyMessages: ['碳板', '全掌气垫', 'PB杀手', '限定配色'],
    bgmStyle: '运动电子,130 BPM',
    performance: '运动类目完播率 70%',
  },
];

export function searchHitScripts(opts: { category?: string; style?: string; topK?: number }): HitScriptSeed[] {
  const { category, style, topK = 3 } = opts;
  const scored = HIT_SCRIPTS.map((s) => {
    let score = 0.1;
    if (category && s.category === category) score += 0.6;
    if (style && s.style === style) score += 0.3;
    // 部分匹配奖励
    if (category && s.category.includes(category)) score += 0.1;
    if (style && s.style.includes(style)) score += 0.1;
    return { item: s, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.item);
}
