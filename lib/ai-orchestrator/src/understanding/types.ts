/**
 * Understanding Engine — Type Definitions
 *
 * Captures everything the system needs to know about a project
 * before any generation begins.
 */

export type ProjectType =
  | "website"
  | "web-app"
  | "api"
  | "bot"
  | "fullstack"
  | "e-commerce"
  | "dashboard"
  | "blog"
  | "portfolio"
  | "saas"
  | "mobile-app"
  | "cli"
  | "library"
  | "unknown";

export interface FrontendRequirements {
  required: boolean;
  framework: string;
  styling: string;
  pages: string[];
  hasAuth: boolean;
  hasDashboard: boolean;
  hasStaticPages: boolean;
  routing: string;
  stateManagement: string;
}

export interface BackendRequirements {
  required: boolean;
  framework: string;
  language: string;
  hasRestApi: boolean;
  hasWebSockets: boolean;
  hasGraphQL: boolean;
  hasQueues: boolean;
  hasWorkers: boolean;
  serverless: boolean;
}

export interface DatabaseRequirements {
  required: boolean;
  type: string;
  orm: string;
  tables: string[];
  requiresMigrations: boolean;
  requiresSeeding: boolean;
  caching: boolean;
}

export interface AuthRequirements {
  required: boolean;
  provider: string;
  roles: string[];
  hasEmailVerification: boolean;
  hasMfa: boolean;
  hasSocialLogin: boolean;
  sessionManagement: string;
}

export interface ApiRequirements {
  externalApis: string[];
  webhooks: boolean;
  rateLimit: boolean;
  versioning: boolean;
  documentation: boolean;
}

export interface DeploymentRequirements {
  platform: string;
  containerized: boolean;
  hasCI: boolean;
  environments: string[];
  region: string;
  cdn: boolean;
  monitoring: boolean;
}

export interface SecurityRequirements {
  cors: boolean;
  helmet: boolean;
  csrfProtection: boolean;
  encryption: boolean;
  inputSanitization: boolean;
  xssProtection: boolean;
  sqlInjectionProtection: boolean;
  rateLimit: boolean;
}

export interface PerformanceRequirements {
  caching: boolean;
  cdn: boolean;
  lazyLoading: boolean;
  codeSplitting: boolean;
  imageOptimization: boolean;
  ssr: boolean;
}

export interface ScalabilityRequirements {
  loadBalancing: boolean;
  horizontalScaling: boolean;
  microservices: boolean;
  serverless: boolean;
  eventDriven: boolean;
}

export interface InferredRequirement {
  category: string;
  requirement: string;
  confidence: number;
  reasoning: string;
}

export interface ProjectUnderstanding {
  projectType: ProjectType;
  businessDomain: string;
  targetUsers: string;
  complexity: "simple" | "moderate" | "complex" | "enterprise";
  confidence: number;

  frontend: FrontendRequirements;
  backend: BackendRequirements;
  database: DatabaseRequirements;
  auth: AuthRequirements;
  apis: ApiRequirements;
  integrations: string[];
  deployment: DeploymentRequirements;
  security: SecurityRequirements;
  performance: PerformanceRequirements;
  scalability: ScalabilityRequirements;

  inferredRequirements: InferredRequirement[];
  ambiguities: string[];
  assumptions: string[];

  rawRequest: string;
  analyzedAt: string;
}
