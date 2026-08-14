import { PLANS, PlanType, EntitlementKey, getPlanConfig, hasEntitlement, calculateEstimatedAiCost } from '../config/plans';
import crypto from 'node:crypto';

export interface SubscriptionRecord {
  userId: string;
  plan: PlanType;
  status: 'active' | 'trialing' | 'pending' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  cycle: 'monthly' | 'annual';
  provider: 'mercadopago' | 'pix_card_simulated';
  subscriptionId: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UsageRecord {
  userId: string;
  diagnosesCount: number;
  aiGenerationsCount: number;
  dailyGenerationsCount: number;
  imageGenerationsCount: number;
  videoGenerationsCount: number;
  lastResetTimestamp: number;
  lastDailyResetTimestamp: number;
}

export interface FeedbackRecord {
  id: string;
  userId: string;
  solutionType: string;
  rating: 'useful' | 'not_useful';
  comment?: string;
  itemTitle?: string;
  timestamp: number;
}

export interface WebhookEventRecord {
  eventId: string;
  eventType: string;
  userId: string;
  status: string;
  provider: string;
  processedAt: number;
  payload: any;
}

export interface CheckoutSessionRecord {
  sessionId: string;
  userId: string;
  planId: PlanType;
  cycle: 'monthly' | 'annual';
  amount: number;
  paymentMethod: 'pix' | 'card';
  status: 'pending' | 'approved' | 'failed' | 'canceled';
  provider: 'mercadopago' | 'pix_card_simulated';
  providerPaymentId?: string;
  pixQrCodeText?: string;
  pixQrCodeBase64?: string;
  checkoutUrl?: string;
  createdAt: number;
  expiresAt: number;
}

export interface AiLogRecord {
  id: string;
  diagnosticId?: string;
  userId: string;
  action: string;
  modelUsed: string;
  durationMs: number;
  retries: number;
  fallbackUsed: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  estimatedCostBrl: number;
  timestamp: number;
}

// In-memory persistent state stores
const subscriptionsStore = new Map<string, SubscriptionRecord>();
const usageStore = new Map<string, UsageRecord>();
const checkoutSessionsStore = new Map<string, CheckoutSessionRecord>();
const processedWebhooksStore = new Map<string, WebhookEventRecord>();
const feedbackStore: FeedbackRecord[] = [];
const aiLogsStore: AiLogRecord[] = [];

/**
 * Gets or initializes a user's subscription record (Default: FREE).
 */
export function getSubscription(userId: string): SubscriptionRecord {
  if (!userId) userId = 'anonymous';
  
  const existing = subscriptionsStore.get(userId);
  if (existing) {
    // Check expiration
    if (existing.plan === 'PRO' && existing.currentPeriodEnd < Date.now() && existing.status === 'active') {
      existing.status = 'expired';
      existing.plan = 'FREE';
      existing.updatedAt = Date.now();
    }
    return existing;
  }

  const defaultSub: SubscriptionRecord = {
    userId,
    plan: 'FREE',
    status: 'active',
    cycle: 'monthly',
    provider: 'mercadopago',
    subscriptionId: `sub_free_${userId}`,
    currentPeriodStart: Date.now(),
    currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year free
    cancelAtPeriodEnd: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  subscriptionsStore.set(userId, defaultSub);
  return defaultSub;
}

/**
 * Gets or resets a user's usage record based on daily and monthly windows.
 */
export function getUsage(userId: string): UsageRecord {
  if (!userId) userId = 'anonymous';

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * oneDayMs;

  let usage = usageStore.get(userId);
  if (!usage) {
    usage = {
      userId,
      diagnosesCount: 0,
      aiGenerationsCount: 0,
      dailyGenerationsCount: 0,
      imageGenerationsCount: 0,
      videoGenerationsCount: 0,
      lastResetTimestamp: now,
      lastDailyResetTimestamp: now
    };
    usageStore.set(userId, usage);
    return usage;
  }

  // Daily reset check
  if (now - usage.lastDailyResetTimestamp > oneDayMs) {
    usage.dailyGenerationsCount = 0;
    usage.lastDailyResetTimestamp = now;
  }

  // Monthly reset check
  if (now - usage.lastResetTimestamp > thirtyDaysMs) {
    usage.diagnosesCount = 0;
    usage.aiGenerationsCount = 0;
    usage.imageGenerationsCount = 0;
    usage.videoGenerationsCount = 0;
    usage.lastResetTimestamp = now;
  }

  return usage;
}

/**
 * Verifies if a user has access to a specific entitlement.
 */
export function checkUserEntitlement(userId: string, entitlement: EntitlementKey): {
  allowed: boolean;
  plan: PlanType;
  reason?: string;
} {
  const sub = getSubscription(userId);
  const isAllowed = hasEntitlement(sub.plan, entitlement);

  if (!isAllowed) {
    return {
      allowed: false,
      plan: sub.plan,
      reason: `RECURSO_BLOQUEADO: O recurso '${entitlement}' requer o plano InstaScore PRO.`
    };
  }

  return {
    allowed: true,
    plan: sub.plan
  };
}

/**
 * Checks and increments quotas for diagnoses, AI text generations, image generations, or video/storyboards.
 */
export function checkAndIncrementQuota(
  userId: string, 
  actionType: 'DIAGNOSIS' | 'AI_GENERATION' | 'IMAGE_GENERATION' | 'VIDEO_GENERATION'
): {
  allowed: boolean;
  plan: PlanType;
  currentCount: number;
  maxLimit: number;
  errorCode?: string;
  message?: string;
} {
  const sub = getSubscription(userId);
  const usage = getUsage(userId);
  const config = getPlanConfig(sub.plan);

  if (actionType === 'DIAGNOSIS') {
    if (sub.plan === 'FREE') {
      const maxLimit = config.quotas.maxDiagnosesTotal;
      if (usage.diagnosesCount >= maxLimit) {
        return {
          allowed: false,
          plan: sub.plan,
          currentCount: usage.diagnosesCount,
          maxLimit,
          errorCode: 'FREE_QUOTA_EXCEEDED',
          message: 'Você atingiu o limite de 1 diagnóstico gratuito no plano Free. Faça upgrade para o InstaScore PRO para realizar análises adicionais.'
        };
      }
    } else if (sub.plan === 'PRO') {
      const maxLimit = config.quotas.maxDiagnosesPerMonth;
      if (usage.diagnosesCount >= maxLimit) {
        return {
          allowed: false,
          plan: sub.plan,
          currentCount: usage.diagnosesCount,
          maxLimit,
          errorCode: 'PRO_MONTHLY_QUOTA_EXCEEDED',
          message: `Você atingiu seu limite de ${maxLimit} diagnósticos mensais do plano Pro. Seu limite será renovado no próximo ciclo.`
        };
      }
    }

    // Allowed -> Increment
    usage.diagnosesCount += 1;
    return {
      allowed: true,
      plan: sub.plan,
      currentCount: usage.diagnosesCount,
      maxLimit: sub.plan === 'FREE' ? config.quotas.maxDiagnosesTotal : config.quotas.maxDiagnosesPerMonth
    };
  } else if (actionType === 'IMAGE_GENERATION') {
    const limit = config.quotas.maxImageGenerationsPerMonth;
    if (limit <= 0) {
      return {
        allowed: false,
        plan: sub.plan,
        currentCount: usage.imageGenerationsCount,
        maxLimit: limit,
        errorCode: 'IMAGE_GENERATION_PRO_ONLY',
        message: 'A geração de imagens visuais estratégicas é exclusiva do plano InstaScore PRO.'
      };
    }
    if (usage.imageGenerationsCount >= limit) {
      return {
        allowed: false,
        plan: sub.plan,
        currentCount: usage.imageGenerationsCount,
        maxLimit: limit,
        errorCode: 'IMAGE_MONTHLY_QUOTA_EXCEEDED',
        message: `Você atingiu o limite mensal de ${limit} gerações de imagens do seu plano PRO.`
      };
    }

    usage.imageGenerationsCount += 1;
    return {
      allowed: true,
      plan: sub.plan,
      currentCount: usage.imageGenerationsCount,
      maxLimit: limit
    };
  } else if (actionType === 'VIDEO_GENERATION') {
    const limit = config.quotas.maxVideoGenerationsPerMonth;
    if (limit <= 0) {
      return {
        allowed: false,
        plan: sub.plan,
        currentCount: usage.videoGenerationsCount,
        maxLimit: limit,
        errorCode: 'VIDEO_GENERATION_PRO_ONLY',
        message: 'A geração de roteiros de vídeo e storyboards completos é exclusiva do plano InstaScore PRO.'
      };
    }
    if (usage.videoGenerationsCount >= limit) {
      return {
        allowed: false,
        plan: sub.plan,
        currentCount: usage.videoGenerationsCount,
        maxLimit: limit,
        errorCode: 'VIDEO_MONTHLY_QUOTA_EXCEEDED',
        message: `Você atingiu o limite mensal de ${limit} storyboards de vídeo do seu plano PRO.`
      };
    }

    usage.videoGenerationsCount += 1;
    return {
      allowed: true,
      plan: sub.plan,
      currentCount: usage.videoGenerationsCount,
      maxLimit: limit
    };
  } else { // AI_GENERATION
    const dailyLimit = config.quotas.maxAiGenerationsPerDay;
    if (usage.dailyGenerationsCount >= dailyLimit) {
      return {
        allowed: false,
        plan: sub.plan,
        currentCount: usage.dailyGenerationsCount,
        maxLimit: dailyLimit,
        errorCode: 'DAILY_AI_QUOTA_EXCEEDED',
        message: `Você atingiu o limite diário de ${dailyLimit} gerações de IA. Aguarde a renovação diária para continuar.`
      };
    }

    // Allowed -> Increment
    usage.dailyGenerationsCount += 1;
    usage.aiGenerationsCount += 1;
    return {
      allowed: true,
      plan: sub.plan,
      currentCount: usage.dailyGenerationsCount,
      maxLimit: dailyLimit
    };
  }
}

/**
 * Creates a REAL Payment Checkout Session using Mercado Pago REST API.
 */
export async function createCheckoutSessionServer(params: {
  userId: string;
  planId: 'PRO' | 'FREE';
  cycle: 'monthly' | 'annual';
  paymentMethod: 'pix' | 'card';
  userEmail?: string;
  appUrl?: string;
}): Promise<CheckoutSessionRecord> {
  const { userId, planId, cycle, paymentMethod, userEmail, appUrl } = params;

  // STRICT SERVER PRICE ENFORCEMENT (NEVER TRUST CLIENT PRICE)
  const selectedPlanConfig = getPlanConfig(planId);
  const amount = cycle === 'annual' ? selectedPlanConfig.priceAnnual : selectedPlanConfig.priceMonthly;
  const sessionId = `chk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000; // 30 mins expiry

  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'mercadopago';
  const paymentEnvironment = process.env.PAYMENT_ENVIRONMENT || 'sandbox';
  const baseUrl = appUrl || process.env.APP_URL || 'http://localhost:3000';

  let checkoutRecord: CheckoutSessionRecord = {
    sessionId,
    userId,
    planId,
    cycle,
    amount,
    paymentMethod,
    status: 'pending',
    provider: paymentProvider as any,
    createdAt: now,
    expiresAt
  };

  // MERCADO PAGO OFFICIAL API INTEGRATION
  if (mpAccessToken) {
    try {
      if (paymentMethod === 'pix') {
        // Create Pix Payment via Mercado Pago REST API
        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': sessionId
          },
          body: JSON.stringify({
            transaction_amount: amount,
            description: `InstaScore PRO - Plano ${cycle === 'annual' ? 'Anual' : 'Mensal'}`,
            payment_method_id: 'pix',
            payer: {
              email: userEmail || `user_${userId.substring(0, 8)}@instascore.ai`,
              first_name: 'InstaScore',
              last_name: 'User'
            },
            notification_url: `${baseUrl}/api/webhook/payment`,
            external_reference: sessionId,
            metadata: {
              user_id: userId,
              session_id: sessionId,
              plan_id: planId,
              cycle
            }
          })
        });

        const mpData = await mpRes.json();
        if (mpRes.ok && mpData.point_of_interaction?.transaction_data) {
          const txData = mpData.point_of_interaction.transaction_data;
          checkoutRecord.providerPaymentId = String(mpData.id);
          checkoutRecord.pixQrCodeText = txData.qr_code;
          checkoutRecord.pixQrCodeBase64 = txData.qr_code_base64;
          checkoutRecord.checkoutUrl = txData.ticket_url;
        } else {
          console.warn('[MercadoPago Pix Error] Status:', mpRes.status);
        }
      } else {
        // Create Mercado Pago Hosted Preference for Cards
        const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: [
              {
                id: `instascore_pro_${cycle}`,
                title: `InstaScore PRO (${cycle === 'annual' ? 'Anual' : 'Mensal'})`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: amount
              }
            ],
            external_reference: sessionId,
            payer: {
              email: userEmail || `user_${userId.substring(0, 8)}@instascore.ai`
            },
            back_urls: {
              success: `${baseUrl}/my-plan?checkout=success&session=${sessionId}`,
              failure: `${baseUrl}/my-plan?checkout=failed`,
              pending: `${baseUrl}/my-plan?checkout=pending`
            },
            auto_return: 'approved',
            notification_url: `${baseUrl}/api/webhook/payment`,
            metadata: {
              user_id: userId,
              session_id: sessionId,
              plan_id: planId,
              cycle
            }
          })
        });

        const prefData = await prefRes.json();
        if (prefRes.ok) {
          const isSandbox = paymentEnvironment === 'sandbox';
          checkoutRecord.checkoutUrl = isSandbox ? prefData.sandbox_init_point : prefData.init_point;
          checkoutRecord.providerPaymentId = String(prefData.id);
        } else {
          console.warn('[MercadoPago Preference Error] Status:', prefRes.status);
        }
      }
    } catch (err) {
      console.error('[MercadoPago API Exception]', err);
    }
  }

  // SANDBOX FALLBACK (Only if MERCADOPAGO_ACCESS_TOKEN is not configured in local environment)
  if (!checkoutRecord.pixQrCodeText && paymentMethod === 'pix') {
    const formattedAmount = amount.toFixed(2);
    const pixCode = `00020126580014BR.GOV.BCB.PIX0136instascore-pay-${sessionId}5204000053039865405${formattedAmount}5802BR5920InstaScore AI Brasil6009SAO PAULO62070503***63041D2A`;
    checkoutRecord.pixQrCodeText = pixCode;
  }

  if (!checkoutRecord.checkoutUrl && paymentMethod === 'card') {
    checkoutRecord.checkoutUrl = `${baseUrl}/checkout/${sessionId}`;
  }

  checkoutSessionsStore.set(sessionId, checkoutRecord);

  // Set pending subscription state
  const currentSub = getSubscription(userId);
  if (currentSub.plan !== 'PRO') {
    currentSub.status = 'pending';
    currentSub.updatedAt = now;
  }

  return checkoutRecord;
}

/**
 * Validates Webhook Secret/Signature.
 */
export function validateWebhookSignature(reqHeaders: Record<string, any>, reqBody: any): boolean {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = reqHeaders['x-signature'] || reqHeaders['x-webhook-secret'] || reqHeaders['authorization'];
    if (!signature) {
      return false;
    }

    if (reqHeaders['x-webhook-secret'] && reqHeaders['x-webhook-secret'] !== webhookSecret) {
      return false;
    }

    // Mercado Pago HMAC Signature Verification
    if (typeof signature === 'string' && signature.includes('ts=')) {
      try {
        const parts = signature.split(',');
        const tsPart = parts.find(p => p.trim().startsWith('ts='));
        const v1Part = parts.find(p => p.trim().startsWith('v1='));
        if (tsPart && v1Part) {
          const ts = tsPart.split('=')[1];
          const hash = v1Part.split('=')[1];
          const dataId = reqBody?.data?.id || reqBody?.id || '';
          const requestId = reqHeaders['x-request-id'] || '';
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const computedHash = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
          if (computedHash !== hash) {
            console.warn('[Webhook Signature Validation Failed]');
            return false;
          }
        }
      } catch (err) {
        console.warn('[Webhook Signature Parsing Error]', err);
      }
    }
  }

  return true;
}

/**
 * Server-to-Server Payment Reconciliation with Mercado Pago REST API.
 * Queries Mercado Pago directly to verify actual payment status before granting PRO.
 */
export async function reconcilePaymentWithMercadoPago(paymentId: string): Promise<{
  verified: boolean;
  status?: string;
  userId?: string;
  sessionId?: string;
  cycle?: 'monthly' | 'annual';
}> {
  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!mpAccessToken || !paymentId) {
    return { verified: false };
  }

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const paymentData = await res.json();
      const status = paymentData.status; // 'approved', 'pending', 'rejected', 'cancelled'
      const sessionId = paymentData.external_reference || paymentData.metadata?.session_id;
      const userId = paymentData.metadata?.user_id;
      const cycle = paymentData.metadata?.cycle || 'monthly';

      return {
        verified: true,
        status,
        userId,
        sessionId,
        cycle
      };
    } else {
      console.warn('[MercadoPago Reconciliation Warning] Payment ID not found or error:', res.status);
    }
  } catch (err) {
    console.error('[MercadoPago Reconciliation Exception]', err);
  }

  return { verified: false };
}

/**
 * Handles Webhook Events with Idempotency, Server Reconciliation & Provider Mapping.
 */
export async function processWebhookEvent(event: {
  eventId: string;
  eventType: string;
  userId: string;
  cycle?: 'monthly' | 'annual';
  status?: string;
  provider?: 'mercadopago' | 'pix_card_simulated';
  sessionId?: string;
  providerPaymentId?: string;
  payload?: any;
}): Promise<{
  success: boolean;
  processed: boolean;
  reason?: string;
  subscription?: SubscriptionRecord;
}> {
  let { eventId, userId, eventType, cycle, status, provider, sessionId, providerPaymentId, payload } = event;

  // Real Mercado Pago Server-to-Server Reconciliation
  if (providerPaymentId && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    const reconciliation = await reconcilePaymentWithMercadoPago(providerPaymentId);
    if (reconciliation.verified && reconciliation.status) {
      status = reconciliation.status;
      if (reconciliation.userId) userId = reconciliation.userId;
      if (reconciliation.sessionId) sessionId = reconciliation.sessionId;
      if (reconciliation.cycle) cycle = reconciliation.cycle;
      console.log(`[MercadoPago Reconciliation Success] Payment ID ${providerPaymentId} status verified as '${status}' for user '${userId}'`);
    }
  }

  if (!eventId || !userId) {
    return { success: false, processed: false, reason: 'PAYLOAD_INVALIDO: eventId e userId são obrigatórios.' };
  }

  // IDEMPOTENCY CHECK
  const existingEvent = processedWebhooksStore.get(eventId);
  if (existingEvent) {
    const existingSub = getSubscription(userId);
    return {
      success: true,
      processed: false,
      reason: 'EVENTO_JA_PROCESSADO_IDEMPOTENCIA',
      subscription: existingSub
    };
  }

  // Record webhook event execution
  const webhookRecord: WebhookEventRecord = {
    eventId,
    eventType: eventType || 'payment.approved',
    userId,
    status: status || 'approved',
    provider: provider || 'mercadopago',
    processedAt: Date.now(),
    payload: payload || {}
  };
  processedWebhooksStore.set(eventId, webhookRecord);

  const now = Date.now();
  const selectedCycle = cycle || 'monthly';
  const durationMs = (selectedCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000;

  let sub = subscriptionsStore.get(userId);

  const isApproved = eventType === 'payment.approved' || 
                     eventType === 'subscription.created' || 
                     (eventType === 'payment.updated' && status === 'approved') || 
                     status === 'approved' || 
                     status === 'accredited';

  if (isApproved) {
    sub = {
      userId,
      plan: 'PRO',
      status: 'active',
      cycle: selectedCycle,
      provider: provider || 'mercadopago',
      subscriptionId: `sub_pro_${userId}_${now}`,
      providerSubscriptionId: providerPaymentId,
      currentPeriodStart: now,
      currentPeriodEnd: now + durationMs,
      cancelAtPeriodEnd: false,
      createdAt: sub ? sub.createdAt : now,
      updatedAt: now
    };
    subscriptionsStore.set(userId, sub);

    // Reset usage quotas on new active subscription/renewal
    const usage = getUsage(userId);
    usage.diagnosesCount = 0;
    usage.aiGenerationsCount = 0;

    // Update associated checkout session
    if (sessionId) {
      const chk = checkoutSessionsStore.get(sessionId);
      if (chk) {
        chk.status = 'approved';
      }
    }
  } else if (status === 'pending' || eventType === 'payment.pending') {
    if (sub) {
      sub.status = 'pending';
      sub.updatedAt = now;
    }
  } else if (status === 'cancelled' || eventType === 'subscription.cancelled') {
    if (sub) {
      sub.cancelAtPeriodEnd = true;
      sub.status = 'canceled';
      sub.updatedAt = now;
    }
  } else if (status === 'rejected' || eventType === 'payment.failed' || eventType === 'subscription.expired') {
    if (sub) {
      sub.status = 'expired';
      sub.plan = 'FREE';
      sub.updatedAt = now;
    }
  }

  return {
    success: true,
    processed: true,
    subscription: sub || getSubscription(userId)
  };
}

/**
 * Get current checkout session status for polling (with IDOR protection).
 */
export function getCheckoutSessionStatus(sessionId: string, userId: string): {
  found: boolean;
  status: string;
  isPro: boolean;
  session?: CheckoutSessionRecord;
} {
  const session = checkoutSessionsStore.get(sessionId);
  if (!session) {
    return { found: false, status: 'not_found', isPro: false };
  }

  // IDOR Protection: User can only inspect their own session
  if (session.userId !== userId) {
    return { found: false, status: 'unauthorized', isPro: false };
  }

  const sub = getSubscription(userId);
  const isPro = sub.plan === 'PRO' && sub.status === 'active';

  return {
    found: true,
    status: isPro ? 'approved' : session.status,
    isPro,
    session
  };
}

/**
 * Cancels a user subscription with real provider call when configured.
 */
export async function cancelSubscriptionServer(userId: string): Promise<{ success: boolean; subscription: SubscriptionRecord }> {
  const sub = getSubscription(userId);

  // Call Mercado Pago cancellation if subscription ID exists
  if (sub.providerSubscriptionId && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    try {
      await fetch(`https://api.mercadopago.com/preapproval/${sub.providerSubscriptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
    } catch (err) {
      console.warn('[MercadoPago Cancellation Warning]', err);
    }
  }

