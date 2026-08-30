import { describe, expect, it } from 'vitest'
import { findBestClubNameMatch } from '../src/clubNameMatch.js'

describe('findBestClubNameMatch', () => {
  it('prefers an exact match over a partial match', () => {
    const clubs = [
      { name: 'Example Golf Club and Resort' },
      { name: 'Example Golf Club' },
    ]

    expect(findBestClubNameMatch(clubs, 'example golf club')).toEqual(
      clubs[1],
    )
  })

  it('matches each word in a partial search regardless of spacing', () => {
    const clubs = [{ name: 'Sickleholme Golf Club' }]

    expect(findBestClubNameMatch(clubs, '  sickle   club ')).toEqual(clubs[0])
  })
})
