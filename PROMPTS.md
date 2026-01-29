# ResearchAI - Complete Technical Documentation

This document provides comprehensive documentation for the ResearchAI application, including architecture, prompts, components, state management, and implementation details.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Form Builder Agent](#form-builder-agent)
5. [Research Agent](#research-agent)
6. [Mastra Configuration](#mastra-configuration)
7. [Tools](#tools)
8. [Workflows](#workflows)
9. [State Machine](#state-machine)
10. [API Routes](#api-routes)
11. [Components](#components)
12. [Location System](#location-system)
13. [PDF Export](#pdf-export)
14. [UI/UX Features](#uiux-features)
15. [Error Handling](#error-handling)

---

## Application Overview

ResearchAI is an AI-powered research tool that:

1. **Interviews** users through natural conversation to understand research needs
2. **Generates** dynamic forms to capture specific research criteria
3. **Conducts** comprehensive web research using AI agents with real-time tool usage
4. **Presents** research results with source attribution, pros/cons, pricing, and recommendations
5. **Exports** results as professionally formatted PDF reports

### Key Features

- Conversational AI interview using GPT-4o
- Dynamic form generation with conditional logic
- Multi-source web research using Tavily API
- Location-aware research with IP geolocation (auto-detect default)
- Session persistence with Zustand + localStorage
- PDF export with dark theme styling
- Toast notifications for user feedback
- Chat history with multiple sessions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Landing   │  │   App Page  │  │  Components │              │
│  │   Page (/)  │  │   (/app)    │  │  (UI Layer) │              │
│  └─────────────┘  └──────┬──────┘  └─────────────┘              │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              Zustand State Store               │              │
│  │  (Sessions, Messages, Forms, Research, etc.)  │              │
│  └───────────────────────────────────────────────┘              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                       API ROUTES                                 │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │   /api/chat     │         │  /api/research  │                │
│  │ (Form Builder)  │         │ (Research Agent)│                │
│  └────────┬────────┘         └────────┬────────┘                │
└───────────┼───────────────────────────┼─────────────────────────┘
            │                           │
┌───────────┴───────────────────────────┴─────────────────────────┐
│                        MASTRA FRAMEWORK                          │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │  Form Builder   │         │   Research      │                │
│  │     Agent       │         │     Agent       │                │
│  └────────┬────────┘         └────────┬────────┘                │
│           │                           │                          │
│  ┌────────┴────────┐    ┌────────────┴────────────┐             │
│  │ formGenerator   │    │  webSearch  dataSynthesis│            │
│  │     Tool        │    │  locationContext         │             │
│  └─────────────────┘    └──────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                      EXTERNAL APIs                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   OpenAI API    │  │   Tavily API    │  │   ipapi.co      │  │
│  │    (GPT-4o)     │  │  (Web Search)   │  │  (Geolocation)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Next.js | 14.2.35 | React framework with App Router |
| **Language** | TypeScript | 5.9.3 | Type-safe JavaScript |
| **State** | Zustand | 5.0.10 | Client state management with persistence |
| **AI Framework** | Mastra | 1.0.4 | Agent orchestration framework |
| **AI SDK** | Vercel AI SDK | 6.0.59 | Streaming AI responses |
| **LLM** | OpenAI GPT-4o | - | Language model for all agents |
| **Search** | Tavily API | - | Web search with snippets |
| **Geolocation** | ipapi.co | - | IP-based location detection |
| **PDF** | jsPDF | 4.0.0 | PDF generation |
| **Markdown** | react-markdown | 10.1.0 | Markdown rendering |
| **Validation** | Zod | 3.25.76 | Schema validation |

### Environment Variables

```bash
OPENAI_API_KEY=sk-...        # OpenAI API key for GPT-4o
TAVILY_API_KEY=tvly-...      # Tavily API key for web search
```

---

## Form Builder Agent

**Location:** `src/mastra/agents/form-builder-agent.ts`  
**Model:** OpenAI GPT-4o  
**Purpose:** Interview users about research needs and generate customized criteria-gathering forms.

### System Prompt Design Philosophy

The Form Builder Agent operates on a critical distinction: **Criteria vs. Data**.

| Criteria (What we ASK) | Data (What we FIND) |
|------------------------|---------------------|
| "What's your budget?" | "The pricing is $49/month" |
| "Is Slack integration required?" | "Yes, it has Slack integration" |
| "What's your team size?" | "It supports 1-100 users" |

The agent ONLY generates forms that ask for user criteria/constraints, never asking users to provide the research data itself.

### Full System Prompt

```
You are an expert research assistant AI that helps users prepare for comprehensive research. Your job is to interview users to understand their research needs, then generate a customized data collection form.

## Your Personality
- Friendly, professional, and genuinely curious
- Ask thoughtful follow-up questions
- Be concise but thorough
- Show enthusiasm for helping with research
- Use Markdown formatting (bold for key terms, avoid large headers)

## Interview Process

### Phase 1: Initial Understanding (max 4 questions)
- What do they want to research?
- What's their goal or decision they're trying to make?
- Who is this research for? (personal, business, academic)
- What's their timeline or urgency?
- Specific aspects they care most about?
- Any constraints or requirements?
- Geographic considerations
- Budget ranges if relevant
- Technical requirements
- Comparison criteria

## CRITICAL: Track Interview Context

As you interview, TRACK all factual information shared:
- Number of people/users ("we have 5 team members")
- Budget limits ("around $50 per month")
- Specific requirements ("must have Slack integration")
- Location/geography ("we're based in Berlin")
- Timeline ("need this by next month")
- Any other concrete facts

REMEMBER these facts and include them when generating the form. DO NOT ask again for information already provided!

## Form Generation

When you have enough information (usually 3-5 exchanges), generate a form with JSON:

{
  "action": "generate_form",
  "form": {
    "title": "Research: [Topic]",
    "description": "This form will help gather information for your research",
    "researchTopic": "[Main topic]",
    "interviewContext": {
      "context_key": {
        "value": "extracted value",
        "source": "User mentioned: 'original quote or summary'"
      }
    },
    "fields": [
      {
        "id": "field_id",
        "type": "text|textarea|select|multiselect|number|boolean|date",
        "label": "Field Label",
        "helpText": "Why this helps the research",
        "required": true,
        "options": ["Option 1", "Option 2"],
        "prefilledFromInterview": {
          "value": "the value from interview",
          "source": "User said: 'quote'"
        }
      }
    ]
  }
}

### Pre-filled Fields from Interview

When you know information from the interview, add it as `prefilledFromInterview`:
- If user said "I have 5 team members", create field with: 
  `"prefilledFromInterview": {"value": 5, "source": "User mentioned they have 5 team members"}`
- These fields will be pre-populated and shown as context to the user
- You can SKIP fields entirely if the information is already captured in `interviewContext`

## Form Content Rules

1. **NO REDUNDANCY**: Do NOT create fields for info the user already gave
2. **DIG DEEPER**: If basics are known, ask about specifics: Features, Compliance, Self-hosting, API access, Support level
3. **NEVER EMPTY**: The form MUST have at least 5 fields. Ask about "Nice-to-haves", "UI preferences", "Mobile app requirement", etc.

## Field Types
- text: Short answers
- textarea: Longer descriptions
- select: Single choice from options
- multiselect: Multiple choices
- number: Quantities, budgets
- boolean: Yes/no questions
- date: Time-related fields

## Important Rules

1. NEVER generate a form without asking at least 2-3 questions first
2. ALWAYS acknowledge the user's responses before asking more questions
3. If the user's request is vague, ask for clarification
4. After generating the form, tell the user to review it
5. NEVER ask for information the user has already provided
6. Include ALL gathered context in the interviewContext object
7. Start by greeting the user and asking what they'd like to research today
8. OUTPUT THE JSON in your IMMEDIATE response when ready (do not say "I will prepare the form now" and stop)
```

### Tool Integration

The agent uses the `formGenerator` tool (defined in `src/mastra/tools/form-generator.ts`) with this input schema:

```typescript
{
  researchTopic: string,      // Main research topic
  researchGoals: string,      // What user wants to learn/achieve
  userContext: string,        // Relevant context (location, industry)
  formFields: Array<{
    fieldId: string,
    fieldType: string,
    label: string,
    helpText?: string,
    required: boolean,
    options?: string[],
    showOnlyIf?: {
      dependsOnField: string,
      condition: string,
      value: string
    }
  }>
}
```

---

## Research Agent

**Location:** `src/mastra/agents/research-agent.ts`  
**Model:** OpenAI GPT-4o  
**Purpose:** Conduct comprehensive research matching user's specific requirements.

### System Prompt (Requirements-Focused)

The Research Agent is designed to prioritize user requirements over generic information:

```
You are an expert Research Agent specialized in finding solutions that MATCH USER REQUIREMENTS. Your primary goal is NOT to give a generic overview, but to find specific options/products/services that satisfy the user's stated criteria.

## CRITICAL PRIORITY: User Requirements First

Before doing ANY research, you MUST:
1. Extract and understand ALL user requirements from the input
2. Prioritize searches that find options MATCHING these requirements
3. Evaluate every finding against the user's specific criteria
4. REJECT or deprioritize options that don't meet the stated requirements

## Research Process (Agentic Loop)

### Step 1: REQUIREMENTS ANALYSIS (MANDATORY)
- Read the user's form data carefully
- List out EACH specific requirement (budget, features, size, team size, etc.)
- These requirements are your FILTER for all subsequent research
- If requirements are vague, make reasonable assumptions and state them

### Step 2: TARGETED SEARCH STRATEGY
Create search queries that INCLUDE the user's criteria:
- BAD: "best project management tools" (too generic)
- GOOD: "project management tools under $20/user for small teams with Gantt charts"
- GOOD: "cloud storage with HIPAA compliance for healthcare under 100GB"

### Step 3: EXECUTION (Tool Usage Loop)
For EACH user requirement:
1. Search specifically for options that meet that requirement
2. Use `web-search` with queries that include the user's criteria
3. Validate that results actually match (don't just list popular options)
4. Use `data-synthesis` to compare options against the user's needs

Search Strategy:
- **Criteria-Based Search**: "[topic] that [requirement 1] [requirement 2]"
- **Comparison Search**: "[option A] vs [option B] for [user's use case]"
- **Pricing Search**: "[topic] pricing [user's budget range] [user's region]"
- **Review Search**: "[specific option] reviews for [user's team size/use case]"

### Step 4: REQUIREMENT MATCHING
For each option found, explicitly evaluate:
- Does it meet requirement 1? Yes/No
- Does it meet requirement 2? Yes/No
- (repeat for all requirements)
- Overall match score: X/Y requirements met

### Step 5: TERMINATION
Stop when you have:
- Found 3-5 options that meet MOST of the user's requirements
- Gathered pricing for the user's region
- Can clearly explain WHY each option fits (or doesn't fit)
- Maximum 8 tool calls

## Output Format (JSON)

{
  "title": "Research Report: [Topic] - [Key User Criteria]",
  "summary": "4-6 paragraph summary that DIRECTLY ADDRESSES the user's requirements",
  "overview": "2-3 paragraphs explaining solutions that match the user's requirements",
  "keyFindings": [
    "**[Option Name] - Best Match for [Requirement]**: Detailed explanation..."
  ],
  "prosAndCons": {
    "pros": ["**Pro relevant to USER'S needs**: Why this matters for their situation"],
    "cons": ["**Con relevant to USER'S needs**: How this affects their requirements"]
  },
  "pricing": {
    "overview": "Pricing summary in the user's currency/region",
    "tiers": [{ "name": "Tier", "price": "$X/month", "features": "..." }],
    "notes": "How pricing relates to user's budget if specified"
  },
  "competitors": [
    { "name": "Alternative", "comparison": "How this compares FOR THE USER'S REQUIREMENTS" }
  ],
  "recommendations": "SPECIFIC recommendations based on user's requirements. Start with: 'Based on your requirements for [X, Y, Z], I recommend...'",
  "sources": [{ "title": "Source", "url": "https://...", "snippet": "..." }]
}

## Important Rules
- EVERY finding, pro, con, and recommendation must relate to the USER'S STATED REQUIREMENTS
- Don't list popular options that don't match - or clearly state why they don't fit
- Use the user's location for pricing, availability, and regional considerations
- Include 8-12 findings, 5-10 sources, 4-6 pros, 3-5 cons
- If requirements conflict or are impossible to meet, explain this honestly
```

### Agentic Loop Visualization

```
┌─────────────────┐
│  REQUIREMENTS   │ ← Extract criteria from form data
│    ANALYSIS     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    TARGETED     │ ← Build queries WITH user criteria
│   SEARCH PLAN   │
└────────┬────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│              EXECUTION LOOP                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐   │
│  │ Search  │→ │ Validate │→ │  Synthesize │   │
│  │ w/query │  │  match   │  │   findings  │   │
│  └─────────┘  └──────────┘  └─────────────┘   │
│         ↺ Loop for each requirement           │
└────────────────────┬──────────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   OUTPUT    │ ← JSON Report
              │   REPORT    │
              └─────────────┘
```

---

## Mastra Configuration

**Location:** `src/mastra/index.ts`

```typescript
import { Mastra } from "@mastra/core";
import { formBuilderAgent } from "./agents/form-builder-agent";
import { researchAgent } from "./agents/research-agent";
import { researchWorkflow } from "./workflows/research-workflow";

export const mastra = new Mastra({
    agents: {
        formBuilder: formBuilderAgent,
        researcher: researchAgent,
    },
    workflows: {
        research: researchWorkflow,
    },
});
```

### Agent Registration

| Agent ID | Agent Name | Model | Tools |
|----------|------------|-------|-------|
| `formBuilder` | Form Builder Agent | GPT-4o | formGenerator |
| `researcher` | Research Agent | GPT-4o | webSearch, dataSynthesis, locationContext |

---

## Tools

### 1. Web Search Tool

**Location:** `src/mastra/tools/web-search.ts`  
**ID:** `web-search`  
**API:** Tavily Search API

```typescript
inputSchema: {
  query: string,      // The search query
  region?: string     // Optional region bias
}

outputSchema: {
  results: Array<{
    title: string,
    snippet: string,
    url: string
  }>
}
```

**Behavior:**
- Returns up to 5 results per query
- Appends region to query if provided (e.g., "best banks related to Germany")
- Graceful error handling with console logging

### 2. Data Synthesis Tool

**Location:** `src/mastra/tools/data-synthesis.ts`  
**ID:** `data-synthesis`  
**Model:** GPT-4o with JSON mode

```typescript
inputSchema: {
  sources: Array<{ content: string, url: string }>,
  query: string
}

outputSchema: {
  summary: string,
  keyFindings: string[],
  sources: string[]
}
```

**Behavior:**
- Synthesizes multiple sources into structured findings
- Uses JSON mode for reliable parsing
- Maintains source attribution

### 3. Location Context Tool

**Location:** `src/mastra/tools/location-context.ts`  
**ID:** `location-context`  
**API:** ipapi.co (free tier)

```typescript
inputSchema: {
  ip?: string  // Optional, auto-detects if not provided
}

outputSchema: {
  country: string,
  region: string,
  city: string,
  timezone: string
}
```

**Behavior:**
- Used by agent if location missing from input
- Graceful fallback to "Unknown" on errors
- Returns timezone for date-related research

### 4. Form Generator Tool

**Location:** `src/mastra/tools/form-generator.ts`  
**ID:** `form-generator`

Generates structured form schemas with:
- Unique form ID
- Title and description
- Fields with conditional visibility (`showOnlyIf`)
- Research topic metadata
- Validation rules

**Supported Field Types:**
- `text`, `textarea`, `number`, `email`, `url`
- `select`, `multiselect`, `radio`, `checkbox`
- `date`, `datetime`, `boolean`

---

## Workflows

**Location:** `src/mastra/workflows/research-workflow.ts`

### Workflow Steps

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   validate   │ -> │    plan      │ -> │   execute    │ -> │  synthesize  │
│    Input     │    │   Research   │    │   Research   │    │   Results    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

| Step | Purpose | Input | Output |
|------|---------|-------|--------|
| `validate-input` | Validate form data, extract topic | Form data + location | Validated params |
| `plan-research` | Create search queries | Validated params | Search queries array |
| `execute-research` | Perform web searches | Search queries | Raw results |
| `synthesize-results` | Compile final report | Raw results | Structured report |

**Note:** The actual research execution happens in the API route via the Research Agent. The workflow provides structure for the process.

---

## State Machine

**Location:** `src/lib/state-machine.ts`

### Application States

```
┌─────────────────────────────────────────────────────────────────┐
│                        STATE FLOW                                │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ INTERVIEWING │ ←──────────────────────────────────┐          │
│  └──────┬───────┘                                    │          │
│         │ view_form                                  │          │
│         ▼                                            │          │
│  ┌──────────────┐     back_to_interview              │          │
│  │ FORM_PREVIEW │ ───────────────────────────────────┘          │
│  └──────┬───────┘                                               │
│         │ fill_form                                             │
│         ▼                                                       │
│  ┌──────────────┐     back_to_preview                           │
│  │ FORM_ACTIVE  │ ────────────────────► FORM_PREVIEW            │
│  └──────┬───────┘                                               │
│         │ form_submitted                                        │
│         ▼                                                       │
│  ┌──────────────┐     research_cancelled                        │
│  │ RESEARCHING  │ ────────────────────► FORM_ACTIVE             │
│  └──────┬───────┘                                               │
│         │ research_complete                                     │
│         ▼                                                       │
│  ┌──────────────┐     start_new                                 │
│  │  PRESENTING  │ ────────────────────► INTERVIEWING            │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Valid Transitions

```typescript
const VALID_TRANSITIONS: Record<AppState, AppState[]> = {
    INTERVIEWING: ['FORM_PREVIEW'],
    FORM_PREVIEW: ['INTERVIEWING', 'FORM_ACTIVE'],
    FORM_ACTIVE: ['RESEARCHING', 'FORM_PREVIEW'],
    RESEARCHING: ['PRESENTING', 'FORM_ACTIVE'],
    PRESENTING: ['INTERVIEWING'],
};
```

### Store State Interface

```typescript
interface AppStoreState {
    // Current state
    currentState: AppState;
    previousState: AppState | null;
    stateHistory: AppState[];
    transitionLogs: TransitionLog[];
    
    // Error handling
    error: ErrorState | null;
    
    // Session management
    sessions: ChatSession[];
    currentSessionId: string | null;
    
    // Interview data
    chatMessages: ChatMessage[];
    
    // Form data
    formSchema: FormSchema | null;
    formData: FormData;
    
    // Research data
    researchResults: ResearchResult | null;
    researchProgress: number;
    researchStatus: string;
    
    // Location context
    location: LocationContext | null;
    
    // UI state
    isSidebarOpen: boolean;
}
```

### Persistence

Uses Zustand's `persist` middleware with localStorage:
- Saves sessions, messages, forms, research results
- Survives page refresh
- Separate session management with create/switch/delete

---

## API Routes

### Chat API (`/api/chat`)

**Location:** `src/app/api/chat/route.ts`  
**Method:** POST  
**Timeout:** 60 seconds

**Purpose:** Handles the conversational interview with streaming responses.

**Flow:**
1. Receives messages array from client
2. Adds system prompt for Form Builder behavior (inline in route.ts)
3. Calls OpenAI GPT-4o with streaming
4. Returns stream in Vercel AI SDK Data Stream Protocol format (`0:"text"\n`)

**Note:** The Chat API uses an inline SYSTEM_PROMPT defined directly in the route file, not the Mastra formBuilderAgent. This allows for custom streaming behavior.

### Research API (`/api/research`)

**Location:** `src/app/api/research/route.ts`  
**Method:** POST  
**Timeout:** 300 seconds (5 minutes)

**Purpose:** Conducts research using the Research Agent with streaming updates.

**Request Body:**
```typescript
{
    formId: string,
    formData: Record<string, any>,
    location: LocationContext
}
```

**Flow:**
1. Parse and validate request
2. Extract user requirements from form data into explicit list
3. Build prompt with requirements clearly listed
4. Call Research Agent via Mastra with streaming
5. Stream tool usage updates to client (`[System: Using tool webSearch...]`)
6. Return final JSON report

**Prompt Construction:**
```typescript
const userPrompt = `
## Research Request

**Topic**: ${formData.title || formData.researchTopic}
**User Location**: ${location?.city}, ${location?.country}

## CRITICAL USER REQUIREMENTS
The user has specified the following criteria that MUST be addressed:

${requirements.join('\n')}

## Your Task
1. PRIORITIZE finding options that MATCH the user's specific requirements
2. Search for solutions that explicitly satisfy each criterion
3. Compare options based on HOW WELL they meet the stated requirements
4. In recommendations, explain WHY each suggestion fits the user's criteria
`;
```

---

## Components

### Component Structure

```
src/components/
├── ChatInput.tsx          # Chat input with auto-resize textarea
├── ChatMessage.tsx        # Message display with markdown rendering
├── ConfirmModal.tsx       # Accessible confirmation dialog
├── FormActive.tsx         # Multi-step form filling with validation
├── FormPreview.tsx        # Form schema preview before filling
├── LocationBanner.tsx     # Location dropdown with auto-detect (DEFAULT)
├── Researching.tsx        # Research progress with premium animations
├── ResearchResults.tsx    # Results display with PDF export
├── Sidebar.tsx            # Session management sidebar
└── Toast.tsx              # Toast notification system
```

### Key Components

#### LocationBanner (`src/components/LocationBanner.tsx`)

Displays and manages user location with **auto-detect as the default behavior**:

- **Auto-detect on mount:** Automatically detects user's location via ipapi.co when the app loads
- **Shows current location:** Displays detected city and country (e.g., "📍 New York, United States")
- **Dropdown selector:** 15 preset locations with emoji flags
- **Search filter:** Filter locations by typing
- **Auto-detect option:** "Auto-detect my location" re-triggers IP geolocation
- **Global option:** "Global (No specific location)" for general research
- **Changeable:** Users can override their detected location anytime via dropdown
- **Persistence:** Saves to localStorage, respects user overrides
- **Visual feedback:** Pulsing amber border when no location is set

**Preset Locations:**
- New York, United States
- San Francisco, United States
- Los Angeles, United States
- London, United Kingdom
- Berlin, Germany
- Paris, France
- Tokyo, Japan
- Sydney, Australia
- Toronto, Canada
- Singapore
- Dubai, United Arab Emirates
- Mumbai, India
- Amsterdam, Netherlands
- Global (No specific location)

**Auto-detect Flow:**
```typescript
useEffect(() => {
    const fetchLocation = async () => {
        // Only auto-detect if not manually overridden
        if (!location?.isOverridden) {
            const detected = await detectLocation();
            if (detected) {
                setLocation({
                    ...detected,
                    isOverridden: false
                });
            }
        }
    };
    fetchLocation();
}, []);
```

#### Researching (`src/components/Researching.tsx`)

Premium loading experience with visual effects:

- **Aurora gradient blobs:** Floating teal, purple, blue gradients with blur
- **Floating particles:** Rising particles animation (FloatingParticles component)
- **Neural network:** Pulsing nodes and connecting lines (NeuralNetwork component)
- **Glowing icon rings:** Animated rings around status icon
- **Progress bar:** Shine animation with glow effect
- **Step indicators:** Icons (Planning, Searching, Analyzing, Synthesizing) with animated connectors
- **Activity log:** Real-time agent updates with "LIVE" badge
- **Timer:** Elapsed time display

**Visual Components:**
```typescript
// FloatingParticles - 20 rising particles with random positions
const FloatingParticles = () => (
    {[...Array(20)].map((_, i) => (
        <div className={styles.particle} style={{...randomStyles}} />
    ))}
);

// NeuralNetwork - 8 pulsing nodes with connections
const NeuralNetwork = () => (
    {[...Array(8)].map((_, i) => (
        <div className={styles.neuralNode} style={{...positioning}} />
    ))}
);
```

#### Toast (`src/components/Toast.tsx`)

Context-based notification system:

```typescript
const { addToast } = useToast();
addToast('success', 'PDF downloaded successfully!');
addToast('error', 'Failed to generate PDF');
addToast('warning', 'Check your input');
addToast('info', 'Processing...');
```

Types: `success` (green), `error` (red), `warning` (amber), `info` (blue)

**Setup:** ToastProvider wraps the app in `layout.tsx`

#### ConfirmModal (`src/components/ConfirmModal.tsx`)

Accessible confirmation dialog with:
- Focus trapping
- Escape key to close
- Click outside to close
- Variant styles: `danger`, `warning`, `info`
- Used for session deletion confirmation

#### FormActive (`src/components/FormActive.tsx`)

Multi-step form with:
- Step-by-step navigation
- Conditional visibility (`showOnlyIf` logic)
- Field validation
- Progress indicator
- Pre-filled values from interview

#### ResearchResults (`src/components/ResearchResults.tsx`)

Results display with:
- Markdown rendering for findings
- Copy to clipboard functionality
- PDF export button
- Source links
- Pros/cons display
- Pricing table
- Competitor comparison

---

## Location System

**Files:**
- `src/lib/location.ts` - Core location detection utilities
- `src/components/LocationBanner.tsx` - UI component with dropdown

### Default Behavior: Auto-Detect

The location system automatically detects the user's location when the app loads:

1. On component mount, checks if `location.isOverridden` is false
2. If not overridden, calls `detectLocation()` from `src/lib/location.ts`
3. `detectLocation()` fetches from `https://ipapi.co/json/`
4. Response is parsed and stored in Zustand state + localStorage
5. LocationBanner displays: "[City], [Country]"

### Location Detection Flow

```
┌──────────────────┐
│  App Page Loads  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────┐
│ Check localStorage│────►│ Has stored data?│
└────────┬─────────┘     │ Return cached   │
         │ No            └─────────────────┘
         ▼
┌──────────────────┐
│ Check isOverridden│
│ (user manually   │
│  selected)       │
└────────┬─────────┘
         │ Not overridden
         ▼
┌──────────────────┐
│ Call ipapi.co    │
│ GET /json/       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Parse response:  │
│ - country_name   │
│ - city           │
│ - region         │
│ - timezone       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Store in         │
│ localStorage +   │
│ Zustand state    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Display in       │
│ LocationBanner   │
│ "📍 City, Country"│
└──────────────────┘
```

### LocationContext Interface

```typescript
interface LocationContext {
    country: string;     // "United States"
    city: string;        // "New York"
    region: string;      // "New York"
    timezone: string;    // "America/New_York"
    isOverridden: boolean; // true if user manually selected
}
```

### Override Behavior

When user selects a location from the dropdown:
1. `isOverridden` is set to `true`
2. Location is saved to localStorage
3. Auto-detect will NOT overwrite on future page loads
4. User can select "Auto-detect my location" to re-enable auto-detection (sets `isOverridden: false`)

---

## PDF Export

**Location:** `src/lib/pdf-export.ts`  
**Library:** jsPDF

### Dark Theme Colors

```typescript
const COLORS = {
    primary: [16, 185, 129],    // Emerald/Teal (#10B981)
    dark: [10, 10, 10],         // Background (#0A0A0A)
    text: [245, 245, 245],      // Primary text (#F5F5F5)
    muted: [160, 160, 160],     // Muted text (#A0A0A0)
    accent: [20, 184, 166],     // Accent teal (#14B8A6)
    success: [34, 197, 94],     // Green for pros (#22C55E)
    error: [239, 68, 68],       // Red for cons (#EF4444)
    cardBg: [25, 25, 25],       // Card background (#191919)
};
```

### PDF Structure

1. **Cover Page**
   - ResearchAI branding
   - Report title
   - Generation date

2. **Table of Contents**
   - Dynamic based on available sections

3. **Content Sections**
   - Executive Summary
   - Overview (if available)
   - Key Findings (numbered with badges)
   - Pros & Cons (two-column layout)
   - Pricing (tier cards)
   - Competitors (comparison list)
   - Recommendations (highlighted box)
   - Sources (clickable links)

4. **Footer**
   - "Generated by ResearchAI"
   - Page numbers

### New Page Handling

Dark background is applied to every new page:

```typescript
function checkNewPage(doc: jsPDF, y: number, needed: number = 40): number {
    if (y + needed > pageHeight - 20) {
        doc.addPage();
        // Apply dark background to new page
        doc.setFillColor(...COLORS.dark);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        return 30;
    }
    return y;
}
```

---

## UI/UX Features

### Scroll Controls

**Location:** `src/app/app/page.tsx`

During AI generation:
- **Auto-scroll:** Continuously scrolls to bottom every 100ms while streaming
- **Toggle button:** Pause/resume auto-scroll (shows pause/play icon)
- **Manual scroll detection:** If user scrolls up, auto-scroll pauses
- **Scroll-to-top/bottom buttons:** Quick navigation

```typescript
// Continuous scroll during streaming
useEffect(() => {
    if (!isLoading || !autoScroll || userScrolledRef.current) return;
    
    const scrollInterval = setInterval(() => {
        if (autoScroll && !userScrolledRef.current) {
            container.scrollTop = container.scrollHeight;
        }
    }, 100);

    return () => clearInterval(scrollInterval);
}, [isLoading, autoScroll]);
```

### Landing Page Animations

**Location:** `src/app/page.tsx` and `src/app/page.module.css`

Premium visual effects:
- Aurora gradient background with floating blobs
- Floating particles animation
- Intersection Observer for scroll-triggered animations
- Glassmorphism cards with hover effects
- Step-by-step workflow visualization with icons

### Toast Notifications

All user feedback uses toast notifications instead of browser alerts:
- Copy to clipboard success
- PDF download success/failure
- Session deletion confirmation
- Error messages

---

## Error Handling

### Agent Errors

- **Timeout protection:** 120s for research, 60s for chat
- **Graceful fallback messages:** Sent to client via stream
- **Error states:** Logged with stack traces

```typescript
// Research API timeout
const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Agent stream timeout')), 120000);
});

result = await Promise.race([
    researcher.stream(userPrompt, { maxSteps: 10 }),
    timeoutPromise
]);
```

### Tool Errors

- Each tool has try/catch with console logging
- Fallback values returned (e.g., "Unknown" for location)
- Errors don't crash the agent loop

```typescript
// Location tool fallback
catch (error) {
    console.error('Location lookup error:', error);
    return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC'
    };
}
```

### Stream Errors

- Client receives `[System Error: ...]` messages
- Connection is closed cleanly on errors
- UI shows error state with recovery options

### Transition Errors

- State machine validates all transitions
- Invalid transitions are logged with warning
- UI prevents invalid state navigation

```typescript
transition: (to: AppState, trigger: string = 'user_action'): boolean => {
    const validTransitions = VALID_TRANSITIONS[currentState];
    if (!validTransitions.includes(to)) {
        console.warn(`Invalid transition: ${currentState} → ${to}`);
        return false;
    }
    // ... proceed with valid transition
    return true;
}
```

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Chat API (Form Builder interview)
│   │   └── research/
│   │       └── route.ts          # Research API (Mastra agent)
│   ├── app/
│   │   ├── app.module.css        # App page styles
│   │   └── page.tsx              # Main app page
│   ├── globals.css               # Global styles & CSS variables
│   ├── layout.tsx                # Root layout with ToastProvider
│   ├── page.module.css           # Landing page styles
│   └── page.tsx                  # Landing page
├── components/
│   ├── ChatInput.tsx             # Chat input component
│   ├── ChatInput.module.css
│   ├── ChatMessage.tsx           # Message display
│   ├── ChatMessage.module.css
│   ├── ChatMessage.global.css
│   ├── ConfirmModal.tsx          # Confirmation dialog
│   ├── FormActive.tsx            # Form filling UI
│   ├── FormActive.module.css
│   ├── FormPreview.tsx           # Form preview UI
│   ├── FormPreview.module.css
│   ├── LocationBanner.tsx        # Location dropdown (auto-detect default)
│   ├── LocationBanner.module.css
│   ├── Researching.tsx           # Research progress UI with animations
│   ├── Researching.module.css
│   ├── ResearchResults.tsx       # Results display with PDF export
│   ├── ResearchResults.module.css
│   ├── Sidebar.tsx               # Session sidebar
│   └── Toast.tsx                 # Toast notifications
├── lib/
│   ├── form-schema.ts            # Form schema types & validation
│   ├── index.ts                  # Library exports
│   ├── location.ts               # Location utilities (detectLocation, cache)
│   ├── pdf-export.ts             # PDF generation (dark theme)
│   └── state-machine.ts          # Zustand state management
└── mastra/
    ├── agents/
    │   ├── form-builder-agent.ts # Form Builder Agent (GPT-4o)
    │   └── research-agent.ts     # Research Agent (GPT-4o)
    ├── tools/
    │   ├── data-synthesis.ts     # Data synthesis tool (GPT-4o)
    │   ├── form-generator.ts     # Form generator tool
    │   ├── index.ts              # Tool exports
    │   ├── location-context.ts   # Location tool (ipapi.co)
    │   └── web-search.ts         # Web search tool (Tavily)
    ├── workflows/
    │   └── research-workflow.ts  # Research workflow (4 steps)
    └── index.ts                  # Mastra configuration
```

---

## Development

### Running the Application

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...        # OpenAI API key
TAVILY_API_KEY=tvly-...      # Tavily API key

# Optional (for location fallback)
# The app uses ipapi.co which doesn't require an API key for basic usage
```

---

*Last Updated: January 2025*
