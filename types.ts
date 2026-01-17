
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  IMPLEMENTING = 'IMPLEMENTING',
  TESTING = 'TESTING',
  DEBUGGING = 'DEBUGGING',
  VISUALIZING = 'VISUALIZING',
  VOCALIZING = 'VOCALIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface GroundingSource {
  title: string;
  uri: string;
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
  groundingSources?: GroundingSource[];
}

export interface CodeVersion {
  iteration: number;
  code: string;
  error?: string;
  explanation: string;
  matchScore: number;
}

export interface EquationMapping {
  theory: string;
  codeSnippet: string;
  explanation: string;
}

export interface VariableState {
  name: string;
  type: string;
  value: string;
}

export interface ImplementationResult {
  code: string;
  explanation: string;
  tests: string;
  testResults: {
    passed: boolean;
    logs: string;
    variables?: VariableState[];
  };
  iterationCount: number;
  history: CodeVersion[];
  equationMappings: EquationMapping[];
  finalBenchmarkComparison: {
    name: string;
    paperValue: number;
    implValue: number;
  }[];
  architectureImage?: string;
  audioData?: string;
}

export interface StepStatus {
  id: AppState;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
}
