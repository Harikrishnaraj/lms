import { Injectable } from '@nestjs/common';
import { AiPort, CourseOutlineGeneration, LearnerProfileForAi } from '../ai.port';

@Injectable()
export class StandardAiProvider implements AiPort {
  async generateCourseOutline(
    topic: string,
    targetAudience?: string,
  ): Promise<CourseOutlineGeneration> {
    const cleanTopic = topic.trim();
    const audienceStr = targetAudience ? ` for ${targetAudience}` : '';

    return {
      title: `${cleanTopic}: Core Fundamentals${audienceStr}`,
      description: `A comprehensive, structured training curriculum covering key concepts, best practices, and practical application of ${cleanTopic}.`,
      suggestedDifficulty: 'BEGINNER',
      estimatedMinutes: 60,
      modules: [
        {
          title: `Module 1: Introduction to ${cleanTopic}`,
          lessons: [
            { title: 'Overview & Objectives', type: 'TEXT' },
            { title: 'Core Concepts & Principles', type: 'VIDEO' },
          ],
        },
        {
          title: `Module 2: Practical Implementation & Best Practices`,
          lessons: [
            { title: 'Step-by-Step Workflow', type: 'DOCUMENT' },
            { title: 'Real-World Case Study', type: 'TEXT' },
          ],
        },
        {
          title: `Module 3: Mastery & Review`,
          lessons: [
            { title: 'Summary of Key Takeaways', type: 'TEXT' },
          ],
        },
      ],
    };
  }

  async generateRecommendations(
    profile: LearnerProfileForAi,
    availableCourseCatalog: { id: string; title: string; description?: string | null }[],
  ): Promise<string[]> {
    // Deterministic recommendation heuristic: Prioritize courses not yet completed
    const notCompleted = availableCourseCatalog.filter(
      (c) => !profile.completedCourseTitles.includes(c.title),
    );

    // If job title/department matches keywords in course title, prioritize them
    const scored = notCompleted.map((c) => {
      let score = 1;
      const text = `${c.title} ${c.description ?? ''}`.toLowerCase();
      if (profile.jobTitle && text.includes(profile.jobTitle.toLowerCase())) score += 3;
      if (profile.departmentName && text.includes(profile.departmentName.toLowerCase())) score += 2;
      return { id: c.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((s) => s.id);
  }

  async tagContent(text: string): Promise<string[]> {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4);

    const frequency: Record<string, number> = {};
    for (const w of words) {
      frequency[w] = (frequency[w] ?? 0) + 1;
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
}
