/**
 * Internal Event System
 *
 * Event-driven architecture foundation for the AI Agent platform.
 * All platform events are dispatched through this bus, enabling future
 * integrations: real-time subscriptions, webhooks, AI triggers, analytics.
 *
 * Pattern: emit-and-forget in Phase 1. Future phases will add:
 *   - Persistent event log
 *   - Retry/dead-letter queues
 *   - WebSocket broadcast
 *   - AI agent event listeners
 */

import { EventEmitter } from "events";

// ─── Event Type Registry ──────────────────────────────────────────────────────

export const PlatformEvents = {
  // Auth
  USER_REGISTERED: "user.registered",
  USER_LOGGED_IN: "user.logged_in",
  USER_LOGGED_OUT: "user.logged_out",
  USER_PASSWORD_CHANGED: "user.password_changed",
  USER_PASSWORD_RESET_REQUESTED: "user.password_reset_requested",

  // Users
  USER_PROFILE_UPDATED: "user.profile_updated",
  USER_DEACTIVATED: "user.deactivated",
  USER_ROLE_CHANGED: "user.role_changed",

  // Projects
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",
  PROJECT_ARCHIVED: "project.archived",
  PROJECT_MEMBER_ADDED: "project.member_added",
  PROJECT_MEMBER_REMOVED: "project.member_removed",

  // Notifications
  NOTIFICATION_CREATED: "notification.created",
  NOTIFICATION_READ: "notification.read",
  ALL_NOTIFICATIONS_READ: "notification.all_read",

  // Deployments (placeholder)
  DEPLOYMENT_STARTED: "deployment.started",
  DEPLOYMENT_FINISHED: "deployment.finished",
  DEPLOYMENT_FAILED: "deployment.failed",

  // AI Tasks (placeholder)
  AI_TASK_STARTED: "ai.task_started",
  AI_TASK_COMPLETED: "ai.task_completed",
  AI_TASK_FAILED: "ai.task_failed",
  AI_AGENT_SPAWNED: "ai.agent_spawned",

  // Memory (placeholder)
  MEMORY_UPDATED: "memory.updated",

  // Analytics
  ANALYTICS_EVENT: "analytics.event",
} as const;

export type PlatformEventName = typeof PlatformEvents[keyof typeof PlatformEvents];

export interface PlatformEvent<T = unknown> {
  name: PlatformEventName;
  payload: T;
  timestamp: Date;
  userId?: string;
  projectId?: string;
  requestId?: string;
}

// ─── Event Bus ────────────────────────────────────────────────────────────────

class PlatformEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emit<T>(eventName: PlatformEventName, event: PlatformEvent<T>): boolean {
    return super.emit(eventName, event);
  }

  on<T>(eventName: PlatformEventName, listener: (event: PlatformEvent<T>) => void): this {
    return super.on(eventName, listener);
  }

  once<T>(eventName: PlatformEventName, listener: (event: PlatformEvent<T>) => void): this {
    return super.once(eventName, listener);
  }

  off<T>(eventName: PlatformEventName, listener: (event: PlatformEvent<T>) => void): this {
    return super.off(eventName, listener);
  }

  /**
   * Dispatch a platform event with automatic timestamp injection.
   */
  dispatch<T>(
    name: PlatformEventName,
    payload: T,
    context?: { userId?: string; projectId?: string; requestId?: string }
  ): void {
    const event: PlatformEvent<T> = {
      name,
      payload,
      timestamp: new Date(),
      ...context,
    };
    this.emit(name, event);
  }
}

export const eventBus = new PlatformEventBus();

// ─── Default Listeners ────────────────────────────────────────────────────────
// These listeners can be expanded in future phases to drive real-time updates,
// AI triggers, analytics pipelines, and webhook delivery.

eventBus.on(PlatformEvents.USER_REGISTERED, (event) => {
  // Future: send welcome email, trigger onboarding flow
  void event;
});

eventBus.on(PlatformEvents.PROJECT_CREATED, (event) => {
  // Future: initialize project memory, provision AI agent, set up storage bucket
  void event;
});

eventBus.on(PlatformEvents.DEPLOYMENT_FINISHED, (event) => {
  // Future: notify user via WebSocket, update DNS, warm CDN cache
  void event;
});

eventBus.on(PlatformEvents.AI_TASK_COMPLETED, (event) => {
  // Future: deliver AI output to client, update project files, record memory
  void event;
});
