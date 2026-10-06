import type { ComponentType } from 'react';

export interface Instructor {
  name: string;
  role: string;
  bio: string;
  image: string;
  weeks: string;
}

export interface Course {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  mascotImage: string;
  accentColor: string;
  sections: number;
  lessons: number;
  comingSoon?: boolean;
  startDate?: string;
  instructors?: Instructor[];
}

export interface LessonMeta {
  slug: string;
  title: string;
  description: string;
  duration: string;
  type: string;
  order: number;
  topics?: string[];
}

export interface SectionMeta {
  slug: string;
  title: string;
  order: number;
  color: string;
  duration: string;
  lessons: LessonMeta[];
}

export interface LessonFrontmatter {
  title: string;
  description: string;
  order: number;
  section: string;
  type: string;
  duration: string;
  topics?: string[];
}

interface LessonModule {
  default: ComponentType;
  frontmatter: LessonFrontmatter;
}

interface SectionFile {
  title?: string;
  order?: number;
  color?: string;
  duration?: string;
}

const courseFiles = import.meta.glob<{ default: Course }>(
  '../content/courses/*.json',
  { eager: true },
);

const sectionFiles = import.meta.glob<{ default: SectionFile }>(
  '../content/lessons/**/section.json',
  { eager: true },
);

const lessonFiles = import.meta.glob<LessonModule>(
  '../content/lessons/**/*.mdx',
  { eager: true },
);

function parseLessonPath(filePath: string) {
  const match = filePath.replace(/\\/g, '/').match(
    /content\/lessons\/([^/]+)\/([^/]+)\/([^/]+)\.mdx$/,
  );
  if (!match) return null;

  return {
    courseSlug: match[1],
    sectionSlug: match[2],
    lessonSlug: match[3],
  };
}

function getSectionMeta(
  courseSlug: string,
  sectionFolder: string,
): Omit<SectionMeta, 'lessons'> {
  const key = Object.keys(sectionFiles).find((path) =>
    path.replace(/\\/g, '/').endsWith(
      `/content/lessons/${courseSlug}/${sectionFolder}/section.json`,
    ),
  );
  const data = key ? (sectionFiles[key].default ?? {}) : {};

  return {
    slug: sectionFolder,
    title: data.title ?? sectionFolder,
    order: data.order ?? 99,
    color: data.color ?? '#666',
    duration: data.duration ?? '',
  };
}

export function getAllCourses(): Course[] {
  return Object.values(courseFiles).map((mod) => mod.default);
}

export function getCourseBySlug(slug: string): Course | undefined {
  return getAllCourses().find((course) => course.slug === slug);
}

export function getCourseSections(courseSlug: string): SectionMeta[] {
  const sectionMap = new Map<string, LessonMeta[]>();

  for (const [filePath, mod] of Object.entries(lessonFiles)) {
    const parsed = parseLessonPath(filePath);
    if (!parsed || parsed.courseSlug !== courseSlug) continue;

    const frontmatter = mod.frontmatter;
    if (!sectionMap.has(parsed.sectionSlug)) {
      sectionMap.set(parsed.sectionSlug, []);
    }

    sectionMap.get(parsed.sectionSlug)!.push({
      slug: parsed.lessonSlug,
      title: frontmatter.title,
      description: frontmatter.description,
      duration: frontmatter.duration,
      type: frontmatter.type,
      order: frontmatter.order,
      topics: frontmatter.topics,
    });
  }

  const sections: SectionMeta[] = [];
  for (const [sectionFolder, lessonList] of sectionMap) {
    sections.push({
      ...getSectionMeta(courseSlug, sectionFolder),
      lessons: lessonList.sort((a, b) => a.order - b.order),
    });
  }

  return sections.sort((a, b) => a.order - b.order);
}

export function flattenLessons(
  sections: SectionMeta[],
): Array<{ sectionSlug: string; lesson: LessonMeta }> {
  return sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ sectionSlug: section.slug, lesson })),
  );
}

export function getLessonModule(
  courseSlug: string,
  sectionSlug: string,
  lessonSlug: string,
): LessonModule | undefined {
  const entry = Object.entries(lessonFiles).find(([filePath]) => {
    const parsed = parseLessonPath(filePath);
    return (
      parsed?.courseSlug === courseSlug &&
      parsed.sectionSlug === sectionSlug &&
      parsed.lessonSlug === lessonSlug
    );
  });

  return entry?.[1];
}
