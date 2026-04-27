import { generateRiskNotes } from './hardening.js';

export const REVIEW_QUEUE_STATE_KEY = 'pulseapi_review_queue_state_v1';
export const REVIEW_QUEUE_UPDATED_EVENT = 'pulseapi:review-queue-updated';

const FEED_RISK_SLICES = 3;

export function loadReviewQueueState() {
  try {
    const raw = localStorage.getItem(REVIEW_QUEUE_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * A contract "counts" toward summary stats when it still has at least one
 * review-queue (inference) risk that is not dismissed — same first {FEED_RISK_SLICES} notes
 * as the Review Queue feed.
 */
export function contractHasActiveQueueRiskNotes(contract, state) {
  const notes = generateRiskNotes(contract);
  if (notes.length === 0) return false;
  for (let idx = 0; idx < Math.min(FEED_RISK_SLICES, notes.length); idx += 1) {
    if (!state[`risk-${contract.id}-${idx}`]?.dismissed) {
      return true;
    }
  }
  return false;
}

export function countContractsWithActiveRiskNotes(contracts, state) {
  return contracts.filter((c) => contractHasActiveQueueRiskNotes(c, state)).length;
}

export function emitReviewQueueUpdated() {
  window.dispatchEvent(new Event(REVIEW_QUEUE_UPDATED_EVENT));
}
