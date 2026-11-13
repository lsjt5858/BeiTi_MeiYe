const endpoint = "https://copilot-cn.bytedance.net/api/ide/v1/text_to_image";

const visuals = [
  {
    id: "portrait",
    src: "/images/beiti-hero-generated.jpg",
    alt: "品牌美学视觉：暖光中闭目凝神的女性美容人像",
    label: "光，落在你的美上。",
    imageSize: "landscape_16_9",
    prompt: "高端美业品牌网站整屏首页主视觉摄影：一位成年东亚女性的优雅侧脸与颈肩特写，闭眼，自然精致裸妆，真实细腻肌肤，乌黑头发向后梳，身着黑色丝质抹胸，女性位于画面右侧三分之一，面朝左上方的柔和暖金色窗光，左侧和中央大片深墨绿黑色安静负空间，背景有极其朦胧的暖褐色植物光影，时尚杂志美妆大片，电影感明暗对照，奢华克制，模拟中画幅胶片，真实摄影，细腻颗粒，柔焦背景，宽屏横幅，无文字无标志无水印，不是拼贴，不是广告排版，人物非真实门店员工或客户。",
  },
  {
    id: "detail",
    src: "/images/beiti-detail-generated.jpg",
    alt: "品牌美学视觉：柔光下的裸色美甲与奶油色丝缎",
    label: "美，藏在细节里。",
    imageSize: "landscape_16_9",
    prompt: "高端美业品牌网站艺术摄影：成年女性一只自然优雅的手轻轻放在奶油色丝缎上，五指解剖结构正确，修长手指，低饱和通透裸色美甲，极细金色戒指，一枝白色马蹄莲横卧在画面右下角，手和花位于画面右侧，左侧与中央留有大面积深暖灰墨绿色负空间，侧面暖金色自然窗光，丝缎褶皱细腻，安静奢雅，时尚杂志静物近景摄影，真实皮肤纹理，胶片色彩，高质量摄影，宽屏横幅，没有品牌文字没有水印，不是拼贴，不作为真实客户成果展示。",
  },
  {
    id: "ritual",
    src: "/images/beiti-ritual-generated.jpg",
    alt: "品牌美学视觉：花影、玻璃瓶与浅色静物的暖光意境",
    label: "让美，回归日常。",
    imageSize: "landscape_16_9",
    prompt: "高端美业品牌网站肌肤护理意境静物摄影：一只无标签的磨砂琥珀玻璃瓶，一小碟奶油色护肤膏和浅色天然石材，右侧一枝白色兰花，午后暖金阳光透过植物在石材台面投下纤细的花影，静物位于右侧三分之一，中央及左侧深暖墨色背景与大片柔和负空间，奶油白与暖金配色，艺术画廊般安静，时尚杂志美容编辑摄影，真实物理光影和材质，模拟中画幅胶片，浅景深，宽屏横幅，无文字无商标无水印，不是拼贴，不代表真实销售产品或门店。",
  },
];

export const brandMedia = visuals.map((visual) => ({
  ...visual,
  frozen: true,
  generationUrl: `${endpoint}?prompt=${encodeURIComponent(visual.prompt)}&image_size=${visual.imageSize}`,
}));
