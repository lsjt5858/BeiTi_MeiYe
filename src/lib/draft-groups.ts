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
    description: '贝缇课程介绍汇总，以及选校、学徒、学习周期、周末班和线上线下课程的比较。',
    slugs: [
      'beiti-course-guide',
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
  {
    title: '技法笔记',
    eyebrow: 'CRAFT NOTES',
    description: '美甲与美睫的观察方法、练习顺序和常见偏差，按一个技术点一篇整理。',
    slugs: [
      'nail-shape-three-views',
      'nail-structure-before-prep',
      'dry-wet-nail-prep',
      'russian-prep-safe-pocket',
      'nail-tool-maintenance',
      'solid-color-even-coating',
      'nail-color-clean-margins',
      'nail-structure-light-reflection',
      'tips-vs-gel-extension',
      'paper-form-alignment',
      'shallow-tips-position',
      'almond-oval-tips',
      'square-tube-c-curve',
      'extension-gel-bubbles',
      'airbrush-soft-gradient',
      'round-flat-lash-selection',
      'lash-curl-jbcd',
      'lash-root-tip-curl',
      'lash-tweezer-support',
      'lash-straight-line-view',
      'lash-adhesion-ab-points',
      'lash-glue-working-time',
      'lash-root-gaps-shape',
      'lash-contour-framework-fill',
      'lash-length-point-map',
      'tassel-lash-layer-spacing',
      'manga-lash-column-three-lines',
      'fox-lash-tail-flow',
      'natural-lashes-space-color',
      'lash-design-open-eye-review',
    ],
  },
];

export function groupForSlug(slug: string) {
  return articleGroups.find((group) => group.slugs.includes(slug));
}
