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
 * Chat session for history
 */
export interface ChatSession {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    state: AppState;
    messages: ChatMessage[];
    formSchema: FormSchema | null;
    formData: FormData;
    researchResults: ResearchResult | null;
}

/**
 * Research result structure
 */
export interface ResearchResult {
    id: string;
    title: string;
    summary: string;
    overview?: string;
    keyFindings: string[];
    prosAndCons?: {
        pros: string[];
        cons: string[];
    };
    pricing?: {
        overview: string;
        tiers: Array<{
            name: string;
            price: string;
            features: string;
        }>;
        notes?: string;
    } | null;
    competitors?: Array<{
        name: string;
        comparison: string;
    }>;
    recommendations?: string;
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

    // Session management
    sessions: ChatSession[];
    currentSessionId: string | null;

    // Interview data (current session)
    chatMessages: ChatMessage[];

    // Form data (current session)
    formSchema: FormSchema | null;
    formData: FormData;

    // Research data (current session)
    researchResults: ResearchResult | null;
    researchProgress: number; // 0-100
    researchStatus: string;

    // Location context
    location: LocationContext | null;

    // Sidebar state
    isSidebarOpen: boolean;

    // Actions
    transition: (to: AppState, trigger?: string) => boolean;
    goBack: () => boolean;
    reset: () => void;