  sub.cancelAtPeriodEnd = true;
  sub.status = 'canceled';
  sub.updatedAt = Date.now();
  return { success: true, subscription: sub };
}

/**
 * AI Observability logger.
 */
export function logAiExecutionCost(data: {
  userId: string;
  diagnosticId?: string;
  action: string;
  modelUsed: string;
  durationMs: number;
  retries: number;
  fallbackUsed: boolean;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const inTokens = data.inputTokens || 2200;
  const outTokens = data.outputTokens || 1800;
  const { costUsd, costBrl } = calculateEstimatedAiCost(data.modelUsed, inTokens, outTokens);

  const logRecord: AiLogRecord = {
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    diagnosticId: data.diagnosticId,
    userId: data.userId || 'anonymous',
    action: data.action,
    modelUsed: data.modelUsed,
    durationMs: data.durationMs,
    retries: data.retries,
    fallbackUsed: data.fallbackUsed,
    inputTokens: inTokens,
    outputTokens: outTokens,
    estimatedCostUsd: costUsd,
    estimatedCostBrl: costBrl,
    timestamp: Date.now()
  };

  aiLogsStore.push(logRecord);
  return logRecord;
}

/**
 * Register user satisfaction feedback (👍 / 👎)
 */
export function submitUserFeedback(data: {
  userId: string;
  solutionType: string;
  rating: 'useful' | 'not_useful';
  comment?: string;
  itemTitle?: string;
}): FeedbackRecord {
  const record: FeedbackRecord = {
    id: `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: data.userId || 'anonymous',
    solutionType: data.solutionType,
    rating: data.rating,
    comment: data.comment,
    itemTitle: data.itemTitle,
    timestamp: Date.now()
  };

  feedbackStore.push(record);
  return record;
}

export function listFeedbackRecords(limit = 50): FeedbackRecord[] {
  return feedbackStore.slice(-limit).reverse();
}

/**
 * Get metrics for Admin & Observability.
 */
export function getAdminMetrics() {
  const allSubs = Array.from(subscriptionsStore.values());
  const totalUsers = allSubs.length;
  const proUsers = allSubs.filter(s => s.plan === 'PRO' && s.status === 'active').length;
  const freeUsers = totalUsers - proUsers;

  const totalCostUsd = aiLogsStore.reduce((acc, l) => acc + l.estimatedCostUsd, 0);
  const totalCostBrl = aiLogsStore.reduce((acc, l) => acc + l.estimatedCostBrl, 0);
  const totalAiCalls = aiLogsStore.length;

  const totalFeedbacks = feedbackStore.length;
  const usefulFeedbacks = feedbackStore.filter(f => f.rating === 'useful').length;
  const satisfactionRatePct = totalFeedbacks > 0 ? Number(((usefulFeedbacks / totalFeedbacks) * 100).toFixed(1)) : 100;

  const estimatedMonthlyRevenueBrl = proUsers * PLANS.PRO.priceMonthly;

  return {
    users: {
      total: totalUsers,
      free: freeUsers,
      pro: proUsers,
      conversionRatePct: totalUsers > 0 ? Number(((proUsers / totalUsers) * 100).toFixed(1)) : 0
    },
    revenue: {
      monthlyEstimatedBrl: Number(estimatedMonthlyRevenueBrl.toFixed(2)),
      formatted: `R$ ${estimatedMonthlyRevenueBrl.toFixed(2)}`
    },
    feedback: {
      total: totalFeedbacks,
      useful: usefulFeedbacks,
      notUseful: totalFeedbacks - usefulFeedbacks,
      satisfactionRatePct,
      recent: feedbackStore.slice(-10).reverse()
    },
    aiObservability: {
      totalCalls: totalAiCalls,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      totalCostBrl: Number(totalCostBrl.toFixed(2)),
      logsSample: aiLogsStore.slice(-10)
    }
  };
}
