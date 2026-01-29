import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FormSchema, FormField, FormData } from './form-schema';

// Re-export form types for convenience
export type { FormSchema, FormField, FormData } from './form-schema';

// ============================================
// State Types
// ============================================

/**
 * Application states for the form builder flow
 */
export type AppState =
    | 'INTERVIEWING'    // AI is interviewing user about research needs
    | 'FORM_PREVIEW'    // User is previewing/editing the generated form
    | 'FORM_ACTIVE'     // User is filling out the form
    | 'RESEARCHING'     // AI is conducting research
    | 'PRESENTING';     // Displaying research results

/**
 * Error state for handling failures
 */
export interface ErrorState {
    code: string;
    message: string;
    timestamp: Date;
    recoverable: boolean;
}

/**
 * Transition log entry for debugging and history
 */
export interface TransitionLog {
    from: AppState;
    to: AppState;
    timestamp: Date;
    trigger: string;
}

/**
 * Chat message structure for the interview phase
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

/**
 * Research result structure
 */
export interface ResearchResult {
    id: string;
    title: string;
    summary: string;
    keyFindings: string[];
    sources: Array<{
        title: string;
        url: string;
        snippet: string;
    }>;
    timestamp: Date;
}

/**
 * Location context for research personalization
 */
export interface LocationContext {
    country: string;
    city: string;
    region: string;
    timezone: string;
    isOverridden: boolean;
}

// ============================================
// Valid Transitions Map
// ============================================

const VALID_TRANSITIONS: Record<AppState, AppState[]> = {
    INTERVIEWING: ['FORM_PREVIEW'],
    FORM_PREVIEW: ['INTERVIEWING', 'FORM_ACTIVE'],
    FORM_ACTIVE: ['RESEARCHING', 'FORM_PREVIEW'],
    RESEARCHING: ['PRESENTING', 'FORM_ACTIVE'], // Can go back if research fails
    PRESENTING: ['INTERVIEWING'],
};

// ============================================
// Store State Interface
// ============================================

export interface AppStoreState {
    // Current state
    currentState: AppState;
    previousState: AppState | null;

    // State history for navigation
    stateHistory: AppState[];
    transitionLogs: TransitionLog[];

    // Error handling
    error: ErrorState | null;

    // Interview data
    chatMessages: ChatMessage[];

    // Form data
    formSchema: FormSchema | null;
    formData: FormData;

    // Research data
    researchResults: ResearchResult | null;
    researchProgress: number; // 0-100
    researchStatus: string;

    // Location context
    location: LocationContext | null;

    // Actions
    transition: (to: AppState, trigger?: string) => boolean;
    goBack: () => boolean;
    reset: () => void;

    // State setters
    setFormSchema: (schema: FormSchema) => void;
    setFormData: (data: FormData) => void;
    addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    clearChatMessages: () => void;
    setResearchResults: (results: ResearchResult) => void;
    setResearchProgress: (progress: number | ((prev: number) => number), status?: string) => void;
    setLocation: (location: LocationContext) => void;
    setError: (error: ErrorState | null) => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
    currentState: 'INTERVIEWING' as AppState,
    previousState: null as AppState | null,
    stateHistory: ['INTERVIEWING'] as AppState[],
    transitionLogs: [] as TransitionLog[],
    error: null as ErrorState | null,
    chatMessages: [] as ChatMessage[],
    formSchema: null as FormSchema | null,
    formData: {} as FormData,
    researchResults: null as ResearchResult | null,
    researchProgress: 0,
    researchStatus: '',
    location: null as LocationContext | null,
};

// ============================================
// Zustand Store
// ============================================

