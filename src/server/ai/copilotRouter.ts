/**
 * CyberOps SOC — Server-Side Copilot API Router
 *
 * Exposes POST /api/copilot/chat with strict authentication, rate-limiting,
 * input validation, role isolation, and safe error handling.
 */

import { Router, Response } from 'express';
import {
  authenticateCopilotRequest,
  AuthenticatedRequest,
  TokenVerifier,
} from './copilotAuth';
import { CopilotContextAssembler } from './copilotContextAssembler';
import {
  GeminiCopilotService,
  GeminiUnavailableError,
  GeminiTimeoutError,
} from './geminiClient';
import {
  IUsageController,
  defaultUsageController,
  InMemoryUsageController,
} from './copilotUsageControl';
import {
  CopilotChatRequest,
  CopilotChatResponse,
  CopilotContextType,
  CopilotBaseStatusResponse,
  CopilotAdminStatusResponse,
} from './types';
import { AccessDeniedError } from '../../types/auth';
import { RepositoryBundle } from '../../repositories';

const ALLOWED_CONTEXT_TYPES: CopilotContextType[] = [
  'alert_triage',
  'mitre_analysis',
  'remediation_task',
  'platform_health',
  'general_soc',
];

const ENTITY_ID_REGEX = /^[A-Za-z0-9_.-]{1,64}$/;

export interface CopilotRouterOptions {
  geminiService?: GeminiCopilotService;
  tokenVerifier?: TokenVerifier;
  usageController?: IUsageController;
  repositoryBundle?: RepositoryBundle;
}

export function createCopilotRouter(options: CopilotRouterOptions = {}): Router {
  const router = Router();
  const gemini = options.geminiService || new GeminiCopilotService();
  const usage = options.usageController || defaultUsageController;

  // Apply cryptographic session authentication
  router.use(authenticateCopilotRequest(options.tokenVerifier));

  // Diagnostic status endpoint for copilot configuration
  router.get('/status', (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthenticated caller.', code: 'UNAUTHENTICATED' });
        return;
      }

      const baseStatus: CopilotBaseStatusResponse = {
        status: 'online',
        modelConfigured: gemini.isConfigured(),
        role: user.role,
      };

      // Detailed metrics are exposed ONLY to super_admin in alignment with platform administration scope.
      // Operational roles (soc_analyst, security_engineer, it_operations) strictly receive minimal status fields.
      if (user.role === 'super_admin') {
        const adminStatus: CopilotAdminStatusResponse = {
          ...baseStatus,
          metrics: usage.getMetrics(),
        };
        res.status(200).json(adminStatus);
        return;
      }

      res.status(200).json(baseStatus);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown status check error';
      console.error('[CyberOps SOC Copilot Status Error]:', message);
      res.status(500).json({
        error: 'An internal error occurred while retrieving Copilot status.',
        code: 'COPILOT_STATUS_ERROR',
      });
    }
  });

  // Main Copilot chat query endpoint
  router.post('/chat', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthenticated caller.', code: 'UNAUTHENTICATED' });
      return;
    }

    // 1. Validate request body
    const body = req.body as Partial<CopilotChatRequest>;
    if (!body || typeof body !== 'object') {
      res.status(400).json({
        error: 'Invalid request body: Expected JSON object with prompt and contextType.',
        code: 'INVALID_BODY',
      });
      return;
    }

    const { prompt, contextType, entityId } = body;

    // Validate prompt
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({
        error: 'Validation error: "prompt" must be a non-empty string.',
        code: 'EMPTY_PROMPT',
      });
      return;
    }

    if (prompt.length > 2000) {
      res.status(400).json({
        error: 'Validation error: "prompt" exceeds maximum allowed length of 2000 characters.',
        code: 'PROMPT_TOO_LONG',
      });
      return;
    }

    // Validate contextType
    if (!contextType || !ALLOWED_CONTEXT_TYPES.includes(contextType)) {
      res.status(400).json({
        error: `Validation error: "contextType" must be one of: ${ALLOWED_CONTEXT_TYPES.join(', ')}.`,
        code: 'INVALID_CONTEXT_TYPE',
      });
      return;
    }

    // Validate entityId format if provided
    if (entityId !== undefined) {
      if (typeof entityId !== 'string' || !ENTITY_ID_REGEX.test(entityId)) {
        res.status(400).json({
          error: 'Validation error: "entityId" must be an alphanumeric identifier of 1-64 characters.',
          code: 'INVALID_ENTITY_ID',
        });
        return;
      }
    }

    // 2. Evaluate User Rate Limits
    const limitCheck = usage.evaluateUserLimits(user.id);
    if (!limitCheck.allowed) {
      if (limitCheck.retryAfterSeconds) {
        res.setHeader('Retry-After', limitCheck.retryAfterSeconds);
      }
      res.status(429).json({
        error: limitCheck.reason || 'Too many requests.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    // 3. Acquire Concurrency Slot
    const slotAcquired = usage.acquireConcurrency();
    if (!slotAcquired) {
      res.status(503).json({
        error: 'AI Copilot service is currently processing maximum concurrent requests. Please retry shortly.',
        code: 'CONCURRENCY_LIMIT_REACHED',
      });
      return;
    }

    try {
      // 4. Assemble Role-Scoped Context with strict isolation & injection boundaries
      const assembled = await CopilotContextAssembler.assembleContext(
        user,
        { prompt, contextType, entityId },
        options.repositoryBundle
      );

      // 5. Execute model advisory generation
      const generationResult = await gemini.generateAdvisory(
        assembled.systemInstruction,
        assembled.assembledContent
      );

      // 6. Record server-calculated token usage
      const promptTokens = InMemoryUsageController.estimateTokens(
        assembled.systemInstruction + assembled.assembledContent
      );
      const responseTokens = InMemoryUsageController.estimateTokens(generationResult.text);
      usage.recordTokens(user.id, promptTokens, responseTokens);

      // 7. Return structured safe response envelope
      const responsePayload: CopilotChatResponse = {
        response: generationResult.text,
        role: user.role,
        contextType,
        entityId,
        isAdvisory: true,
        disclaimer: generationResult.disclaimer,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(responsePayload);
    } catch (err: unknown) {
      if (err instanceof AccessDeniedError) {
        res.status(403).json({
          error: err.message,
          code: 'ACCESS_DENIED',
          requiredPermission: err.requiredPermission,
        });
        return;
      }

      if (err instanceof GeminiUnavailableError) {
        res.status(503).json({
          error: err.message,
          code: 'COPILOT_UNAVAILABLE',
        });
        return;
      }

      if (err instanceof GeminiTimeoutError) {
        res.status(504).json({
          error: err.message,
          code: 'MODEL_TIMEOUT',
        });
        return;
      }

      const message = err instanceof Error ? err.message : 'Unknown internal error';
      console.error('[CyberOps SOC Copilot Error]:', message);
      res.status(500).json({
        error: 'An internal error occurred while processing the AI Copilot request.',
        code: 'INTERNAL_COPILOT_ERROR',
      });
    } finally {
      usage.releaseConcurrency();
    }
  });

  return router;
}
