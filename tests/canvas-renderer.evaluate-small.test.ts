import { describe, it, expect } from 'vitest'
import { evaluateSmall } from '../src/game/engine'

describe('canvas-renderer import resolution: evaluateSmall', () => {
  it('returns Won with winner X for a winning row', () => {
    expect(evaluateSmall(['X', 'X', 'X', 'O', 'O', null, null, null, null])).toEqual({ status: 'Won', winner: 'X' })
  })
})
