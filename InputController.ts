import type { CreatureDefinition } from './types';
import { cloneJson } from '../utils/math';

export type StoreListener = (creature: CreatureDefinition, reason: string) => void;

export class CreatureStore {
  private creature: CreatureDefinition;
  private readonly undoStack: CreatureDefinition[] = [];
  private readonly redoStack: CreatureDefinition[] = [];
  private readonly listeners = new Set<StoreListener>();
  private transactionStart: CreatureDefinition | null = null;

  constructor(initial: CreatureDefinition) {
    this.creature = cloneJson(initial);
  }

  get value(): CreatureDefinition {
    return this.creature;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    listener(this.creature, 'initial');
    return () => this.listeners.delete(listener);
  }

  update(mutator: (draft: CreatureDefinition) => void, reason = 'edit'): void {
    const before = cloneJson(this.creature);
    const next = cloneJson(this.creature);
    mutator(next);
    this.creature = next;
    this.undoStack.push(before);
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit(reason);
  }

  replace(next: CreatureDefinition, reason = 'replace', recordHistory = true): void {
    if (recordHistory) {
      this.undoStack.push(cloneJson(this.creature));
      this.redoStack.length = 0;
    }
    this.creature = cloneJson(next);
    this.emit(reason);
  }

  beginTransaction(): void {
    if (!this.transactionStart) this.transactionStart = cloneJson(this.creature);
  }

  preview(mutator: (draft: CreatureDefinition) => void, reason = 'preview'): void {
    const next = cloneJson(this.creature);
    mutator(next);
    this.creature = next;
    this.emit(reason);
  }

  commitTransaction(reason = 'edit'): void {
    if (!this.transactionStart) return;
    this.undoStack.push(this.transactionStart);
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack.length = 0;
    this.transactionStart = null;
    this.emit(reason);
  }

  cancelTransaction(): void {
    if (!this.transactionStart) return;
    this.creature = this.transactionStart;
    this.transactionStart = null;
    this.emit('cancel');
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(cloneJson(this.creature));
    this.creature = previous;
    this.emit('undo');
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(cloneJson(this.creature));
    this.creature = next;
    this.emit('redo');
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  toJson(): string {
    return JSON.stringify(this.creature, null, 2);
  }

  fromJson(json: string): void {
    const parsed = JSON.parse(json) as CreatureDefinition;
    if (parsed.version !== 1 || !Array.isArray(parsed.body) || !Array.isArray(parsed.limbs)) {
      throw new Error('This file is not a supported Creature Forge creature.');
    }
    this.replace(parsed, 'load');
  }

  private emit(reason: string): void {
    for (const listener of this.listeners) listener(this.creature, reason);
  }
}