    // Session actions
    createNewSession: () => string;
    switchSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    updateSessionTitle: (sessionId: string, title: string) => void;
    saveCurrentSession: () => void;
    toggleSidebar: () => void;

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

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createEmptySession = (): ChatSession => ({
    id: generateSessionId(),
    title: 'New Research',
    createdAt: new Date(),
    updatedAt: new Date(),
    state: 'INTERVIEWING',
    messages: [],
    formSchema: null,
    formData: {},
    researchResults: null,
});

const initialState = {
    currentState: 'INTERVIEWING' as AppState,
    previousState: null as AppState | null,
    stateHistory: ['INTERVIEWING'] as AppState[],
    transitionLogs: [] as TransitionLog[],
    error: null as ErrorState | null,
    sessions: [] as ChatSession[],
    currentSessionId: null as string | null,
    chatMessages: [] as ChatMessage[],
    formSchema: null as FormSchema | null,
    formData: {} as FormData,
    researchResults: null as ResearchResult | null,
    researchProgress: 0,
    researchStatus: '',
    location: null as LocationContext | null,
    isSidebarOpen: true, // Open by default
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
             * Reset the state machine and start a new session
             * Preserves all existing sessions in history
             */
            reset: (): void => {
                console.log('[StateMachine] Starting new research session');
                const state = get();
                
                // Check if current session is already empty (no messages, no research results)
                // If so, just reset to INTERVIEWING state without creating a new session
                const isCurrentSessionEmpty = state.chatMessages.length === 0 && 
                                              !state.researchResults && 
                                              !state.formSchema;
                
                if (isCurrentSessionEmpty && state.currentSessionId) {
                    // Just reset state without creating duplicate empty session
                    set({
                        currentState: 'INTERVIEWING',
                        previousState: null,
                        stateHistory: ['INTERVIEWING'],
                        error: null,
                    });
                    return;
                }
                
                // Save current session first if it has content
                if (state.currentSessionId && (state.chatMessages.length > 0 || state.researchResults)) {
                    get().saveCurrentSession();
                }
                
                // Check if there's already an empty session we can switch to
                const existingEmptySession = state.sessions.find(s => 
                    s.id !== state.currentSessionId && 
                    s.messages.length === 0 && 
                    !s.researchResults && 
                    !s.formSchema &&
                    s.state === 'INTERVIEWING'
                );
                
                if (existingEmptySession) {
                    // Switch to existing empty session instead of creating a new one
                    get().switchSession(existingEmptySession.id);
                } else {
                    // Create a new session (this preserves existing sessions)
                    get().createNewSession();
                }
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

            /**
             * Toggle sidebar visibility
             */
            toggleSidebar: (): void => {
                set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
            },

            /**
             * Save current session data to sessions array
             */
            saveCurrentSession: (): void => {
                const state = get();
                if (!state.currentSessionId) return;

                // Generate title from first user message or research topic
                let title = 'New Research';
                if (state.chatMessages.length > 0) {
                    const firstUserMsg = state.chatMessages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        title = firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
                    }
                }
                if (state.formSchema?.researchTopic) {
                    title = state.formSchema.researchTopic.substring(0, 50);
                }

                const updatedSession: ChatSession = {
                    id: state.currentSessionId,
                    title,
                    createdAt: state.sessions.find(s => s.id === state.currentSessionId)?.createdAt || new Date(),
                    updatedAt: new Date(),
                    state: state.currentState,
                    messages: state.chatMessages,
                    formSchema: state.formSchema,
                    formData: state.formData,
                    researchResults: state.researchResults,
                };

                const existingIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
                if (existingIndex >= 0) {
                    const newSessions = [...state.sessions];
                    newSessions[existingIndex] = updatedSession;
                    set({ sessions: newSessions });
                } else {
                    set({ sessions: [updatedSession, ...state.sessions] });
                }
            },

            /**
             * Create a new chat session
             * Will reuse existing empty session if current one is already empty
             */
            createNewSession: (): string => {
                const state = get();
                
                // If current session is already empty, just return its ID
                const isCurrentEmpty = state.chatMessages.length === 0 && 
                                       !state.researchResults && 
                                       !state.formSchema &&
                                       state.currentState === 'INTERVIEWING';
                
                if (isCurrentEmpty && state.currentSessionId) {
                    return state.currentSessionId;
                }
                
                // Save current session first if it has content
                if (state.currentSessionId && state.chatMessages.length > 0) {
                    get().saveCurrentSession();
                }
                
                // Check if there's an existing empty session we can reuse
                const existingEmptySession = state.sessions.find(s => 
                    s.messages.length === 0 && 
                    !s.researchResults && 
                    !s.formSchema &&
                    s.state === 'INTERVIEWING'
                );
                
                if (existingEmptySession) {
                    // Reuse existing empty session
                    set({
                        currentSessionId: existingEmptySession.id,
                        currentState: 'INTERVIEWING',
                        previousState: null,
                        stateHistory: ['INTERVIEWING'],
                        chatMessages: [],
                        formSchema: null,
                        formData: {},
                        researchResults: null,
                        researchProgress: 0,
                        researchStatus: '',
                        error: null,
                    });
                    return existingEmptySession.id;
                }

                const newSession = createEmptySession();
                
                set({
                    currentSessionId: newSession.id,
                    currentState: 'INTERVIEWING',
                    previousState: null,
                    stateHistory: ['INTERVIEWING'],
                    chatMessages: [],
                    formSchema: null,
                    formData: {},
                    researchResults: null,
                    researchProgress: 0,
                    researchStatus: '',
                    error: null,
                    sessions: [newSession, ...state.sessions],
                });

                return newSession.id;
            },

            /**
             * Switch to a different session
             */
            switchSession: (sessionId: string): void => {
                const state = get();
                
                // Save current session first
                if (state.currentSessionId && state.chatMessages.length > 0) {
                    get().saveCurrentSession();
                }

                const session = state.sessions.find(s => s.id === sessionId);
                if (!session) {
                    console.warn('[StateMachine] Session not found:', sessionId);
                    return;
                }

                set({
                    currentSessionId: session.id,
                    currentState: session.state,
                    previousState: null,
                    stateHistory: [session.state],
                    chatMessages: session.messages,
                    formSchema: session.formSchema,
                    formData: session.formData,
                    researchResults: session.researchResults,
                    researchProgress: session.researchResults ? 100 : 0,
                    researchStatus: session.researchResults ? 'Complete' : '',
                    error: null,
                });
            },

            /**
             * Delete a session
             */
            deleteSession: (sessionId: string): void => {
                const state = get();
                const newSessions = state.sessions.filter(s => s.id !== sessionId);
                
                // If deleting current session, switch to another or create new
                if (state.currentSessionId === sessionId) {
                    if (newSessions.length > 0) {
                        get().switchSession(newSessions[0].id);
                    } else {
                        get().createNewSession();
                    }
                }
                
                set({ sessions: newSessions });
            },

            /**
             * Update session title
             */
            updateSessionTitle: (sessionId: string, title: string): void => {
                const state = get();
                const newSessions = state.sessions.map(s => 
                    s.id === sessionId ? { ...s, title, updatedAt: new Date() } : s
                );
                set({ sessions: newSessions });
            },
        }),
        {
            name: 'research-ai-state',
            // Only persist certain fields
            partialize: (state) => ({
                currentState: state.currentState,
                currentSessionId: state.currentSessionId,
                sessions: state.sessions,
                chatMessages: state.chatMessages,
                formSchema: state.formSchema,
                formData: state.formData,
                researchResults: state.researchResults,
                location: state.location,
                isSidebarOpen: state.isSidebarOpen,
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

/**
 * Hook to get sessions
 */
export const useSessions = () => useAppStore((state) => state.sessions);

/**
 * Hook to get current session ID
 */
export const useCurrentSessionId = () => useAppStore((state) => state.currentSessionId);

/**
 * Hook to get sidebar state
 */
export const useSidebarState = () => useAppStore((state) => state.isSidebarOpen);

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
