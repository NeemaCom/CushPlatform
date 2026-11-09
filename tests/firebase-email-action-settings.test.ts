import { describe, expect, it } from 'vitest'
import { getFirebaseEmailActionSettings } from '../src/lib/firebase-email-action-settings'

describe('Firebase email action settings', () => {
  it('always returns production actions to the Cush app domain', () => {
    expect(getFirebaseEmailActionSettings(
      'passwordReset',
      'https://cushportal.firebaseapp.com',
      true,
    )).toEqual({
      url: 'https://app.we-cush.com/login?passwordReset=1',
    })
  })

  it('keeps local and preview actions on their current origin', () => {
    expect(getFirebaseEmailActionSettings(
      'emailVerified',
      'http://localhost:5000',
      false,
    )).toEqual({
      url: 'http://localhost:5000/login?emailVerified=1',
    })
  })
})
