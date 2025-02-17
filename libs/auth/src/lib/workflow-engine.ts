import { z } from 'zod';
import { AuthError, AUTH_ERROR_CODES } from './errors';
import { hookManager } from './hooks';

export type WorkflowStep = {
  id: string;
  type: string;
  config: Record<string, any>;
  required: boolean;
  next?: string | { [key: string]: string };
};

export type Workflow = {
  id: string;
  name: string;
  steps: Record<string, WorkflowStep>;
  initialStep: string;
};

export type WorkflowContext = {
  workflowId: string;
  currentStep: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, any>;
};

export class WorkflowEngine {
  private workflows = new Map<string, Workflow>();
  private stepHandlers = new Map<
    string,
    (context: WorkflowContext, config: any) => Promise<any>
  >();

  registerWorkflow(workflow: Workflow): void {
    // Validate workflow structure
    if (!workflow.steps[workflow.initialStep]) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Invalid workflow: initial step ${workflow.initialStep} not found`
      );
    }

    this.workflows.set(workflow.id, workflow);
  }

  registerStepHandler(
    type: string,
    handler: (context: WorkflowContext, config: any) => Promise<any>
  ): void {
    this.stepHandlers.set(type, handler);
  }

  async executeStep(
    context: WorkflowContext,
    input?: any
  ): Promise<{
    completed: boolean;
    nextStep?: string;
    output?: any;
  }> {
    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Workflow ${context.workflowId} not found`
      );
    }

    const step = workflow.steps[context.currentStep];
    if (!step) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Step ${context.currentStep} not found in workflow ${context.workflowId}`
      );
    }

    const handler = this.stepHandlers.get(step.type);
    if (!handler) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `No handler registered for step type ${step.type}`
      );
    }

    // Execute pre-step hooks
    await hookManager.executeHooks('pre:workflow:step', {
      type: step.type,
      data: { workflowId: context.workflowId, stepId: step.id, input },
    });

    // Execute the step
    const output = await handler(context, step.config);

    // Execute post-step hooks
    await hookManager.executeHooks('post:workflow:step', {
      type: step.type,
      data: { workflowId: context.workflowId, stepId: step.id, output },
    });

    // Determine next step
    let nextStep: string | undefined;
    if (step.next) {
      if (typeof step.next === 'string') {
        nextStep = step.next;
      } else if (typeof output === 'string' && output in step.next) {
        nextStep = step.next[output];
      }
    }

    return {
      completed: !nextStep,
      nextStep,
      output,
    };
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  removeWorkflow(id: string): void {
    this.workflows.delete(id);
  }
}

// Common workflow step handlers
export const commonStepHandlers = {
  'mfa:totp': async (context: WorkflowContext, config: any) => {
    // TOTP verification logic
    return 'verified';
  },
  'mfa:sms': async (context: WorkflowContext, config: any) => {
    // SMS verification logic
    return 'verified';
  },
  password: async (context: WorkflowContext, config: any) => {
    // Password verification logic
    return 'verified';
  },
  oauth: async (context: WorkflowContext, config: any) => {
    // OAuth flow logic
    return 'success';
  },
};

export const workflowEngine = new WorkflowEngine();
