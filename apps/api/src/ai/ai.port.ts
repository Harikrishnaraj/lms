export const AI_PORT = Symbol('AI_PORT');

export interface CourseOutlineGeneration {
  title: string;
  description: string;
  suggestedDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedMinutes: number;
  modules: {
    title: string;
    lessons: { title: string; type: 'TEXT' | 'VIDEO' | 'DOCUMENT' }[];
  }[];
}

export interface LearnerProfileForAi {
  jobTitle?: string | null;
  departmentName?: string | null;
  completedCourseTitles: string[];
}

export interface AiPort {
  generateCourseOutline(
    topic: string,
    targetAudience?: string,
  ): Promise<CourseOutlineGeneration>;

  generateRecommendations(
    profile: LearnerProfileForAi,
    availableCourseCatalog: { id: string; title: string; description?: string | null }[],
  ): Promise<string[]>; // array of recommended course IDs

  tagContent(text: string): Promise<string[]>;
}
