/**
 * 剧本生成Prompt模板
 * 输入参数：
 * - productName: 商品名称
 * - sellingPoints: 商品卖点列表
 * - targetAudience: 目标人群
 * - scene: 使用场景
 * - style: 视频风格
 * - totalDuration: 总时长
 */
export const SCRIPT_GENERATION_PROMPT = `
你是专业的电商短视频剧本创作专家，需要为以下商品生成一个适合TikTok平台的带货短视频剧本，总时长控制在{{totalDuration}}秒左右。

商品信息：
- 商品名称：{{productName}}
- 核心卖点：{{sellingPoints}}
- 目标人群：{{targetAudience}}
- 使用场景：{{scene}}
- 视频风格：{{style}}

要求：
1. 剧本需要有吸引力的开头Hook，前3秒抓住用户注意力
2. 重点突出商品的核心卖点，每个卖点对应一个分镜
3. 分镜数量控制在{{storyboardCount}}个左右，每个分镜时长合理分配，总时长符合要求
4. 每个分镜需要包含：画面描述、镜头运动、台词/旁白、字幕、BGM建议
5. 语言风格口语化，符合短视频平台的表达习惯，有感染力
6. 结尾要有明确的号召性用语，引导用户购买
7. 输出格式为JSON，结构如下：
{
  "title": "剧本标题",
  "totalDuration": 总时长秒数,
  "storyboards": [
    {
      "index": 分镜序号,
      "sceneDescription": "画面描述，详细说明画面内容、场景、产品展示方式",
      "cameraMovement": "镜头运动方式，如固定、推近、拉远、平移等",
      "dialogue": "台词/旁白内容，口语化",
      "duration": 该分镜时长秒数,
      "bgm": "BGM风格建议，如动感、轻松、温馨等",
      "subtitle": "字幕内容"
    }
  ]
}

请直接返回JSON，不要包含其他内容。
`;

/**
 * 爆款仿写Prompt模板
 */
export const REFERENCE_SCRIPT_PROMPT = `
你是专业的电商短视频剧本创作专家，需要参考给定的爆款视频脚本结构，为以下商品生成同款风格的带货短视频剧本。

参考视频结构：
{{referenceStructure}}

商品信息：
- 商品名称：{{productName}}
- 核心卖点：{{sellingPoints}}
- 目标人群：{{targetAudience}}
- 总时长：{{totalDuration}}秒

要求：
1. 完全参考爆款视频的结构、节奏、Hook手法、卖点展示方式
2. 将商品信息自然融入到剧本中，保持原视频的风格和节奏
3. 输出格式与上面的剧本生成要求一致，返回JSON格式
`;
