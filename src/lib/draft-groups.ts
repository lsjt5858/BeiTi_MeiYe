export interface DraftGroup {
  title: string;
  eyebrow: string;
  description: string;
  slugs: string[];
}

export const draftGroups: DraftGroup[] = [
  {
    title: '选校与学习路径',
    eyebrow: 'SCHOOL & LEARNING',
    description: '选校、学徒、学习周期、周末班和线上线下课程的比较。',
    slugs: [
      'how-to-choose-nail-school',
      'hangzhou-nail-training-where-good',
      'career-change-nail-hangzhou',
      'apprentice-vs-nail-school',
      'how-long-to-learn-nail',
      'hangzhou-weekend-nail-class',
      'online-vs-offline-nail-course',
    ],
  },
  {
    title: '费用与合同',
    eyebrow: 'COST & CONTRACT',
    description: '学费、工具费、合同条款和包教包会的核对框架。',
    slugs: [
      'hangzhou-nail-training-price',
      'nail-starter-tool-kit-cost',
      'nail-training-contract-checklist',
      'nail-training-until-learned',
    ],
  },
  {
    title: '职业与经营',
    eyebrow: 'CAREER & BUSINESS',
    description: '收入、接单、开店成本、证照和年龄转行。',
    slugs: [
      'nail-technician-monthly-income',
      'where-to-get-nail-clients',
      'how-much-to-open-nail-salon',
      'open-nail-salon-license',
      'learn-nail-at-35',
    ],
  },
  {
    title: '技术方向',
    eyebrow: 'TECHNIQUE',
    description: '日式与俄式、美甲与美睫的路线比较。',
    slugs: ['japanese-vs-russian-nail', 'nail-and-lash-together'],
  },
  {
    title: '站点操作',
    eyebrow: 'SITE GUIDES',
    description: '服务、地点和评价的了解方式，属于站点操作说明。',
    slugs: ['consultation-guide', 'location-guide', 'review-guide'],
  },
  {
    title: '已确认样例',
    eyebrow: 'CONFIRMED SAMPLES',
    description: '已按站点格式发布的一般性文章样例，可在正式文章路由查看。',
    slugs: [
      'preview-article-typography',
      'nail-training-cost-framework',
      'nail-school-checklist',
      'nail-income-framework',
    ],
  },
];

export function groupForSlug(slug: string) {
  return draftGroups.find((group) => group.slugs.includes(slug));
}
