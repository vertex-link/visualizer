// Define a unique key for the LoggingService

import {IService} from "@vertex-link/acs";

export const ILoggingServiceKey = Symbol.for("ILoggingService");

/**
 * Defines the available logging levels.
 * Ordered from most verbose (TRACE) to most critical (FATAL).
 */
export enum LogLevel {
    TRACE = 0, // Very detailed, for diagnosing specific parts of code.
    DEBUG = 1, // Information useful for debugging during development.
    INFO = 2,  // General information about application flow.
    WARN = 3,  // Indicates a potential problem or an unexpected situation.
    ERROR = 4, // An error occurred, but the application can potentially recover.
    FATAL = 5, // A critical error causing the application to terminate or become unstable.
    NONE = 6,  // Special level to disable all logging.
}

/**
 * Interface for the Logging Service.
 * Defines the contract for logging messages at various levels.
 */
export interface ILoggingService extends IService {
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;

    trace(message: string, ...optionalParams: unknown[]): void;
    debug(message: string, ...optionalParams: unknown[]): void;
    info(message: string, ...optionalParams: unknown[]): void;
    warn(message: string, ...optionalParams: unknown[]): void;
    error(message: string | Error, ...optionalParams: unknown[]): void;
    fatal(message: string | Error, ...optionalParams: unknown[]): void; // Often similar to error but implies more severity
}

/**
 * A console-based implementation of the Logging Service.
 */
export class ConsoleLoggingService implements ILoggingService {
    private currentLogLevel: LogLevel = LogLevel.INFO; // Default log level

    constructor(initialLogLevel: LogLevel = LogLevel.INFO) {
        this.currentLogLevel = initialLogLevel;
        // console.log(`ConsoleLoggingService initialized with level: ${LogLevel[this.currentLogLevel]}`);
    }

    public setLogLevel(level: LogLevel): void {
        // console.log(`Log level changed from ${LogLevel[this.currentLogLevel]} to ${LogLevel[level]}`);
        this.currentLogLevel = level;
    }

    public getLogLevel(): LogLevel {
        return this.currentLogLevel;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLogLevel;
    }

    private formatMessage(level: LogLevel, message: string | Error, ...optionalParams: unknown[]): unknown[] {
        const timestamp = new Date().toISOString();
        const levelString = LogLevel[level].padEnd(5); // TRACE, DEBUG, INFO , WARN , ERROR, FATAL

        const prefix = `[${timestamp}] [${levelString}]`;

        if (message instanceof Error) {
            return [prefix, message.message, ...optionalParams, '\nStack:', message.stack];
        }
        return [prefix, message, ...optionalParams];
    }

    public trace(message: string, ...optionalParams: unknown[]): void {
        if (this.shouldLog(LogLevel.TRACE)) {
            console.trace(...this.formatMessage(LogLevel.TRACE, message, ...optionalParams)); // console.trace includes stack
        }
    }

    public debug(message: string, ...optionalParams: unknown[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(...this.formatMessage(LogLevel.DEBUG, message, ...optionalParams));
        }
    }

    public info(message: string, ...optionalParams: unknown[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(...this.formatMessage(LogLevel.INFO, message, ...optionalParams));
        }
    }

    public warn(message: string, ...optionalParams: unknown[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(...this.formatMessage(LogLevel.WARN, message, ...optionalParams));
        }
    }

    public error(message: string | Error, ...optionalParams: unknown[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(...this.formatMessage(LogLevel.ERROR, message, ...optionalParams));
        }
    }

    public fatal(message: string | Error, ...optionalParams: unknown[]): void {
        if (this.shouldLog(LogLevel.FATAL)) {
            // For FATAL, we might want to ensure it's always highly visible,
            // essentially an alias for error in console but could have other side effects
            // in a more complex logger (e.g., sending an alert).
            console.error(...this.formatMessage(LogLevel.FATAL, message, ...optionalParams));
        }
    }
}
