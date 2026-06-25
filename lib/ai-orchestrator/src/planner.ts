/**
 * AI Planner Engine
 *
 * Routes exclusively through OpenRouter with a three-model fallback chain:
 *   1. moonshotai/kimi-k2        (primary)
 *   2. qwen/qwen3-coder          (fallback 1)
 *   3. deepseek/deepseek-v3      (fallback 2)
 *
 * Environment variable required:
 *   OPENROUTER_API_KEY — API key from openrouter.ai
 *
 * Never uses HuggingFace, Gradio, or any other provider.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const PLANNER_MODELS = [
  "moonshotai/kimi-k2",
  "qwen/qwen3-coder",
  "deepseek/deepseek-v3",
] as const;

type PlannerModel = (typeof PLANNER_MODELS)[number];

// ── System prompts ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional software architect and technical planner for an AI Website & Bot Builder platform.

Your role is to analyze user project requests and generate comprehensive, structured architecture plans.

CRITICAL RULES:
- Never respond as a general chatbot or assistant
- Always produce a complete, structured architecture plan with ALL 12 sections
- Be precise, professional, and actionable
- Assume the role of a senior software architect at a top engineering firm
- Plans must be structured for future automation by AI Coder, Designer, and DevOps modules

When a user describes a project (website, bot, SaaS, dashboard, mobile app, API, etc.), output a plan using EXACTLY this format:

## 1. Project Summary
A clear, concise description of the project and its primary value proposition.

## 2. Project Type
Classification: Website / Telegram Bot / Discord Bot / SaaS Platform / Dashboard / Mobile App / API Service / E-Commerce / etc.

## 3. Core Features
List all core features with brief, actionable descriptions.

## 4. Pages / Screens
For websites: list all pages and their purpose.
For bots: list all command flows, menus, and interaction states.

## 5. User Roles
Define all user types and their permissions (e.g., Guest, User, Admin, Super Admin).

## 6. Database Structure
List main data entities and their key fields. Keep it precise and structured.

## 7. API Requirements
List required internal API endpoints and external service integrations.

## 8. System Architecture
Describe the complete technical stack: frontend, backend, database, caching, queues, external services.

## 9. Security Requirements
Authentication method, authorization rules, data protection, input validation, rate limiting.

## 10. Deployment Strategy
Hosting platform, containerization, CI/CD pipeline, environment variables, scaling approach.

## 11. Development Phases
Break development into clear phases (Phase 1: MVP, Phase 2: Core, Phase 3: Advanced) with deliverables.

## 12. Future Enhancements
Features and capabilities to add after initial launch.

IMPORTANT: Always output ALL 12 sections. Be thorough but concise. This plan will be directly consumed by future AI modules for automated project generation.`;

const CONVERSATION_SYSTEM_PROMPT = `You are the AI Agent assistant — a friendly, conversational AI for the AI Agent platform.

The platform helps users build websites, bots, SaaS platforms, dashboards, e-commerce stores, and more using AI automation.

Guidelines:
- When greeted: respond warmly, introduce yourself briefly, and invite the user to describe a project they want to build
- When asked who you are or what you do: explain naturally that you help turn software project ideas into detailed architecture plans
- When asked what you can build: mention websites, bots, dashboards, SaaS platforms, mobile apps, e-commerce stores, and APIs
- When thanked: respond warmly and naturally
- Keep all responses short, friendly, and conversational (2-4 sentences maximum)
- Never output numbered sections, architecture blueprints, or technical project plans
- Respond in the same language the user writes in`;

// ── Intent classification patterns ─────────────────────────────────────────────

// Messages that match these patterns at the start (and are short) are greetings
const GREETING_START_PATTERNS: RegExp[] = [
  /^(hello|hi|hey|howdy|yo|greetings|sup|hola|ciao|bonjour|hallo|salut|ola|ohayo|konnichiwa)\b/i,
  /^good\s+(morning|evening|afternoon|night|day)\b/i,
  // Arabic greetings
  /^(السلام\s*عليكم|سلام|مرحب[اً]?|أهل[اً]?|اهل[اً]?|صباح\s*الخير|مساء\s*الخير|هلا|هاي|ازيك|عامل\s*ايه|كيف\s*حالك)/u,
  // Russian/other common
  /^(привет|здравствуйте|ciao|salve)\b/iu,
];

// Messages matching these patterns are casual conversation (not project requests)
const CASUAL_PATTERNS: RegExp[] = [
  /\bhow\s+are\s+you\b/i,
  /\bwho\s+are\s+you\b/i,
  /\bwhat\s+(can|do)\s+you\b/i,
  /\bwhat\s+is\s+(this|your|the)\b/i,
  /\bwhat\s+are\s+you\b/i,
  /\btell\s+me\s+about\s+your?self\b/i,
  /^(thanks|thank\s+you|thx|ty|cheers|appreciated|great|nice|cool|awesome|perfect|good)\b/i,
  /^(ok|okay|sure|alright|got\s+it|i\s+see|understood)\b/i,
  // Arabic casual
  /^(شكرا|شكراً|ممنون|متشكر|عظيم|حلو|تمام|ماشي)\b/u,
  /\b(مين\s*انت|بتعمل\s*ايه|ايه\s*ده|عامل\s*ايه|كيف\s*حالك)\b/u,
  /^(نعم|لا|ايوه|اه)\b/u,
];

// Both action + type must be present to be a clear project request
const PROJECT_ACTION_PATTERNS: RegExp[] = [
  /\b(build|create|make|develop|design|generate|launch|start|write|code|program|produce|deploy|set\s*up|setup|implement)\b/i,
  /\b(اعمل|أعمل|ابني|أبني|انشئ|أنشئ|طور|اصنع|أصنع|اعملي|اعملنا|ابنيلي|عايز|عاوز|محتاج|ابي|ابغى|ودي)\b/u,
];

const PROJECT_TYPE_PATTERNS: RegExp[] = [
  /\b(website|web\s*app|webapp|web\s*site|app|application|bot|chatbot|telegram|discord|slack|whatsapp|dashboard|saas|platform|api|system|store|shop|portal|service|tool|script|e[-\s]?commerce|ecommerce|mobile\s*app|landing\s*page|crm|erp|cms|marketplace|forum|blog|portfolio|admin\s*panel|control\s*panel|automation)\b/i,
  /\b(موقع|بوت|تطبيق|تيليجرام|ديسكورد|واتساب|لوحة\s*تحكم|منصة|متجر|خدمة|سيستم|موبايل|سكريبت|مدونة|منتدى|نظام|ادارة)\b/u,
];

// ── Types ──────────────────────────────────────────────────────────────────────

type IntentType = "GREETING" | "CONVERSATION" | "PROJECT" | "AMBIGUOUS";

export interface PlannerMessage {
  role: string;
  content: string;
}

export interface PlannerResult {
  content: string;
  model?: string;
  provider?: string;
  error?: string;
}

const TIMEOUT_MS = 90_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitizeEnvString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(
    /^[\s\u00A0\u200B\u200C\u200D\uFEFF\r\n]+|[\s\u00A0\u200B\u200C\u200D\uFEFF\r\n]+$/g,
    "",
  );
  return cleaned || undefined;
}

// ── Error classification ───────────────────────────────────────────────────────

interface ClassifiedError {
  type:
    | "timeout"
    | "rate_limit"
    | "invalid_api_key"
    | "network"
    | "empty_response"
    | "model_unavailable"
    | "unknown";
  message: string;
  userMessage: string;
  retryable: boolean;
}

function classifyError(err: unknown, status?: number): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";

  if (name === "AbortError" || msg.toLowerCase().includes("timeout")) {
    return {
      type: "timeout",
      message: msg,
      userMessage:
        "The request timed out. The model may be under heavy load — please try again.",
      retryable: true,
    };
  }

  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("Too Many Requests")
  ) {
    return {
      type: "rate_limit",
      message: msg,
      userMessage: "Rate limit reached. Trying the next model…",
      retryable: true,
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    msg.includes("invalid api key") ||
    msg.includes("Unauthorized") ||
    msg.includes("API key")
  ) {
    return {
      type: "invalid_api_key",
      message: msg,
      userMessage:
        "Invalid or missing API key. Please set OPENROUTER_API_KEY in Replit Secrets.",
      retryable: false,
    };
  }

  if (
    msg.includes("empty response") ||
    msg.includes("no content") ||
    msg.includes("empty content")
  ) {
    return {
      type: "empty_response",
      message: msg,
      userMessage: "The model returned an empty response. Trying the next model…",
      retryable: true,
    };
  }

  if (
    status === 503 ||
    status === 502 ||
    msg.includes("model not found") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded")
  ) {
    return {
      type: "model_unavailable",
      message: msg,
      userMessage: "Model is currently unavailable. Trying the next model…",
      retryable: true,
    };
  }

  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  ) {
    return {
      type: "network",
      message: msg,
      userMessage: "Network error connecting to OpenRouter. Please check your connection.",
      retryable: false,
    };
  }

  return {
    type: "unknown",
    message: msg,
    userMessage: `Unexpected error: ${msg.slice(0, 200)}`,
    retryable: true,
  };
}

// ── ASCII header validation ────────────────────────────────────────────────────

/**
 * Asserts that every value in a headers map is a valid HTTP ByteString:
 * all characters must be in the range U+0000–U+00FF (Latin-1 / ISO-8859-1).
 * Throws a descriptive error if any non-compliant character is found.
 */
