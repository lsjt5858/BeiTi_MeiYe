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
}
export interface AboutQualification {
  name: string;
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

export function getAboutDetails(): AboutDetails {
  const now = new Date().toISOString().slice(0, 10);
  const organization = entry(getFact('organization'), now);
  const organizationName = text(organization?.name);
  const teamValue = getFact('team');
  const team: AboutTeamMember[] = [];
  for (const raw of Array.isArray(teamValue) ? teamValue : []) {
    const member = entry(raw, now);
    const name = text(member?.name);
    if (member && name) team.push({ name, role: text(member.role), bio: text(member.bio) });
  }
  const qualificationValue = getFact('qualifications');
  const qualifications: AboutQualification[] = [];
  for (const raw of Array.isArray(qualificationValue) ? qualificationValue : []) {
    const qualification = entry(raw, now);
    const name = text(qualification?.name);
    if (!qualification || !name || (qualification.date !== undefined && !isValidDate(qualification.date))) continue;
    qualifications.push({
      name, issuer: text(qualification.issuer),
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
    qualifications,
    registration: registration && number ? {
      number, label: text(registration.label), authority: text(registration.authority),
      sourceUrl: safeHttpUrl(registration.sourceUrl),
    } : undefined,
  };
}
