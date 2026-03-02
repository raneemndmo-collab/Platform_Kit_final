// Rasid v6.4 — Shared CQRS Base Classes
import { BoundedMap } from '../bounded-collections';

export abstract class BaseCommand {
  readonly timestamp: Date = new Date();
  readonly correlationId: string = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}

export abstract class BaseQuery {
  readonly timestamp: Date = new Date();
  readonly correlationId: string = `qry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  constructor(
    public readonly tenantId: string,
  ) {}
}

export abstract class BaseEvent {
  readonly timestamp: Date = new Date();
  readonly correlationId: string = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ICommandHandler<T extends BaseCommand, R = void> {
  execute(command: T): Promise<R>;
}

export interface IQueryHandler<T extends BaseQuery, R = any> {
  execute(query: T): Promise<R>;
}

export interface IEventHandler<T extends BaseEvent> {
  handle(event: T): Promise<void>;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  correlationId: string;
  message?: string;
}

export interface QueryResult<T = unknown> {
  data: T;
  total?: number;
  correlationId?: string;
}

export class CommandBus {
  private handlers = new BoundedMap<string, ICommandHandler<any, any>>(500);

  register<T extends BaseCommand>(commandType: string, handler: ICommandHandler<T, unknown>) {
    this.handlers.set(commandType, handler);
  }

  async execute<T extends BaseCommand, R = void>(command: T): Promise<R> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) throw new Error(`No handler for ${command.constructor.name}`);
    return handler.execute(command);
  }
}

export class QueryBus {
  private handlers = new BoundedMap<string, IQueryHandler<any, any>>(500);

  register<T extends BaseQuery>(queryType: string, handler: IQueryHandler<T, unknown>) {
    this.handlers.set(queryType, handler);
  }

  async execute<T extends BaseQuery, R = any>(query: T): Promise<R> {
    const handler = this.handlers.get(query.constructor.name);
    if (!handler) throw new Error(`No handler for ${query.constructor.name}`);
    return handler.execute(query);
  }
}
