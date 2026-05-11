import type { UserId } from '@/model';
import type { Command } from './types';

export interface ModelEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly actorId: UserId;
  readonly command: Command;
  readonly payload: Command;
  readonly modelVersion: number;
}

export type Unsubscribe = () => void;