function assertAsciiHeaders(headers: Record<string, string>): void {
  console.log("[Planner] === PRE-FETCH HEADER DIAGNOSTICS ===");
  console.log(`[Planner] Inspecting ${Object.keys(headers).length} headers`);

  for (const [name, value] of Object.entries(headers)) {
    const keyCodes = Array.from(name).map((c) => c.charCodeAt(0));
    const valCodes = Array.from(value).map((c) => c.charCodeAt(0));
    const nonBytestringKey = keyCodes.filter((c) => c > 255);
    const nonBytestringVal = valCodes.filter((c) => c > 255);

    console.log(`[Planner] HEADER KEY   "${name}" len=${name.length} codes=[${keyCodes.join(",")}]`);
    console.log(`[Planner] HEADER VALUE "${value.slice(0, 100)}" len=${value.length} codes=[${valCodes.join(",")}]`);

    if (nonBytestringKey.length > 0) {
      console.log(`[Planner] *** KEY HAS NON-BYTESTRING: [${nonBytestringKey.join(",")}]`);
    }
    if (nonBytestringVal.length > 0) {
      console.log(`[Planner] *** VALUE HAS NON-BYTESTRING: [${nonBytestringVal.join(",")}]`);
    }

    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code > 255) {
        console.log(
          `[Planner] *** FOUND codepoint=${code} (U+${code.toString(16).toUpperCase().padStart(4, "0")}) ` +
            `at index=${i} char="${value[i]}" in header "${name}"`,
        );
        throw new Error(
          `Header "${name}" contains non-ByteString character at index ${i}: ` +
            `U+${code.toString(16).toUpperCase().padStart(4, "0")} ("${value[i]}"). ` +
            `Full value: ${JSON.stringify(value)}`,
        );
      }
    }
  }

  console.log("[Planner] Headers validated");
  console.log("[Planner] ASCII validation passed");
  console.log("[Planner] === END HEADER DIAGNOSTICS ===");
}

