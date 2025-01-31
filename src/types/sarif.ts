export interface SarifLog {
  version: string;
  runs: Run[];
}

export interface Run {
  tool: {
    driver: {
      name: string;
      rules?: Rule[];
    };
  };
  results: Result[];
}

export interface Rule {
  id: string;
  name?: string;
  shortDescription?: {
    text: string;
  };
  defaultConfiguration?: {
    level?: string;
  };
  properties?: {
    tags?: string[];
  };
}

export interface Result {
  ruleId: string;
  message: {
    text: string;
  };
  locations?: Location[];
  level?: string;
}

export interface Location {
  physicalLocation?: {
    artifactLocation?: {
      uri: string;
    };
    region?: {
      startLine: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    };
  };
}