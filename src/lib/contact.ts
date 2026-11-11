export interface InquiryInput {
  name: string;
  contact: string;
  interest: string;
  message: string;
  privacy: boolean;
  website: string;
}

export interface InquiryData extends Omit<InquiryInput, 'website' | 'privacy'> {
  privacy: true;
}

export type InquiryField = keyof InquiryInput;
export type InquiryErrors = Partial<Record<InquiryField, string>>;
export type InquiryResult =
  | { ok: true; value: InquiryData }
  | { ok: false; errors: InquiryErrors };

// These are visitor intentions, not a catalogue of confirmed services.
export const INQUIRY_INTERESTS = ['美妆造型', '护理咨询', '美甲美睫', '课程了解', '其他咨询'] as const;
const INQUIRY_INTEREST_CODES = [
  ['makeup', '美妆造型'],
  ['skin', '护理咨询'],
  ['nails', '美甲美睫'],
  ['learning', '课程了解'],
] as const;
export const INQUIRY_LIMITS = { name: 40, contact: 80, message: 1200 } as const;
export const INQUIRY_EMAIL_PATTERN = /^[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export function getInquiryInterest(value: string | null): string {
  // Exact code lookup also preserves existing Chinese values; never reflect raw query data.
  const mapped = INQUIRY_INTEREST_CODES.find(([code]) => code === value)?.[1] ?? value;
  return INQUIRY_INTERESTS.find((interest) => interest === mapped) ?? '';
}

export function validateInquiry(input: InquiryInput): InquiryResult {
  const name = input.name.trim();
  const contact = input.contact.trim();
  const message = input.message.replace(/\r\n?/g, '\n').trim();
  const interest = getInquiryInterest(input.interest);
  const errors: InquiryErrors = {};
  const singleLineControls = /[\u0000-\u001f\u007f]/;

  if (!name) errors.name = '请填写一个方便称呼您的名字。';
  else if (input.name.length > INQUIRY_LIMITS.name) errors.name = '称呼请控制在 40 个字符以内。';
  else if (singleLineControls.test(input.name)) errors.name = '称呼请使用单行文字，不要包含控制字符。';

  if (!contact) errors.contact = '请填写手机、固定电话或邮箱。';
  else if (input.contact.length > INQUIRY_LIMITS.contact) errors.contact = '联系方式请控制在 80 个字符以内。';
  else {
    const digits = contact.replace(/\D/g, '').length;
    const phone = /^\+?[\d ()-]+$/.test(contact) && digits >= 7 && digits <= 15;
    if (singleLineControls.test(input.contact) || (!INQUIRY_EMAIL_PATTERN.test(contact) && !phone)) {
      errors.contact = '请检查联系方式：填写完整邮箱，或含 7–15 位数字的电话号码。';
    }
  }

  if (!interest) errors.interest = '请选择一个咨询意向；它不代表服务已开设。';
  if (!message) errors.message = '请简要描述您想了解的问题。';
  else if (input.message.length > INQUIRY_LIMITS.message) errors.message = '留言请控制在 1200 个字符以内。';
  else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
    errors.message = '留言包含无法处理的控制字符，请删除后重试。';
  }
  if (input.privacy !== true) errors.privacy = '请阅读并同意本地需求整理的隐私说明。';
  if (input.website.trim()) errors.website = '无法整理这次填写，请清空表单后重新填写。';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, contact, interest, message, privacy: true } };
}

export function buildInquirySummary(inquiry: InquiryData): string {
  return [
    '咨询需求',
    '状态：需求已整理，尚未发送',
    '',
    `称呼：${inquiry.name}`,
    `联系方式：${inquiry.contact}`,
    `咨询意向：${inquiry.interest}`,
    '',
    '想了解的问题：',
    inquiry.message,
    '',
    '此摘要仅在本机整理，不代表预约或服务确认。',
    '请在真实联系方式公布后，自行选择是否分享；分享前请核对并删除不必要的个人信息。',
  ].join('\n');
}
