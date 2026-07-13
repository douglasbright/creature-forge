import type { MovementInput } from '../animation/LocomotionController';

export class InputController {
  private readonly keys = new Set<string>();
  private enabled = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.keys.clear();
  }

  getInput(): MovementInput {
    if (!this.enabled) return { forward: 0, right: 0, run: false, turn: 0 };
    const forward = (this.has('KeyW', 'ArrowUp') ? 1 : 0) - (this.has('KeyS', 'ArrowDown') ? 1 : 0);
    const right = (this.has('KeyD', 'ArrowRight') ? 1 : 0) - (this.has('KeyA', 'ArrowLeft') ? 1 : 0);
    const turn = (this.has('KeyE') ? 1 : 0) - (this.has('KeyQ') ? 1 : 0);
    return { forward, right, run: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'), turn };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  private has(...codes: string[]): boolean {
    return codes.some((code) => this.keys.has(code));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    this.keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => this.keys.clear();
}
