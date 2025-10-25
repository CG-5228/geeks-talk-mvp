/**
 * Telemetry utilities for E2EE 1v1 Random Voice Chat
 * No PII logging - only anonymous metrics for debugging and monitoring
 */

export interface TelemetryEvent {
  event: string;
  timestamp: number;
  data?: Record<string, any>;
}

// Telemetry event types (no PII)
export type TelemetryEventType = 
  | 'queue_enter'
  | 'queue_leave' 
  | 'match_found'
  | 'room_join'
  | 'e2ee_ready'
  | 'e2ee_rekey'
  | 'room_leave'
  | 'error_crypto'
  | 'error_network'
  | 'error_rate_limit'
  | 'error_validation';

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private maxEvents = 100; // Keep last 100 events in memory

  // Log telemetry event (no PII)
  log(event: TelemetryEventType, data?: Record<string, any>): void {
    const telemetryEvent: TelemetryEvent = {
      event,
      timestamp: Date.now(),
      data: data ? this.sanitizeData(data) : undefined,
    };

    this.events.push(telemetryEvent);
    
    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telemetry] ${event}:`, data);
    }
  }

  // Sanitize data to remove any potential PII
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Only allow safe data types and values
      if (typeof value === 'string' && value.length > 0 && value.length < 100) {
        // Check if it looks like PII (email, name, etc.)
        if (!this.looksLikePII(value)) {
          sanitized[key] = value;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value) && value.length < 10) {
        sanitized[key] = value.filter(item => 
          typeof item === 'string' && item.length < 50 && !this.looksLikePII(item)
        );
      }
    }
    
    return sanitized;
  }

  // Check if a string looks like PII
  private looksLikePII(str: string): boolean {
    const piiPatterns = [
      /@/, // Email
      /^\d{4}-\d{2}-\d{2}/, // Date
      /^[A-Za-z]+\s+[A-Za-z]+/, // Name pattern
      /user/i,
      /id/i,
      /email/i,
      /name/i,
    ];
    
    return piiPatterns.some(pattern => pattern.test(str));
  }

  // Get recent events (for debugging)
  getRecentEvents(count: number = 10): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  // Clear events
  clear(): void {
    this.events = [];
  }
}

// Export singleton instance
export const telemetry = new TelemetryService();

// Convenience functions for common events
export const logQueueEnter = (topicCount: number) => {
  telemetry.log('queue_enter', { topicCount });
};

export const logQueueLeave = (reason: 'cancel' | 'matched' | 'error', duration?: number) => {
  telemetry.log('queue_leave', { reason, duration });
};

export const logMatchFound = (topicOverlap: boolean, queueDuration?: number) => {
  telemetry.log('match_found', { topicOverlap, queueDuration });
};

export const logRoomJoin = () => {
  telemetry.log('room_join');
};

export const logE2EEReady = (keyExchangeDuration?: number, browser?: string) => {
  telemetry.log('e2ee_ready', { keyExchangeDuration, browser });
};

export const logE2EERekey = (keyIndex: number, reason: 'timer' | 'participant_change') => {
  telemetry.log('e2ee_rekey', { keyIndex, reason });
};

export const logRoomLeave = (duration?: number, rekeyCount?: number) => {
  telemetry.log('room_leave', { duration, rekeyCount });
};

export const logError = (type: 'crypto' | 'network' | 'rate_limit' | 'validation', details?: string) => {
  telemetry.log(`error_${type}` as TelemetryEventType, { details });
};
