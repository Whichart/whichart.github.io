// Generated at build time by build.mjs from charts/, patterns/ and charts/planned.yaml.
declare module 'whichart:content' {
  export interface ChartContent {
    id: string;
    doc: {
      name: string;
      aliases: string[];
      summary: string;
      goals: string[];
      code: Record<string, string>;
      [key: string]: unknown;
    };
    guide: string;
    code: Record<string, { file: string; source: string }>;
  }
  export interface PatternContent {
    id: string;
    question: string;
    summary: string;
    goal: string;
    industries: string[];
    keywords?: string[];
    recommended: string;
    alternatives?: { id: string; when: string }[];
    why: string;
  }
  const content: { charts: ChartContent[]; patterns: PatternContent[]; names: Record<string, string>; site: string };
  export default content;
}
declare const WHICHART_VERSION: string;
