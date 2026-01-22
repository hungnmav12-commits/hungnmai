
export interface FilePart {
  mimeType: string;
  data: string;
}

export type ExtractionOption = 'standard' | 'summary' | 'condensed' | 'summary-table' | 'standard-no-grounding';

export interface AnalysisResult {
  content: string;
  date: Date | null;
}
