/**
 * EvidenTrace - Deterministic Logger
 * 
 * Provides consistent, timestamped logging for evidentiary integrity.
 * All timestamps are in ISO 8601 UTC format.
 */

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from '../capture/capture.types.js';

@Injectable()
export class EvidenceLogger implements NestLoggerService {
  private logEntries: LogEntry[] = [];
  private acquisitionLogPath: string | null = null;

  /**
   * Get current UTC timestamp in ISO 8601 format.
   */
  static getUtcTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Set the acquisition-specific log file path.
   */
  setAcquisitionLogPath(logPath: string): void {
    this.acquisitionLogPath = logPath;
    this.logEntries = [];
  }

  /**
   * Get all log entries for the current acquisition.
   */
  getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Clear log entries (call after persisting to file).
   */
  clearLogEntries(): void {
    this.logEntries = [];
    this.acquisitionLogPath = null;
  }

  /**
   * Write log entries to the acquisition log file.
   */
  async persistLogs(): Promise<void> {
    if (this.acquisitionLogPath && this.logEntries.length > 0) {
      const logContent = JSON.stringify(this.logEntries, null, 2);
      await fs.promises.writeFile(this.acquisitionLogPath, logContent, 'utf-8');
    }
  }

  private createEntry(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, unknown>,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: EvidenceLogger.getUtcTimestamp(),
      level,
      message,
      ...(context && { context }),
    };
    
    this.logEntries.push(entry);
    return entry;
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const contextStr = entry.context 
      ? ` ${JSON.stringify(entry.context)}` 
      : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`;
  }

  log(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry('info', message, context);
    console.log(this.formatConsoleMessage(entry));
  }

  error(message: string, trace?: string, context?: Record<string, unknown>): void {
    const ctx = trace ? { ...context, trace } : context;
    const entry = this.createEntry('error', message, ctx);
    console.error(this.formatConsoleMessage(entry));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry('warn', message, context);
    console.warn(this.formatConsoleMessage(entry));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry('debug', message, context);
    console.debug(this.formatConsoleMessage(entry));
  }

  verbose(message: string, context?: Record<string, unknown>): void {
    // Map verbose to debug
    this.debug(message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    // Map fatal to error
    this.error(message, undefined, context);
  }
}

/**
 * Utility function to get system information.
 */
export function getSystemInfo(): {
  nodeVersion: string;
  operatingSystem: string;
  hostname: string;
  timezone: string;
  localSystemTime: string;
} {
  return {
    nodeVersion: process.version,
    operatingSystem: `${process.platform} ${process.arch}`,
    hostname: require('os').hostname(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localSystemTime: new Date().toString(),
  };
}

