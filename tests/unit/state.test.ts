import { describe, it, expect } from 'vitest';
import { assertTransition } from '../../src/modules/appointments/appointment-state.js';
describe('appointment transitions', () => {
  for (const from of ['PENDING', 'SCHEDULED'] as const)
    for (const to of ['SCHEDULED', 'CANCELLED'] as const)
      it(`${from} -> ${to}`, () => expect(() => assertTransition(from, to)).not.toThrow());
  for (const to of ['SCHEDULED', 'CANCELLED'] as const)
    it(`CANCELLED cannot become ${to}`, () =>
      expect(() => assertTransition('CANCELLED', to)).toThrowError(
        expect.objectContaining({ code: 'INVALID_TRANSITION' }),
      ));
});
