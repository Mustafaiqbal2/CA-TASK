/**
 * Library exports
 * 
 * Central export point for all library functions
 */

// State Machine
export {
    useAppStore,
    useCurrentState,
    useCanTransition,
    useStateHistory,
    useChatMessages,
    useFormState,
    useResearchState,
    useLocation,
    useError,
    canTransitionToFormPreview,
    canTransitionToResearching,
} from './state-machine';

export type {
    AppState,
    AppStoreState,
    ErrorState,
    TransitionLog,
    ChatMessage,
    ResearchResult,
    LocationContext,
} from './state-machine';

// Form Schema
export {
    evaluateCondition,
    evaluateConditionGroup,
    isFieldVisible,
    getVisibleFields,
    validateField,
    validateForm,
    buildDependencyGraph,
    createEmptyFormSchema,
    addFieldToSchema,
} from './form-schema';

export type {
    FieldType,
    ConditionOperator,
    LogicalOperator,
    FieldCondition,
    ConditionGroup,
    ValidationRule,
    FieldOption,
    FormField,
    FormGroup,
    FormSchema,
    FormData,
} from './form-schema';