// ── Intent classification ──────────────────────────────────────────────────────

/**
 * Fast rule-based intent classifier. Runs synchronously with no API calls.
 * Returns AMBIGUOUS when the message doesn't clearly match any pattern.
 */
function classifyIntentRuleBased(message: string): IntentType {
  const trimmed = message.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Check greeting patterns — short messages starting with a greeting
  for (const pattern of GREETING_START_PATTERNS) {
    if (pattern.test(trimmed) && wordCount <= 8) {
      return "GREETING";
    }
  }

  // Check casual conversation patterns
  for (const pattern of CASUAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return "CONVERSATION";
    }
  }

  // Check for project intent: requires BOTH an action verb AND a project type
  const hasAction = PROJECT_ACTION_PATTERNS.some((p) => p.test(trimmed));
  const hasType = PROJECT_TYPE_PATTERNS.some((p) => p.test(trimmed));

  if (hasAction && hasType) {
    return "PROJECT";
  }

  // Very short messages with no project keywords → likely casual
  if (wordCount <= 3 && !hasAction && !hasType) {
    return "CONVERSATION";
  }

  return "AMBIGUOUS";
}

/**
 * LLM-based intent classifier for ambiguous messages.
 * Uses the cheapest/fastest model with a 10-second timeout.
 * Falls back to AMBIGUOUS on any error.
 */
