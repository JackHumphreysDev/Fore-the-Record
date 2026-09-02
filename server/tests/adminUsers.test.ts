import { describe, expect, it } from 'vitest'
import {
  AdminUserValidationError,
  parseAdminUserDetails,
  parseAdminUserStatus,
  parseDeleteConfirmation,
} from '../src/adminUsers.js'

describe('administrator user input', () => {
  it('normalizes a player name and email address', () => {
    expect(
      parseAdminUserDetails({
        name: '  Example   Player ',
        email: ' PLAYER@EXAMPLE.COM ',
      }),
    ).toEqual({
      name: 'Example Player',
      email: 'player@example.com',
    })
  })

  it('rejects incomplete or invalid player details', () => {
    expect(() => parseAdminUserDetails(null)).toThrow(
      new AdminUserValidationError('Player details are required'),
    )
    expect(() =>
      parseAdminUserDetails({ name: 'A', email: 'player@example.com' }),
    ).toThrow('Player name must be between 2 and 120 characters')
    expect(() =>
      parseAdminUserDetails({ name: 'Example Player', email: 'invalid' }),
    ).toThrow('Enter a valid player email address')
  })

  it('accepts only active and suspended account states', () => {
    expect(parseAdminUserStatus({ status: 'ACTIVE' })).toEqual({
      status: 'ACTIVE',
    })
    expect(parseAdminUserStatus({ status: 'SUSPENDED' })).toEqual({
      status: 'SUSPENDED',
    })
    expect(() => parseAdminUserStatus({ status: 'DELETED' })).toThrow(
      'Choose a valid account status',
    )
  })

  it('normalizes the typed deletion confirmation', () => {
    expect(parseDeleteConfirmation({
      confirmation: ' PLAYER@EXAMPLE.COM ',
    })).toBe('player@example.com')
    expect(() => parseDeleteConfirmation({})).toThrow(
      'Type the player email address to confirm permanent deletion',
    )
  })
})
