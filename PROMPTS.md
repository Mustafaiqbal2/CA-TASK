# Prompt Documentation

## Form Builder Agent

**Role:** Expert Research Assistant  
**Model:** Gemini 2.5 Flash  
**Output:** JSON Schema for Form Generator Tool

### System Prompt Design
The System Prompt is designed to strictly separate "Criteria/Requirements Gathering" from "Data Collection". 

**Key Principles:**
1.  **Constraint Filtering:** The agent is instructed to ask questions that *filter* the search space (e.g., "Budget", "Platform"), not questions that require data entry (e.g., "Tool Name").
2.  **Context Injection (Implicit):** The prompt logic implicitly handles context by asking for "User Persona" and "Constraints" which are then passed to the form generation tool.
3.  **Strict "No Data" Policy:** A specific section "CORRECT vs INCORRECT" provides few-shot examples of what constitutes a valid question vs a hallucinated data entry field.

**Edge Case Handling:**
-   **User already provided topic:** If the user says "Research Linear", the agent is instructed via the "Subject Isolation" rule to NOT ask "What tool?" but instead ask "What specifically about Linear?".
-   **Vague Requests:** Phase 1 of the interview process forces clarification of "Broad Topic" and "Goal" before proceeding.

### Tools
-   `formGenerator`: Receives the gathered context and generates the final schema. It is typed to enforce a separation between `researchTopic` (the "what") and `formFields` (the "criteria").

---

## Research Agent (Planned)

**Role:** Deep Research Specialist  
**Model:** Gemini 2.5 Flash / Pro (Planned)

*Note: The Research Agent implementation is part of Phase 2 (post-form submission).*

**Planned Loop Structure:**
1.  **Input:** Receives `formData` + `userContext` + `location`.
2.  **Planning:** Deconstructs the form fields into a search strategy.
3.  **Execution:** loops through search tools (web search, scraper).
4.  **Synthesis:** Compiles findings against the user's constraints.

---

## Dynamic Context Injection

**Location Awareness:**
-   **Mechanism:** IP Geolocation (via Next.js headers or client-side detection).
-   **Injection Point:** Passed as `userContext` to the Agent's system prompt or tool context.
-   **Usage:** The prompt instructs the agent to "Be aware of the user's location context... it affects research relevance".
-   **Overrides:** The user defaults to the detected location but can manually specify a different region in the chat, which the agent picks up as part of the "Context Gathering" phase.