async function classifyIntentWithLLM(
  message: string,
  apiKey: string,
): Promise<IntentType> {
  const classificationPrompt =
    `Classify the following user message into exactly one category:\n\n` +
    `GREETING - A salutation or opener (hello, hi, good morning, مرحبا, السلام عليكم, etc.)\n` +
    `CONVERSATION - Casual chat, questions about the assistant, thanks, etc. (how are you, who are you, شكرا, etc.)\n` +
    `PROJECT - A request to build, create, or develop software (build a website, create a bot, اعمل موقع, etc.)\n\n` +
    `User message: "${message.slice(0, 500).replace(/"/g, '\\"')}"\n\n` +
    `Reply with ONLY one word: GREETING, CONVERSATION, or PROJECT`;

  try {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ai-agent-platform.replit.app",
      "X-Title": "AI Agent Platform - Planner",
    };

    assertAsciiHeaders(requestHeaders);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          model: "deepseek/deepseek-v3",
          messages: [{ role: "user", content: classificationPrompt }],
          max_tokens: 10,
          temperature: 0,
          stream: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return "AMBIGUOUS";
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = data["choices"] as
      | { message: { content: string | null } }[]
      | undefined;
    const raw = choices?.[0]?.message?.content?.trim().toUpperCase() ?? "";

    if (raw === "GREETING" || raw === "CONVERSATION" || raw === "PROJECT") {
      return raw as IntentType;
    }

    // Handle cases where model adds extra text (e.g., "PROJECT\n...")
    if (raw.startsWith("GREETING")) return "GREETING";
    if (raw.startsWith("CONVERSATION")) return "CONVERSATION";
    if (raw.startsWith("PROJECT")) return "PROJECT";

    return "AMBIGUOUS";
  } catch {
    return "AMBIGUOUS";
  }
}

// ── Single planning model call ─────────────────────────────────────────────────

