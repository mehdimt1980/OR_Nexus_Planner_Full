# Nexus OR Planner: Project Documentation

**Table of Contents**

1.  [Project Overview](#project-overview)
    *   [Purpose](#purpose)
    *   [Core Functionalities](#core-functionalities)
    *   [Target Users](#target-users)
2.  [Tech Stack](#tech-stack)
3.  [Project Structure](#project-structure)
4.  [Core Components and Logic](#core-components-and-logic)
    *   [Main Page and State Management](#main-page-and-state-management)
    *   [UI Components (`src/components/or-planner/`)](#ui-components-srccomponentsor-planner)
    *   [Data and Types (`src/lib/`)](#data-and-types-srclib)
5.  [AI Integration (Genkit)](#ai-integration-genkit)
    *   [Configuration (`src/ai/genkit.ts`)](#configuration-srcaigenkitts)
    *   [Flows (`src/ai/flows/`)](#flows-srcaiflows)
6.  [Styling](#styling)
7.  [Application Workflow](#application-workflow)
8.  [Deployment (Vercel)](#deployment-vercel)
9.  [Key Configuration Files](#key-configuration-files)

---

## 1. Project Overview

### Purpose
The Nexus OR Planner is an AI-powered Operating Room (OR) scheduling and staff assignment system designed for Klinikum Gütersloh. It aims to optimize OR utilization and staff allocation by leveraging AI suggestions, while allowing for human oversight and adjustments.

### Core Functionalities
*   Display of a comprehensive OR schedule across different rooms and shifts.
*   AI-driven suggestions for staff assignments based on operation complexity, staff availability, and skills.
*   A multi-step workflow involving AI suggestions, review by a head nurse (Julia), and final approval by an OR manager (Torsten).
*   Learning mechanism where the AI adapts based on manual overrides made by the head nurse.
*   Dashboard providing key statistics and insights into the planning process.

### Target Users
*   **Julia W.** (Head Nurse): Responsible for reviewing AI suggestions, making necessary modifications, and providing feedback to the AI.
*   **Torsten F.** (OR Manager): Responsible for the final approval of the OR plan.

---

## 2. Tech Stack
*   **Framework**: Next.js 15.x (App Router)
*   **Language**: TypeScript
*   **UI Library**: React 18.x (Functional Components, Hooks)
*   **Styling**:
    *   Tailwind CSS
    *   ShadCN UI (for pre-built, accessible UI components)
    *   CSS Custom Properties (HSL-based theming in `globals.css`)
*   **AI Integration**: Genkit
    *   Utilizes Google AI's Gemini models (e.g., `gemini-2.0-flash`) for generating suggestions and summaries.
*   **Icons**: Lucide React
*   **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) primarily within a custom hook (`useORData`).
*   **Deployment**: Vercel

---

## 3. Project Structure

├── .env # Local environment variables (e.g., API keys) - NOT COMMITTED
├── README.md # Project description and setup guide
├── apphosting.yaml # Firebase App Hosting configuration
├── components.json # ShadCN UI configuration
├── next.config.ts # Next.js configuration
├── package.json # Project dependencies and scripts
├── postcss.config.js # PostCSS configuration (for Tailwind)
├── tailwind.config.ts # Tailwind CSS configuration
├── tsconfig.json # TypeScript configuration
└── src
├── ai # Genkit AI integration
│ ├── dev.ts # Genkit development server setup
│ ├── genkit.ts # Genkit core initialization and model configuration
│ └── flows # AI flows (e.g., staffing suggestions, learning summary)
│ ├── suggest-staffing-plan.ts
│ └── summarize-gpt-learning.ts
├── app # Next.js App Router core files
│ ├── globals.css # Global styles and Tailwind/ShadCN theme variables
│ ├── layout.tsx # Root layout component
│ └── page.tsx # Main page component for the OR planner
├── components # Reusable React components
│ ├── or-planner # Components specific to the OR planner application
│ │ ├── AiAssistantPanel.tsx
│ │ ├── AssignmentCell.tsx
│ │ ├── AssignmentModal.tsx
│ │ ├── DashboardStats.tsx
│ │ ├── Header.tsx
│ │ ├── JuliaRecommendationsPanel.tsx
│ │ ├── OperatingRoomScheduleTable.tsx
│ │ └── WorkflowStatusIndicator.tsx
│ └── ui # ShadCN UI components (e.g., Button, Card, Dialog)
├── hooks # Custom React hooks
│ ├── use-mobile.tsx # Hook to detect mobile viewport
│ ├── use-toast.ts # Hook for managing toast notifications
│ └── useORData.ts # Central hook for OR planner logic and state
└── lib # Utility functions, data, types, and server actions
├── actions.ts # Next.js Server Actions for AI flow calls
├── or-planner-data.ts # Initial data, staff list, schedule template
├── or-planner-types.ts# TypeScript type definitions for the OR planner
└── utils.ts # General utility functions (e.g., cn for classnames)

## 4. Core Components and Logic

### Main Page and State Management
*   **`src/app/page.tsx`**:
    *   The primary UI entry point for the Nexus OR Planner.
    *   It orchestrates the layout and integrates various `or-planner` components like `Header`, `WorkflowStatusIndicator`, `DashboardStats`, `OperatingRoomScheduleTable`, `JuliaRecommendationsPanel`, and `AiAssistantPanel`.
    *   Leverages the `useORData` custom hook to manage application state and handle business logic.
*   **`src/hooks/useORData.ts`**:
    *   This is the heart of the client-side application logic.
    *   Manages state for:
        *   `schedule`: The current OR schedule (an `ORSchedule` object).
        *   `staff`: List of staff members.
        *   `currentWorkflowStepKey`: Tracks the current stage in the planning workflow.
        *   `aiRawLearningSummary`, `structuredLearningPoints`: AI-generated insights from Julia's modifications.
        *   `criticalSituationData`, `optimizationSuggestionsData`: Data for the recommendation panels.
        *   `isLoading`: Boolean for loading states during AI calls.
        *   `selectedOperation`: The operation currently being viewed or modified in the `AssignmentModal`.
        *   `juliaOverrides`: A list of manual changes Julia has made.
    *   Handles user interactions:
        *   `handleApprove`: Approves an AI-suggested assignment.
        *   `handleModify`: Modifies an assignment, logs the override, and triggers AI learning.
        *   `handleGptOptimize`: Action for AI-driven optimization (currently auto-approves pending suggestions).
        *   `handleFinalizePlan`: Moves the workflow to the "Plan Finalized" state.
        *   `handleExtendStaff`, `handleRescheduleStaff`: Placeholder actions for critical situation responses.
    *   Interacts with AI flows by calling Server Actions defined in `src/lib/actions.ts`.
    *   Initializes the schedule, loads AI suggestions automatically on plan creation, and updates the AI learning summary based on Julia's overrides.
    *   Calculates derived state like `juliaProgress`, `criticalAlertsCount`, `juliaModificationsCount`.

### UI Components (`src/components/or-planner/`)
*   **`Header.tsx`**: Displays the application title ("Nexus OR Planner"), subtitle ("Klinikum Gütersloh"), and the current time. Uses `Stethoscope` icon.
*   **`WorkflowStatusIndicator.tsx`**: Visualizes the steps of the OR planning workflow (`PLAN_CREATED`, `GPT_SUGGESTIONS_READY`, etc.) and highlights the active step.
*   **`DashboardStats.tsx`**: A set of cards displaying:
    *   Julia's review progress (e.g., "X/19 Genehmigungen abgeschlossen").
    *   Number of critical alerts.
    *   Number of AI learning interactions (Julia's modifications).
*   **`OperatingRoomScheduleTable.tsx`**: Renders the main grid view of the OR schedule.
    *   Uses `AssignmentCell.tsx` to display individual operation slots.
    *   Displays OR rooms as rows and shifts as columns.
    *   Handles clicks on cells to open the `AssignmentModal`.
*   **`AssignmentCell.tsx`**: Renders a single cell in the `OperatingRoomScheduleTable`.
    *   Displays operation details: procedure name, shift time, complexity (color-coded).
    *   Shows assigned staff and status (e.g., "KI Vorschlag," "Genehmigt," "Kritisch").
    *   Visually distinct based on `OperationAssignment['status']`.
*   **`AssignmentModal.tsx`**: A dialog that appears when an `AssignmentCell` is clicked.
    *   Shows detailed information about the selected operation.
    *   Displays AI's original suggestion and reasoning (if any).
    *   Allows Julia to:
        *   Approve the current assignment.
        *   Modify the assigned staff and provide a reason for the modification (which feeds into AI learning).
*   **`JuliaRecommendationsPanel.tsx`**:
    *   Displays a "Kritische Situation erkannt" card with details about a critical issue (e.g., staff sickness affecting complex OPs) and AI-suggested solutions.
    *   Displays an "Optimierungsvorschläge" card with general tips for improving the plan.
*   **`AiAssistantPanel.tsx`**:
    *   Displays "KI Lernfortschritt" (AI Learning Progress) showing structured learning points.
    *   Includes a scrollable area for the raw AI learning summary.
    *   Contains buttons for "KI Optimierung" (triggering `handleGptOptimize`) and "Plan Final Freigeben" (triggering `handleFinalizePlan`).

### Data and Types (`src/lib/`)
*   **`or-planner-data.ts`**:
    *   `STAFF_MEMBERS`: An array of `StaffMember` objects, including names, IDs, skills, and sickness status.
    *   `ACTIVE_OPERATIONS_TEMPLATE`: Defines the 19 active operations with their default procedure names and complexities.
    *   `INITIAL_SCHEDULE_TEMPLATE()`: A function that generates the initial `ORSchedule` object based on `OPERATING_ROOMS`, `SHIFTS`, and `ACTIVE_OPERATIONS_TEMPLATE`. Marks the critical DaVinci slot.
    *   `getStaffMemberById(id)`, `getStaffMemberByName(name)`: Utility functions to find staff members.
    *   `AVAILABLE_STAFF_FOR_AI`, `SICK_STAFF_FOR_AI`: Filtered lists of staff names for AI input.
*   **`or-planner-types.ts`**:
    *   Defines all core TypeScript types used in the application: `StaffMember`, `Shift`, `OperationComplexity`, `OperatingRoomName`, `AssignmentStatus`, `OperationAssignment`, `ORSchedule`, `WorkflowStepKey`, `WorkflowStep`, `JuliaOverride`.
    *   Exports constants like `SHIFTS`, `OPERATING_ROOMS`, `COMPLEXITY_LEVELS`, `ALL_WORKFLOW_STEPS`.
*   **`actions.ts`**:
    *   Contains Next.js Server Actions that are called from the client-side (`useORData`) to execute Genkit flows on the server.
    *   `fetchAiStaffingSuggestions(input: SuggestStaffingPlanInput)`: Calls the `suggestStaffingPlan` Genkit flow.
    *   `fetchAiLearningSummary(input: SummarizeGptLearningInput)`: Calls the `summarizeGptLearning` Genkit flow.
*   **`utils.ts`**:
    *   `cn`: A utility function (from ShadCN) for conditionally joining class names, merging Tailwind CSS classes without conflicts.

---

## 5. AI Integration (Genkit)

Genkit is used to orchestrate calls to Large Language Models (LLMs).

### Configuration (`src/ai/genkit.ts`)
*   Initializes a global `ai` object using `genkit({ plugins: [googleAI()] })`.
*   Configures the Google AI plugin, by default using the `googleai/gemini-2.0-flash` model for text generation.

### Flows (`src/ai/flows/`)
Genkit Flows are server-side functions that encapsulate AI logic. They are invoked via Server Actions.

*   **`suggest-staffing-plan.ts`**:
    *   Exports `suggestStaffingPlan` function (wrapper for the flow).
    *   Defines `SuggestStaffingPlanInputSchema` and `SuggestStaffingPlanOutputSchema` using Zod for input validation and typed outputs.
    *   `diagnosePlantPrompt = ai.definePrompt(...)`: Defines the prompt sent to the Gemini model.
        *   Takes operating room details, available staff, and sick staff as input.
        *   Instructs the AI to act as an OR manager and generate an optimal staffing plan, considering complexity and availability, and provide reasons.
        *   Specifies JSON output format based on `SuggestStaffingPlanOutputSchema`.
    *   `suggestStaffingPlanFlow = ai.defineFlow(...)`: The main flow logic.
        *   Takes `SuggestStaffingPlanInput`.
        *   Calls the `diagnosePlantPrompt` with the input.
        *   Returns the structured `SuggestStaffingPlanOutput`.
        *   Includes error handling for non-parsable AI output.
*   **`summarize-gpt-learning.ts`**:
    *   Exports `summarizeGptLearning` function.
    *   Defines `SummarizeGptLearningInputSchema` and `SummarizeGptLearningOutputSchema`.
    *   `summarizeGptLearningPrompt = ai.definePrompt(...)`:
        *   Takes Julia's overrides (descriptions of changes and reasons), total assignments, and number of overrides.
        *   Instructs the AI to summarize patterns and learnings from these overrides for the OR Manager.
    *   `summarizeGptLearningFlow = ai.defineFlow(...)`:
        *   Takes `SummarizeGptLearningInput`.
        *   Calls the `summarizeGptLearningPrompt`.
        *   Returns the `SummarizeGptLearningOutput` (a textual summary).

---

## 6. Styling
*   **`src/app/globals.css`**:
    *   Imports Tailwind's base, components, and utilities.
    *   Defines CSS custom properties (HSL values) for light and dark themes, covering background, foreground, primary, secondary, accent, destructive colors, borders, inputs, etc. These are used by ShadCN components.
    *   Includes custom keyframes for animations (e.g., `pulse-custom`).
    *   Custom scrollbar styling.
*   **`tailwind.config.ts`**:
    *   Configures Tailwind CSS, including dark mode (`class`), content paths.
    *   Extends the theme to map Tailwind color names (e.g., `primary`, `background`) to the CSS variables defined in `globals.css`.
    *   Sets up custom fonts (`font-body`, `font-headline`).
    *   Configures animations.
*   **ShadCN UI Components (`src/components/ui/`)**:
    *   These are pre-built components like `Button`, `Card`, `Dialog`, `Select`, etc.
    *   They are styled using Tailwind CSS and themed via the CSS variables in `globals.css`.
    *   They are imported and used throughout the `or-planner` components.

---

## 7. Application Workflow
1.  **Initial Load (`PLAN_CREATED`)**:
    *   The page loads, `useORData` initializes.
    *   The `INITIAL_SCHEDULE_TEMPLATE` is displayed.
    *   `loadGptSuggestions` is called automatically.
2.  **AI Generates Suggestions (`GPT_SUGGESTIONS_READY`)**:
    *   `loadGptSuggestions` (in `useORData`) calls `fetchAiStaffingSuggestions` (Server Action).
    *   This action invokes the `suggestStaffingPlanFlow`.
    *   The AI returns staffing assignments.
    *   The schedule UI updates to show these suggestions, typically with a "pending_gpt" status. Critical slots might retain "critical_pending".
3.  **Julia's Review (`JULIA_REVIEW`)**:
    *   Julia (the user) interacts with the `OperatingRoomScheduleTable`.
    *   Clicking an `AssignmentCell` opens the `AssignmentModal`.
    *   **Approval**: Julia can approve a suggestion. The status changes to `approved_julia`.
    *   **Modification**: Julia can change the assigned staff and provide a reason. The status changes to `modified_julia`.
        *   This override is logged in `juliaOverrides` state.
        *   `updateLearningSummary` is called, which invokes `fetchAiLearningSummary` (Server Action) and the `summarizeGptLearningFlow`.
        *   The `AiAssistantPanel` updates with the new learning summary.
    *   Julia can also use the "KI Optimierung" button in `AiAssistantPanel`, which triggers `handleGptOptimize` (currently, this auto-approves remaining GPT suggestions).
    *   Progress is tracked in `DashboardStats` (e.g., "X/19 reviewed").
4.  **Torsten's Final Approval (`TORSTEN_FINAL_APPROVAL`)**:
    *   This step becomes active once Julia has reviewed all 19 assignments.
    *   The "Plan Final Freigeben" button in `AiAssistantPanel` becomes enabled.
5.  **Plan Finalized (`PLAN_FINALIZED`)**:
    *   Torsten (the user) clicks "Plan Final Freigeben".
    *   `handleFinalizePlan` is called.
    *   All `approved_julia` or `modified_julia` assignments change status to `final_approved`.
    *   The workflow indicator shows the plan as finalized. A success toast is displayed.

---

## 8. Deployment (Vercel)
*   The application is designed to be deployed on Vercel.
*   **Environment Variables**: Critical environment variables, especially `GOOGLE_API_KEY` (or `GOOGLE_GENAI_API_KEY`) for Genkit to access Google AI models, must be configured in the Vercel project settings. These are not taken from the local `.env` file in production.
*   **Build Process**: Vercel's build system will compile the Next.js application.
    *   `postcss.config.js` (with `tailwindcss` and `autoprefixer` plugins) ensures Tailwind CSS is correctly processed and vendor prefixes are added.
    *   `next.config.ts` provides Next.js specific build configurations.
*   The output is a statically optimized Next.js application with serverless functions for Server Actions.

---

## 9. Key Configuration Files
*   **`.env`**: For local development, stores sensitive information like API keys. **Should not be committed to version control.**
*   **`next.config.ts`**: Configures Next.js features, build outputs, image optimization, etc. Currently includes TypeScript and ESLint ignore flags for builds and image remote patterns.
*   **`package.json`**: Lists project dependencies (`dependencies`, `devDependencies`) and defines scripts (`dev`, `build`, `start`, `lint`, `genkit:dev`).
*   **`tailwind.config.ts`**: Configures Tailwind CSS, including theme extensions (colors, fonts, animations) and content paths.
*   **`tsconfig.json`**: Specifies TypeScript compiler options, paths aliases (`@/*`), and included/excluded files.
*   **`components.json`**: Configuration file for ShadCN UI, specifying style, paths, and component aliases.
*   **`apphosting.yaml`**: Configuration for Firebase App Hosting (if used as an alternative deployment). Current setup is minimal.
*   **`postcss.config.js`**: Defines PostCSS plugins to be used, primarily `tailwindcss` and `autoprefixer`.
