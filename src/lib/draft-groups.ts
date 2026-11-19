export interface ArticleGroup {
  title: string;
  eyebrow: string;
  description: string;
  slugs: string[];
}

export const articleGroups: ArticleGroup[] = [
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
      'nail-school-checklist',
    ],
  },
  {
    title: '费用与合同',
    eyebrow: 'COST & CONTRACT',
    description: '学费构成、工具支出、合同条款和“学会为止”的核对方法。',
    slugs: [
      'hangzhou-nail-training-price',
      'nail-training-cost-framework',
      'nail-starter-tool-kit-cost',
      'nail-training-contract-checklist',
      'nail-training-until-learned',
    ],
  },
  {
    title: '职业与经营',
    eyebrow: 'CAREER & BUSINESS',
    description: '收入结构、接单渠道、开店成本、证照和转行路径。',
    slugs: [
      'nail-technician-monthly-income',
      'nail-income-framework',
      'where-to-get-nail-clients',
      'how-much-to-open-nail-salon',
      'open-nail-salon-license',
      'learn-nail-at-35',
    ],
  },
  {
    title: '技术方向',
    eyebrow: 'TECHNIQUE',
    description: '日式与俄式的差异，以及美甲、美睫一起学的取舍。',
    slugs: ['japanese-vs-russian-nail', 'nail-and-lash-together'],
  },
];

export function groupForSlug(slug: string) {
  return articleGroups.find((group) => group.slugs.includes(slug));
}
