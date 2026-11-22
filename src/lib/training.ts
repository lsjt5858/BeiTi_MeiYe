import { getFact } from './content.ts';

export interface CourseModule {
  name: string;
  content: string;
  topics: string[];
  source: string;
}
export interface CourseOutline {
  title: string;
  intro: string;
  modules: CourseModule[];
  reference?: { name: string; duration: string; fee: number; year: number; source: string };
}
export type TrainingDirection = 'nails' | 'lashes' | 'salon-management';
export interface AcademyProfile {
  name: string;
  approach: string;
  description: string;
  specialties: { name: string; detail: string }[];
}
export interface RetrainingPolicy {
  fee: number;
  feeLabel: string;
  description: string;
  booking: string;
  reference: string;
}

export const getCourseOutline = (direction: TrainingDirection) =>
  getFact<Record<TrainingDirection, CourseOutline>>('courses.catalog')?.[direction];
export const getAcademyProfile = () => getFact<AcademyProfile>('academy.profile');
export const getRetrainingPolicy = () => getFact<RetrainingPolicy>('policy.retraining');
