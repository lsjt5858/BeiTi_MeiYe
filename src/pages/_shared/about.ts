import { getFact, isValidDate } from '../../lib/content.ts';
import { safeHttpUrl } from './values.ts';

export interface AboutOrganization {
  name: string;
  legalName?: string;
  description?: string;
  website?: string;
}
export interface AboutTeamMember {
  name: string;
  role?: string;
  bio?: string;
  photo?: { src: string; alt: string; width: number; height: number; caption?: string };
}
export interface AboutQualification {
  name: string;
  description?: string;
  issuer?: string;
  date?: string;
  sourceUrl?: string;
}
export interface AboutRegistration {
  number: string;
  label?: string;
  authority?: string;
  sourceUrl?: string;
}
export interface AboutDetails {
  organization?: AboutOrganization;
  team: AboutTeamMember[];
  teachingRoles: AboutTeamMember[];
  qualifications: AboutQualification[];
  registration?: AboutRegistration;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    ? value.trim() : undefined;
}

function entry(value: unknown, now: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  // The outer fact is already confirmed by getFact; explicit member states may only restrict it.
  if (record.status !== undefined && record.status !== 'confirmed') return undefined;
  if (record.expires_at !== undefined && (!isValidDate(record.expires_at) || record.expires_at < now)) return undefined;
  return record;
}

function photo(value: unknown): AboutTeamMember['photo'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const src = text(item.src);
  const alt = text(item.alt);
  const width = item.width;
  const height = item.height;
  if (!src || !/^\/images\/team\/[a-z0-9-]+\.(?:webp|jpg|png)$/.test(src) || !alt
    || typeof width !== 'number' || !Number.isInteger(width) || width <= 0 || width > 4096
    || typeof height !== 'number' || !Number.isInteger(height) || height <= 0 || height > 4096) return undefined;
  return { src, alt, width, height, caption: text(item.caption) };
}

function members(value: unknown, now: string): AboutTeamMember[] {
  const result: AboutTeamMember[] = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const member = entry(raw, now);
    const name = text(member?.name);
    if (member && name) result.push({ name, role: text(member.role), bio: text(member.bio), photo: photo(member.photo) });
  }
  return result;
}

export function getAboutDetails(): AboutDetails {
  const now = new Date().toISOString().slice(0, 10);
  const organization = entry(getFact('organization'), now);
  const organizationName = text(organization?.name);
  const team = members(getFact('team'), now);
  const teachingRoles = members(getFact('team.roles'), now);
  const qualificationValue = getFact('qualifications');
  const qualifications: AboutQualification[] = [];
  for (const raw of Array.isArray(qualificationValue) ? qualificationValue : []) {
    const qualification = entry(raw, now);
    const name = text(qualification?.name);
    if (!qualification || !name || (qualification.date !== undefined && !isValidDate(qualification.date))) continue;
    qualifications.push({
      name, description: text(qualification.description), issuer: text(qualification.issuer),
      date: isValidDate(qualification.date) ? qualification.date : undefined,
      sourceUrl: safeHttpUrl(qualification.sourceUrl),
    });
  }
  const registration = entry(getFact('registration'), now);
  const number = text(registration?.number);
  return {
    organization: organization && organizationName ? {
      name: organizationName, legalName: text(organization.legalName),
      description: text(organization.description), website: safeHttpUrl(organization.website),
    } : undefined,
    team,
    teachingRoles,
    qualifications,
    registration: registration && number ? {
      number, label: text(registration.label), authority: text(registration.authority),
      sourceUrl: safeHttpUrl(registration.sourceUrl),
    } : undefined,
  };
}
