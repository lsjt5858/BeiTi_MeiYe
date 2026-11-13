import catalogue from '../../public/images/visual-catalog.json' with { type: 'json' };
import type { Locale } from './i18n.ts';

export interface Copy { zh: string; en: string }
export interface VisualImage {
  id: string;
  series: string;
  title: Copy;
  src: string;
  large: string;
  thumbnail: string;
  width: number;
  height: number;
  generated: true;
}
export interface VisualSeries {
  slug: string;
  section: 'training' | 'gallery';
  path: string;
  title: Copy;
  subtitle: Copy;
  description: Copy;
  cover: string;
  topics: { title: Copy; description: Copy; image: string }[];
}
export const visualImages = catalogue.images as VisualImage[];
export const copy = (value: Copy, locale: Locale): string => value[locale === 'en' ? 'en' : 'zh'];
export const conceptNotice: Copy = {
  zh: '影像仅供审美与学习方向参考，不代表真实课堂、人员或客户成果。',
  en: 'Imagery is for visual and learning inspiration, not actual classes, people or customer results.',
};
export const trainingNotice: Copy = {
  zh: '以下为学习方向参考；课期、费用与地点尚待确认，暂不代表已开班或可报名。实操影像不作为教学操作标准。',
  en: 'These are learning directions; dates, fees and locations still need to be confirmed. They do not indicate available classes or enrolment. Practice imagery is not an operating guide.',
};
export const visualSeries: VisualSeries[] = [
  {
    slug: 'nail-training', section: 'training', path: '/training/nails/',
    title: { zh: '美甲培训', en: 'Nail training' },
    subtitle: { zh: '把热爱，练成指尖的技艺。', en: 'Turn a love of beauty into a considered craft.' },
    description: { zh: '从甲型、配色到细线与花朵，认识美甲学习中的不同方向，找到你想继续探索的细节。', en: 'Explore nail shape, colour, fine lines and floral details, and discover the part of nail design you want to understand next.' },
    cover: '01-08',
    topics: [
      { title: { zh: '基础与修型', en: 'Shape and foundations' }, description: { zh: '关注甲型比例、工具选择与甲缘细节。', en: 'Consider shape, proportion, tools and the fine details of the nail edge.' }, image: '01-02' },
      { title: { zh: '色彩与细线', en: 'Colour and fine lines' }, description: { zh: '观察裸色搭配、细线描绘与法式边缘的变化。', en: 'Explore nude palettes, fine-line work and variations on French tips.' }, image: '01-03' },
      { title: { zh: '练习与表达', en: 'Practice and expression' }, description: { zh: '从小花练习与样本讨论中，整理自己的审美偏好。', en: 'Use floral details and sample discussions to identify your visual preferences.' }, image: '01-07' },
    ],
  },
  {
    slug: 'lash-training', section: 'training', path: '/training/lashes/',
    title: { zh: '美睫培训', en: 'Lash training' },
    subtitle: { zh: '每一道弧线，都值得认真。', en: 'Every delicate curve deserves attention.' },
    description: { zh: '从工具与毛束观察，到弧度和眼型设计，了解美睫学习中需要关注的问题。', en: 'Explore tools, lash fans, curls and eye-shape design, with questions to guide further learning.' },
    cover: '02-09',
    topics: [
      { title: { zh: '工具与毛束', en: 'Tools and lash fans' }, description: { zh: '认识镊子、睫毛样本与毛束的细微差异。', en: 'Look closely at tweezers, lash samples and the subtle differences between fans.' }, image: '02-03' },
      { title: { zh: '弧度与设计', en: 'Curls and design' }, description: { zh: '结合样本，讨论自然弧度与眼型设计的关系。', en: 'Use samples to explore the relationship between curls and eye-shape design.' }, image: '02-05' },
      { title: { zh: '观察与练习', en: 'Observation and practice' }, description: { zh: '以模拟练习和细节观察作为学习方向参考。', en: 'Consider simulated practice and close observation as learning directions.' }, image: '02-08' },
    ],
  },
  {
    slug: 'salon-management', section: 'training', path: '/training/salon-management/',
    title: { zh: '店务运营管理', en: 'Salon management' },
    subtitle: { zh: '让细致，贯穿每一次相遇。', en: 'Bring care to every part of the experience.' },
    description: { zh: '从接待沟通、预约排班，到库存陈列和经营复盘，梳理美业门店日常运营的学习方向。', en: 'Explore reception, scheduling, supplies, presentation and reflection as parts of everyday salon operations.' },
    cover: '06-01',
    topics: [
      { title: { zh: '接待与沟通', en: 'Reception and conversation' }, description: { zh: '关注需求表达、服务礼仪与顾客沟通。', en: 'Consider preferences, welcoming etiquette and conversations with clients.' }, image: '06-02' },
      { title: { zh: '排班与库存', en: 'Schedules and supplies' }, description: { zh: '梳理预约安排、工具库存与服务区陈列。', en: 'Explore appointments, stock organisation and thoughtful presentation.' }, image: '06-04' },
      { title: { zh: '记录与复盘', en: 'Documentation and reflection' }, description: { zh: '通过作品拍摄与日常复盘，整理运营问题。', en: 'Use photography and regular reflection to identify operational questions.' }, image: '06-08' },
    ],
  },
  {
    slug: 'nails', section: 'gallery', path: '/gallery/nails/',
    title: { zh: '美甲细节', en: 'Nail details' },
    subtitle: { zh: '举手之间，藏着你的偏爱。', en: 'Small gestures, personal details.' },
    description: { zh: '裸色、法式、猫眼与金线，记录甲面光泽、配色和细节的不同表达。', en: 'Nude tones, French tips, cat-eye shimmer and gold lines: different expressions of colour, gloss and detail.' },
    cover: '04-01', topics: [],
  },
  {
    slug: 'lashes', section: 'gallery', path: '/gallery/lashes/',
    title: { zh: '美睫细节', en: 'Lash details' },
    subtitle: { zh: '一眼之间，自有温柔。', en: 'A softer way to see the details.' },
    description: { zh: '从自然羽感到暖棕柔睫，观察弧度、层次和光影中的细微变化。', en: 'From feathered lashes to soft brown tones, explore subtle changes in curl, layers and light.' },
    cover: '03-06', topics: [],
  },
  {
    slug: 'japanese-nails', section: 'gallery', path: '/gallery/japanese-nails/',
    title: { zh: '日式美甲', en: 'Japanese nail art' },
    subtitle: { zh: '留一点白，让美慢慢生长。', en: 'Leave room for light and quiet detail.' },
    description: { zh: '晕染、琥珀、贝壳与植物细线，以通透材质和留白，表达轻盈的日式美甲灵感。', en: 'Soft blends, amber, shell and botanical lines, with translucent materials and negative space for Japanese nail inspiration.' },
    cover: '05-02', topics: [],
  },
];
export const imageById = (id: string): VisualImage => {
  const image = visualImages.find(item => item.id === id);
  if (!image) throw new Error(`Missing concept image: ${id}`);
  return image;
};
export const imagesFor = (series: VisualSeries): VisualImage[] => visualImages.filter(image => image.series === series.slug);
