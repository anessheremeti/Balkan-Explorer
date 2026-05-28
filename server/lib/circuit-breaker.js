import { log } from './logger.js';

// Standard three-state circuit breaker.
//  CLOSED    → normal operation, failures counted
//  OPEN      → calls rejected immediately; reopens after `timeout` ms
//  HALF_OPEN → one probe call allowed; success → CLOSED, failure → OPEN
export class CircuitBreaker {
  constructor(name, { threshold = 3, timeout = 60_000, successThreshold = 1 } = {}) {
    this.name             = name;
    this.state            = 'CLOSED';
    this.failures         = 0;
    this.lastFailure      = null;
    this.halfOpenSuccess  = 0;
    this.threshold        = threshold;
    this.timeout          = timeout;
    this.successThreshold = successThreshold;
  }

  get isAvailable() {
    if (this.state !== 'OPEN') return true;
    return Date.now() - this.lastFailure >= this.timeout;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (this.isAvailable) {
        this.state           = 'HALF_OPEN';
        this.halfOpenSuccess = 0;
        log.info('Circuit half-open', { breaker: this.name });
      } else {
        const left = Math.round((this.timeout - (Date.now() - this.lastFailure)) / 1000);
        throw new Error(`Circuit ${this.name} OPEN (${left}s remaining)`);
      }
    }

    try {
      const result = await fn();
      this._success();
      return result;
    } catch (err) {
      this._fail(err.message);
      throw err;
    }
  }

  _success() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      if (++this.halfOpenSuccess >= this.successThreshold) {
        this.state = 'CLOSED';
        log.info('Circuit closed — provider recovered', { breaker: this.name });
      }
    }
  }

  _fail(reason) {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
      this.state = 'OPEN';
      log.warn('Circuit opened', { breaker: this.name, failures: this.failures, reason });
    }
  }

  toJSON() {
    return { name: this.name, state: this.state, failures: this.failures, lastFailure: this.lastFailure };
  }
}
