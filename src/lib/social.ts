import { getFact, isHttpUrl, type ContentModel } from './content.ts';

// Official websites are navigation fallbacks; only confirmed facts supply account links.
const platforms = [
  { id: 'douyin', region: 'china', name: '抖音', description: '短视频与美业日常', officialUrl: 'https://www.douyin.com/' },
  { id: 'xiaohongshu', region: 'china', name: '小红书', description: '美学作品与灵感笔记', officialUrl: 'https://www.xiaohongshu.com/' },
  { id: 'wechat-channels', region: 'china', name: '微信视频号', description: '视频分享与微信内交流', officialUrl: 'https://channels.weixin.qq.com/' },
  { id: 'wechat-official', region: 'china', name: '微信公众号', description: '课程资讯与品牌长文', officialUrl: 'https://mp.weixin.qq.com/' },
  { id: 'bilibili', region: 'china', name: '哔哩哔哩', description: '教学演示与完整学习过程', officialUrl: 'https://www.bilibili.com/' },
  { id: 'dianping', region: 'china', name: '美团 / 大众点评', description: '门店信息与到店了解', officialUrl: 'https://www.dianping.com/', needsLocation: true },
  { id: 'instagram', region: 'international', name: 'Instagram', description: '作品集与海外美学展示', officialUrl: 'https://www.instagram.com/' },
  { id: 'tiktok', region: 'international', name: 'TikTok', description: '面向海外的短视频分享', officialUrl: 'https://www.tiktok.com/' },
  { id: 'youtube', region: 'international', name: 'YouTube', description: '教学长视频与 Shorts', officialUrl: 'https://www.youtube.com/' },
  { id: 'facebook', region: 'international', name: 'Facebook', description: '品牌主页与社群交流', officialUrl: 'https://www.facebook.com/' },
  { id: 'x', region: 'international', name: 'X', description: '品牌动态与海外交流', officialUrl: 'https://x.com/' },
  { id: 'amap', region: 'china', name: '高德地图', description: '校区位置与路线查询', officialUrl: 'https://www.amap.com/', needsLocation: true },
] as const;

export function getSocialChannels(model: Pick<ContentModel, 'getFact'> = { getFact }) {
  return platforms.map(platform => {
    const value = model.getFact(`social.${platform.id}`);
    const url = isHttpUrl(value) && value.startsWith('https:') ? value : undefined;
    return { ...platform, url, needsLocation: 'needsLocation' in platform && platform.needsLocation };
  });
}
