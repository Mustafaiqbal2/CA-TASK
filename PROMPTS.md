# Prompt Documentation

This document details all prompts used in the Research AI application, including design rationale, edge case handling, and implementation details.

---

## Table of Contents
1. [Form Builder Agent](#form-builder-agent)
2. [Research Agent](#research-agent)
3. [Mastra Workflow](#mastra-workflow)
4. [Dynamic Context Injection](#dynamic-context-injection)
5. [Tool Descriptions](#tool-descriptions)

---

## Form Builder Agent

**Location:** `src/mastra/agents/form-builder-agent.ts`  
**Model:** OpenAI GPT-4o-mini  
**Purpose:** Interview users about their research needs and generate a customized criteria-gathering form.

### System Prompt Design Philosophy

The Form Builder Agent's prompt is designed around one critical distinction: **Criteria vs. Data**.

```
CRITERIA (What we ASK the user):     DATA (What we FIND for the user):
- "What's your budget?"              - "The pricing is $49/month"
- "Is Slack integration required?"   - "Yes, it has Slack integration"
- "What's your team size?"           - "It supports 1-100 users"
```

The agent must ONLY generate forms that ask for criteria/constraints, never asking the user to provide the research data itself.

### Key Prompt Sections

#### 1. CORRECT vs INCORRECT Examples
```
INCORRECT: "Tool Name", "Pricing Model" (user shouldn't provide this)
CORRECT: "Maximum budget?", "Required integrations?" (user preferences)
```
This few-shot example prevents the common failure mode of asking users for factual data.

#### 2. Subject Isolation Rule
```
If user says "Research Linear", ask:
  ✓ "What aspects of Linear? (API, Pricing, Features)"
  ✗ "What is Linear?" (The agent should know this)
```

#### 3. Interview Context Tracking
The prompt explicitly instructs the agent to:
- Track all factual information shared during Interview
- Include gathered context in `interviewContext` field
- Never re-ask for information already provided
- Use `prefilledFromInterview` to mark fields with known values

### Edge Case Handling

| Edge Case | Handling Strategy |
|-----------|------------------|
| Vague request ("I need help") | Phase 1 forces clarification of Topic + Goal |
| User already stated topic | Subject Isolation rule prevents redundant questions |
| User provides partial info | Interview Context Tracking captures it |
| Complex conditional logic | Agent can add `showOnlyIf` conditions |

### Tool Integration

The agent uses the `formGenerator` tool with:
- `researchTopic`: The main subject of research
- `researchGoals`: What the user wants to learn/decide
- `userContext`: Location, industry, timeline, etc.
- `formFields`: Array of field definitions with types and options

---

## Research Agent

**Location:** `src/mastra/agents/research-agent.ts`  
**Model:** OpenAI GPT-4o-mini  
**Purpose:** Conduct comprehensive research using an agentic loop.

### Agentic Loop Structure

```
┌─────────────┐
│  PLANNING   │ ← Analyze form data, identify 3-5 key areas
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  CONTEXT    │ ← Check location, set regional context
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│              EXECUTION LOOP                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Search  │ →  │ Search  │ →  │Synthesize│  │
│  │ (broad) │    │(specific)│   │ findings │  │
│  └─────────┘    └─────────┘    └─────────┘  │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
               ┌─────────────┐
               │ REFLECTION  │ ← Evaluate completeness
               └──────┬──────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    Gaps exist?              Complete?
    Loop back ↺              Output JSON
```

### Termination Conditions

The agent stops researching when:
1. All key areas identified in planning are covered
2. At least 5 quality sources have been gathered
3. Main user questions can be confidently answered
4. Hard limit: 8+ tool calls (prevents infinite loops)

### Output Format

```json
{
  "title": "Research Report: [Topic]",
  "summary": "2-3 paragraph executive summary...",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "sources": [
    { "title": "...", "url": "https://...", "snippet": "..." }
  ]
}
```

### Regional Context Usage

The prompt specifically instructs:
- **Germany**: EU regulations, GDPR, SEPA, local providers
- **US**: State-specific laws, USD pricing, domestic alternatives
- **Other**: Local market conditions, currency, availability

---

## Mastra Workflow

**Location:** `src/mastra/workflows/research-workflow.ts`  
**Type:** Graph-based workflow using `createWorkflow` and `createStep`  
**Purpose:** Orchestrate the multi-step research process with explicit step transitions.

### Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RESEARCH WORKFLOW                         │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   validate   │ -> │    plan      │ -> │   execute    │   │
│  │    Input     │    │   Research   │    │   Research   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                  │           │
│                      ┌──────────────┐            │           │
│                      │  synthesize  │ <──────────┘           │
│                      │   Results    │                        │
│                      └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Step Definitions

#### Step 1: `validate-input`
- **Input:** Form data + location context
- **Output:** Validated topic, location string, criteria object
- **Purpose:** Ensures all required data is present, extracts research parameters

#### Step 2: `plan-research`
- **Input:** Validated parameters
- **Output:** Array of search queries, key areas to investigate
- **Purpose:** Creates research strategy based on topic and location

#### Step 3: `execute-research`
- **Input:** Search queries and key areas
- **Output:** Raw search results from web
- **Purpose:** Coordinates with research agent for actual web searches

#### Step 4: `synthesize-results`
- **Input:** Raw search results
- **Output:** Final report with title, summary, findings, sources
- **Purpose:** Compiles and formats research into deliverable report

### Workflow Registration

```typescript
import { Mastra } from "@mastra/core";
import { researchWorkflow } from "./workflows/research-workflow";

export const mastra = new Mastra({
    agents: { ... },
    workflows: {
        research: researchWorkflow,
    },
});
```

### Workflow Execution

```typescript
const workflow = mastra.getWorkflow('research');
const result = await workflow.execute({
    formId: 'form_123',
    formData: { ... },
    location: { country: 'Germany', city: 'Berlin', ... }
});
```

---

## Dynamic Context Injection

### Location Detection Flow

```
┌──────────────────┐
│ App Page Loads   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────┐
│ Check Local Cache│────►│ Cache Valid?    │
└────────┬─────────┘     │ Return cached   │
         │ No            └─────────────────┘
         ▼
┌──────────────────┐
│ Call ipapi.co    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Store in Zustand │
│ + Local Storage  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Display in       │
│ LocationBanner   │
└──────────────────┘
```

### Location Override Mechanism

**UI Component:** `src/components/LocationBanner.tsx`

Users can override their detected location by:
1. Clicking the edit icon next to the displayed location
2. Entering a new location in format "City, Country"
3. Pressing Enter to save or Escape to cancel

When overridden:
- `location.isOverridden` is set to `true`
- A checkmark badge appears to indicate manual override
- A "re-detect" button appears to restore automatic detection

### Injection Points

1. **Research API Route** (`/api/research`):
   ```typescript
   const userPrompt = `
     Session Location Context: ${JSON.stringify(location)}
     Form Data: ${JSON.stringify(formData)}
   `;
   ```

2. **Web Search Tool**:
   - Appends region to search queries when provided
   - Example: `"best banks" + "related to Germany"`

---

## Tool Descriptions

### 1. Web Search Tool
**ID:** `web-search`  
**API:** Tavily Search API  

**Input Schema:**
```typescript
{
  query: string,      // The search query
  region?: string     // Optional region bias
}
```

**Output Schema:**
```typescript
{
  results: Array<{
    title: string,
    snippet: string,
    url: string
  }>
}
```

**Behavior:**
- Returns up to 5 results per query
- Appends region to query if provided
- Falls back gracefully on API errors

### 2. Data Synthesis Tool
**ID:** `data-synthesis`  
**Model:** OpenAI GPT-4o-mini with JSON mode  

**Input Schema:**
```typescript
{
  sources: Array<{ content: string, url: string }>,
  query: string
}
```

**Output Schema:**
```typescript
{
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
**ID:** `location-context`  
**API:** ipapi.co (free tier)  

**Input Schema:**
```typescript
{
  ip?: string  // Optional, auto-detects if not provided
}
```

**Output Schema:**
```typescript
{
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
**ID:** `form-generator`  

**Input Schema:**
```typescript
{
  researchTopic: string,
  researchGoals: string,
  userContext: string,
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

**Output:** Complete FormSchema object with:
- Unique form ID
- Title and description
- Fields with conditional visibility
- Research topic metadata

---

## State Machine

**Location:** `src/lib/state-machine.ts`

### States

| State | Description | Valid Transitions |
|-------|-------------|-------------------|
| `INTERVIEWING` | AI interviews user | → FORM_PREVIEW |
| `FORM_PREVIEW` | User reviews form | → INTERVIEWING, FORM_ACTIVE |
| `FORM_ACTIVE` | User fills form | → RESEARCHING, FORM_PREVIEW |
| `RESEARCHING` | AI researches | → PRESENTING, FORM_ACTIVE |
| `PRESENTING` | Display results | → INTERVIEWING |

### Transition Logging

Every state transition is logged with:
- `from`: Previous state
- `to`: New state
- `timestamp`: When transition occurred
- `trigger`: What caused the transition

```typescript
console.log(`[StateMachine] ${timestamp} | ${from} → ${to} | Trigger: ${trigger}`);
```

### Persistence

The state machine uses Zustand with `persist` middleware to save:
- Current state
- Chat messages
- Form schema
- Form data
- Location context

---

## Error Handling

### Agent Errors
- Timeout protection (120s for research, 60s for chat)
- Graceful fallback messages sent to client
- Error states logged with stack traces

### Tool Errors
- Each tool has try/catch with console logging
- Fallback values returned (e.g., "Unknown" for location)
- Errors don't crash the agent loop

### Stream Errors
- Client receives `[System Error: ...]` messages
- Connection is closed cleanly on errors
- UI shows error state with recovery options