async function callOpenRouter(
  model: PlannerModel,
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<{ content: string; model: string }> {
  console.log(`[Planner] Request Start - model=${model}`);

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://ai-agent-platform.replit.app",
    "X-Title": "AI Agent Platform - Planner",
  };

  assertAsciiHeaders(requestHeaders);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  console.log("[Planner] Sending OpenRouter request");

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.3,
        stream: false,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "(unreadable)");
    throw Object.assign(
      new Error(`OpenRouter HTTP ${response.status}: ${errText.slice(0, 300)}`),
      { status: response.status },
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (typeof data["error"] === "string") {
    throw new Error(data["error"]);
  }
  if (
    data["error"] &&
    typeof data["error"] === "object" &&
    "message" in (data["error"] as object)
  ) {
    throw new Error((data["error"] as { message: string }).message);
  }

  const choices = data["choices"] as
    | { message: { content: string | null }; finish_reason: string }[]
    | undefined;

  const content = choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(
      `empty response from model. Raw: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }

  const resolvedModel =
    typeof data["model"] === "string" ? data["model"] : model;

  console.log(`[Planner] Request Success — model=${resolvedModel}`);
  return { content, model: resolvedModel };
}

// ── Conversational response call ───────────────────────────────────────────────

async function callOpenRouterConversational(
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<{ content: string; model: string }> {
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://ai-agent-platform.replit.app",
    "X-Title": "AI Agent Platform - Planner",
  };

  assertAsciiHeaders(requestHeaders);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model: "deepseek/deepseek-v3",
        messages,
        max_tokens: 300,
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "(unreadable)");
    throw Object.assign(
      new Error(`OpenRouter HTTP ${response.status}: ${errText.slice(0, 300)}`),
      { status: response.status },
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  const choices = data["choices"] as
    | { message: { content: string | null }; finish_reason: string }[]
    | undefined;

  const content = choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("empty conversational response");
  }

  const resolvedModel =
    typeof data["model"] === "string" ? data["model"] : "deepseek/deepseek-v3";

  return { content, model: resolvedModel };
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function runPlanner(
  userMessage: string,
  history: PlannerMessage[] = [],
): Promise<PlannerResult> {
  console.log("[Planner] Provider = OpenRouter");

  // ── Step 1: Rule-based intent classification ─────────────────────────────────
  let intent = classifyIntentRuleBased(userMessage);
  console.log(`[Planner] Rule-based intent: ${intent}`);

  const apiKey = sanitizeEnvString(process.env["OPENROUTER_API_KEY"]);

  // ── Step 2: LLM classification for ambiguous messages ────────────────────────
  if (intent === "AMBIGUOUS" && apiKey) {
    console.log("[Planner] Intent ambiguous — consulting LLM classifier");
    intent = await classifyIntentWithLLM(userMessage, apiKey);
    console.log(`[Planner] LLM-based intent: ${intent}`);
  }

  // Default unresolved ambiguous to PROJECT (safer than ignoring a build request)
  if (intent === "AMBIGUOUS") {
    intent = "PROJECT";
    console.log("[Planner] Intent still ambiguous — defaulting to PROJECT");
  }

  // ── Step 3: Log final intent (required for runtime verification) ─────────────
  if (intent === "GREETING") {
    console.log("[Intent] Greeting");
  } else if (intent === "CONVERSATION") {
    console.log("[Intent] Conversation");
  } else {
    console.log("[Intent] Project");
  }

  // ── Step 4: Route by intent ───────────────────────────────────────────────────

  // Non-project intents: greetings and casual conversation
  if (intent === "GREETING" || intent === "CONVERSATION") {
    if (!apiKey) {
      // No API key — return a friendly static fallback (no plan, no config guide)
      return {
        content: intent === "GREETING"
          ? buildGreetingFallback()
          : buildConversationFallback(),
        model: "none",
        provider: "openrouter",
      };
    }

    // Use LLM for a natural conversational response
    const conversationalMessages = [
      { role: "system", content: CONVERSATION_SYSTEM_PROMPT },
      ...history
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    try {
      const result = await callOpenRouterConversational(
        conversationalMessages,
        apiKey,
      );
      return {
        content: result.content,
        model: result.model,
        provider: "openrouter",
      };
    } catch (err) {
      console.error("[Planner] Conversational response failed:", err);
      // Fall back to static response rather than surfacing an error
      return {
        content: buildGreetingFallback(),
        model: "none",
        provider: "openrouter",
      };
    }
  }

  // Project intent — run the full planner

  if (!apiKey) {
    console.warn("[Planner] OPENROUTER_API_KEY is not set");
    return {
      content: buildConfigurationGuide(userMessage),
      model: "none",
      provider: "openrouter",
      error: "missing_api_key",
    };
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const modelErrors: { model: PlannerModel; error: ClassifiedError }[] = [];

  for (const model of PLANNER_MODELS) {
    console.log(`[Planner] Model = ${model}`);

    try {
      const result = await callOpenRouter(model, messages, apiKey);
      return {
        content: result.content,
        model: result.model,
        provider: "openrouter",
      };
    } catch (err) {
      const raw = err as Error & { status?: number };
      const classified = classifyError(err, raw.status);

      console.error(
        `[Planner] Request Failed — model=${model} type=${classified.type} message=${classified.message.slice(0, 120)}`,
      );

      modelErrors.push({ model, error: classified });

      // Non-retryable errors abort the entire chain immediately
      if (!classified.retryable) {
        return {
          content: buildFatalErrorMessage(classified, model),
          model,
          provider: "openrouter",
          error: classified.type,
        };
      }

      // Try the next model in the fallback chain
      const nextIndex = PLANNER_MODELS.indexOf(model) + 1;
      if (nextIndex < PLANNER_MODELS.length) {
        const nextModel = PLANNER_MODELS[nextIndex]!;
        console.log(
          `[Planner] Fallback Activated — switching from ${model} to ${nextModel}`,
        );
      }
    }
  }

  // All models exhausted
  console.error("[Planner] All models in fallback chain failed");
  return {
    content: buildAllFailedMessage(modelErrors),
    model: "none",
    provider: "openrouter",
    error: "all_models_failed",
  };
}

// ── Response builders ──────────────────────────────────────────────────────────

function buildGreetingFallback(): string {
  return `Hello! I'm the **AI Agent** assistant — I help you turn ideas into structured architecture plans for websites, bots, dashboards, SaaS platforms, and more.

To get started, describe the project you'd like to build. For example:
- *"Build a restaurant website with online ordering"*
- *"Create a Telegram download bot"*
- *"Make a SaaS analytics dashboard"*

Add your **OPENROUTER_API_KEY** in Replit Secrets to enable full AI responses.`;
}

function buildConversationFallback(): string {
  return `I'm the **AI Agent** assistant — here to help you plan and architect software projects using AI.

I can generate comprehensive architecture plans for websites, bots, SaaS platforms, dashboards, and more.

Add your **OPENROUTER_API_KEY** in Replit Secrets to enable full conversational responses. Then just describe a project and I'll create a detailed plan for it!`;
}

function buildConfigurationGuide(userMessage: string): string {
  return `## Planner Engine — Configuration Required

The AI Planner requires an OpenRouter API key to generate architecture plans.

**Your request:** "${userMessage.slice(0, 120)}${userMessage.length > 120 ? "..." : ""}"

---

To activate the Planner, set this environment variable in Replit Secrets:

**OPENROUTER_API_KEY** — Your API key from [openrouter.ai](https://openrouter.ai/keys)

OpenRouter is free to sign up. The Planner uses:
- **Primary:** moonshotai/kimi-k2
- **Fallback 1:** qwen/qwen3-coder
- **Fallback 2:** deepseek/deepseek-v3

Once the key is set, restart the backend and try again.`;
}

function buildFatalErrorMessage(
  classified: ClassifiedError,
  model: PlannerModel,
): string {
  return `⚠️ Planner Error

**Provider:** OpenRouter
**Model:** ${model}
**Error type:** ${classified.type}

${classified.userMessage}

${
  classified.type === "invalid_api_key"
    ? "Add your OpenRouter API key to Replit Secrets as **OPENROUTER_API_KEY** and restart the backend."
    : "Please check your network connection and try again."
}`;
}

function buildAllFailedMessage(
  modelErrors: { model: PlannerModel; error: ClassifiedError }[],
): string {
  const lines = modelErrors.map(
    ({ model, error }) => `- **${model}**: ${error.userMessage}`,
  );

  return `⚠️ Planner — All Models Unavailable

The Planner tried every model in the fallback chain but none succeeded:

${lines.join("\n")}

**Provider:** OpenRouter
**Fallback chain:** ${PLANNER_MODELS.join(" -> ")}

Please try again in a moment. If the issue persists, verify your OPENROUTER_API_KEY is valid at [openrouter.ai/keys](https://openrouter.ai/keys).`;
}
