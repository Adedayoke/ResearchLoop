
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  IMPLEMENTING = 'IMPLEMENTING',
  TESTING = 'TESTING',
  DEBUGGING = 'DEBUGGING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface PaperAnalysis {
  title: string;
  authors: string[];
  summary: string;
  methodology: string;
  algorithmPseudocode: string;
  metrics: string[];
  benchmarks: {
    name: string;
    score: number;
    unit: string;
  }[];
}

export interface ImplementationResult {
  code: string;
  explanation: string;
  tests: string;
  testResults: {
    passed: boolean;
    logs: string;
  };
  iterationCount: number;
  finalBenchmarkComparison: {
    name: string;
    paperValue: number;
    implValue: number;
  }[];
}

export interface StepStatus {
  id: AppState;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
}