export const useAppStore = create<AppStoreState>()(
    persist(
        (set, get) => ({
            ...initialState,

            /**
             * Transition to a new state with validation
             * @param to - Target state
             * @param trigger - What triggered the transition (for logging)
             * @returns true if transition was successful
             */
            transition: (to: AppState, trigger: string = 'user_action'): boolean => {
                const { currentState, stateHistory, transitionLogs } = get();

                // Check if transition is valid
                const validTransitions = VALID_TRANSITIONS[currentState];
                if (!validTransitions.includes(to)) {
                    console.warn(
                        `[StateMachine] Invalid transition: ${currentState} → ${to}. ` +
                        `Valid transitions: ${validTransitions.join(', ')}`
                    );
                    return false;
                }

                // Create transition log
                const log: TransitionLog = {
                    from: currentState,
                    to,
                    timestamp: new Date(),
                    trigger,
                };

                // Log to console for debugging
                console.log(
                    `[StateMachine] ${log.timestamp.toISOString()} | ` +
                    `${currentState} → ${to} | Trigger: ${trigger}`
                );

                // Update state
                set({
                    currentState: to,
                    previousState: currentState,
                    stateHistory: [...stateHistory, to],
                    transitionLogs: [...transitionLogs, log],
                    error: null, // Clear any previous errors
                });

                return true;
            },

            /**
             * Go back to the previous state
             * @returns true if navigation was successful
             */
            goBack: (): boolean => {
                const { stateHistory, currentState } = get();

                if (stateHistory.length <= 1) {
                    console.warn('[StateMachine] Cannot go back: no history');
                    return false;
                }

                // Get the previous state
                const previousState = stateHistory[stateHistory.length - 2];

                // Check if this backward transition is valid
                const validTransitions = VALID_TRANSITIONS[currentState];
                if (!validTransitions.includes(previousState)) {
                    console.warn(
                        `[StateMachine] Cannot go back: ${currentState} → ${previousState} is not valid`
                    );
                    return false;
                }

                // Update state
                const newHistory = stateHistory.slice(0, -1);

                const log: TransitionLog = {
                    from: currentState,
                    to: previousState,
                    timestamp: new Date(),
                    trigger: 'go_back',
                };

                console.log(
                    `[StateMachine] ${log.timestamp.toISOString()} | ` +
                    `${currentState} → ${previousState} | Trigger: go_back`
                );

                set({
                    currentState: previousState,
                    previousState: currentState,
                    stateHistory: newHistory,
                    transitionLogs: [...get().transitionLogs, log],
                });

                return true;
            },

            /**
             * Reset the entire state machine to initial state
             */
            reset: (): void => {
                console.log('[StateMachine] Resetting to initial state');
                set({
                    ...initialState,
                    transitionLogs: [
                        ...get().transitionLogs,
                        {
                            from: get().currentState,
                            to: 'INTERVIEWING',
                            timestamp: new Date(),
                            trigger: 'reset',
                        },
                    ],
                });
            },

            /**
             * Set the form schema (generated by Form Builder Agent)
             */
            setFormSchema: (schema: FormSchema): void => {
                set({ formSchema: schema });
            },

            /**
             * Update form data as user fills out the form
             */
            setFormData: (data: FormData): void => {
                set({ formData: data });
            },

            /**
             * Add a chat message to the conversation
             */
            addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>): void => {
                const newMessage: ChatMessage = {
                    ...message,
                    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    timestamp: new Date(),
                };
                set({ chatMessages: [...get().chatMessages, newMessage] });
            },

            /**
             * Clear all chat messages (for reset)
             */
            clearChatMessages: (): void => {
                set({ chatMessages: [] });
            },

            /**
             * Set research results when complete
             */
            setResearchResults: (results: ResearchResult): void => {
                set({ researchResults: results });
            },

            /**
             * Update research progress
             */
            setResearchProgress: (progress: number | ((prev: number) => number), status?: string): void => {
                set((state) => {
                    const newProgress = typeof progress === 'function'
                        ? (progress as (prev: number) => number)(state.researchProgress)
                        : progress;

                    return {
                        researchProgress: Math.min(100, Math.max(0, newProgress)),
                        ...(status && { researchStatus: status }),
                    };
                });
            },

            /**
             * Set location context
             */
            setLocation: (location: LocationContext): void => {
                set({ location });
            },

            /**
             * Set or clear error state
             */
            setError: (error: ErrorState | null): void => {
                set({ error });
                if (error) {
                    console.error('[StateMachine] Error:', error.code, error.message);
                }
            },
        }),
        {
            name: 'research-ai-state',
            // Only persist certain fields
            partialize: (state) => ({
                currentState: state.currentState,
                chatMessages: state.chatMessages,
                formSchema: state.formSchema,
                formData: state.formData,
                location: state.location,
            }),
        }
    )
);

// ============================================
// Selector Hooks for Common Operations
// ============================================

/**
 * Hook to get current state
 */
export const useCurrentState = () => useAppStore((state) => state.currentState);

/**
 * Hook to check if a transition is valid
 */
export const useCanTransition = (to: AppState): boolean => {
    const currentState = useCurrentState();
    return VALID_TRANSITIONS[currentState].includes(to);
};

/**
 * Hook to get state history
 */
export const useStateHistory = () => useAppStore((state) => state.stateHistory);

/**
 * Hook to get chat messages
 */
export const useChatMessages = () => useAppStore((state) => state.chatMessages);

/**
 * Hook to get form schema and data
 */
export const useFormState = () => useAppStore((state) => ({
    schema: state.formSchema,
    data: state.formData,
}));

/**
 * Hook to get research state
 */
export const useResearchState = () => useAppStore((state) => ({
    results: state.researchResults,
    progress: state.researchProgress,
    status: state.researchStatus,
}));

/**
 * Hook to get location context
 */
export const useLocation = () => useAppStore((state) => state.location);

/**
 * Hook to get error state
 */
export const useError = () => useAppStore((state) => state.error);

// ============================================
// Transition Guard Functions
// ============================================

/**
 * Check if the form schema is valid before transitioning to FORM_PREVIEW
 */
export const canTransitionToFormPreview = (schema: FormSchema | null): boolean => {
    return schema !== null && schema.fields.length > 0;
};

/**
 * Check if form data is complete before transitioning to RESEARCHING
 */
export const canTransitionToResearching = (
    schema: FormSchema | null,
    data: FormData
): boolean => {
    if (!schema) return false;

    // Check required fields are filled
    const requiredFields = schema.fields.filter((f) => f.required);
    return requiredFields.every((field) => {
        const value = data[field.id];
        return value !== undefined && value !== '' && value !== null;
    });
};
