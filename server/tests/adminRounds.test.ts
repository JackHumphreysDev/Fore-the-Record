import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  transactionMock,
  roundFindUniqueMock,
  roundFindManyMock,
  roundUpdateMock,
  roundUpdateManyMock,
  roundDeleteMock,
  holeDeleteManyMock,
  holeCreateManyMock,
  userUpdateMock,
  auditCreateMock,
  reviewDeleteMock,
  submissionDeleteMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  roundFindUniqueMock: vi.fn(),
  roundFindManyMock: vi.fn(),
  roundUpdateMock: vi.fn(),
  roundUpdateManyMock: vi.fn(),
  roundDeleteMock: vi.fn(),
  holeDeleteManyMock: vi.fn(),
  holeCreateManyMock: vi.fn(),
  userUpdateMock: vi.fn(),
  auditCreateMock: vi.fn(),
  reviewDeleteMock: vi.fn(),
  submissionDeleteMock: vi.fn(),
}))

const transaction = {
  round: {
    findUnique: roundFindUniqueMock,
    findMany: roundFindManyMock,
    update: roundUpdateMock,
    updateMany: roundUpdateManyMock,
    delete: roundDeleteMock,
  },
  holeScore: { deleteMany: holeDeleteManyMock, createMany: holeCreateManyMock },
  user: { update: userUpdateMock },
  adminAuditLog: { create: auditCreateMock },
  scorecardReview: { delete: reviewDeleteMock },
  submission: { delete: submissionDeleteMock },
}

vi.mock('../src/database.js', () => ({
  prisma: { $transaction: transactionMock },
}))

import {
  AdminRoundError,
  deleteRoundAsAdmin,
  updateRoundAsAdmin,
} from '../src/adminRounds.js'

beforeEach(() => {
  for (const mock of Object.values(transaction).flatMap((group) => Object.values(group))) {
    mock.mockReset()
  }
  transactionMock.mockReset()
  transactionMock.mockImplementation((callback) => callback(transaction))
  roundFindManyMock.mockResolvedValue([])
  roundUpdateManyMock.mockResolvedValue({ count: 0 })
  userUpdateMock.mockResolvedValue({})
  auditCreateMock.mockResolvedValue({})
})

function scoredRound() {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    userId: '22222222-2222-4222-8222-222222222222',
    teeId: '44444444-4444-4444-8444-444444444444',
    datePlayed: new Date('2026-09-01T00:00:00.000Z'),
    timePlayed: null,
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    competitionName: null,
    competitionFormat: null,
    numberOfPlayers: null,
    grossScore: 90,
    weatherCondition: 'DRY',
    pccAdjustment: 0,
    scorecardStatus: 'VERIFIED',
    user: { handicapIndex: 10 },
    tee: { courseRating: 72, slopeRating: 113, par: 72 },
    holeScores: Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: 5,
    })),
  }
}

describe('updateRoundAsAdmin', () => {
  it('corrects all strokes and recalculates the round and handicap atomically', async () => {
    const existing = scoredRound()
    roundFindUniqueMock.mockResolvedValueOnce(existing)
    roundFindManyMock.mockResolvedValueOnce([{ id: existing.id, datePlayed: existing.datePlayed, scoreDifferential: 18, isAcceptable: true }])

    const result = await updateRoundAsAdmin({
      roundId: existing.id,
      administratorId: '11111111-1111-4111-8111-111111111111',
      body: {
        datePlayed: '2026-09-02',
        category: 'CASUAL',
        grossScore: 90,
        weatherCondition: 'DRY',
        pccAdjustment: 0,
        holeScores: existing.holeScores.map(({ holeNumber }) => ({ holeNumber, strokesTaken: 5 })),
      },
    })

    expect(result.handicapIndex).toBe(18)
    expect(holeDeleteManyMock).toHaveBeenCalledWith({ where: { roundId: existing.id } })
    expect(holeCreateManyMock).toHaveBeenCalled()
    expect(roundUpdateMock).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ grossScore: 90, scoreDifferential: 18, isAcceptable: true }),
    })
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: existing.userId },
      data: { handicapIndex: 18 },
    })
    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ROUND_UPDATED', targetId: existing.id }),
    })
  })

  it('rejects a total that does not match the 18 corrected scores', async () => {
    const existing = scoredRound()
    roundFindUniqueMock.mockResolvedValueOnce(existing)
    await expect(updateRoundAsAdmin({
      roundId: existing.id,
      administratorId: '11111111-1111-4111-8111-111111111111',
      body: {
        datePlayed: '2026-09-02', category: 'CASUAL', grossScore: 89,
        weatherCondition: 'DRY', pccAdjustment: 0,
        holeScores: existing.holeScores.map(({ holeNumber }) => ({ holeNumber, strokesTaken: 5 })),
      },
    })).rejects.toEqual(new AdminRoundError('validation', 'Enter valid round details. The gross total must equal all 18 hole scores.'))
    expect(roundUpdateMock).not.toHaveBeenCalled()
  })
})

describe('deleteRoundAsAdmin', () => {
  it('deletes the round and recalculates the handicap after typed confirmation', async () => {
    const existing = scoredRound()
    roundFindUniqueMock.mockResolvedValueOnce({
      id: existing.id, userId: existing.userId, datePlayed: existing.datePlayed,
      grossScore: 90, scoreDifferential: 18, scorecardReview: null,
      tee: { teeName: 'White', course: { name: 'Course', club: { name: 'Club' } } },
    })
    await expect(deleteRoundAsAdmin({
      roundId: existing.id,
      administratorId: '11111111-1111-4111-8111-111111111111',
      confirmation: 'DELETE',
    })).resolves.toEqual({ userId: existing.userId, handicapIndex: null })
    expect(roundDeleteMock).toHaveBeenCalledWith({ where: { id: existing.id } })
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: existing.userId }, data: { handicapIndex: null },
    })
    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ROUND_DELETED', targetId: existing.id }),
    })
  })
})
