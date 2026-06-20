export function isAlreadyRegisteredInviteError(message: string): boolean {
  return message.toLowerCase().includes('already signed up')
}

/** Extract a user-facing message from Supabase PostgrestError or other thrown values */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const record = error as { message?: string; details?: string; hint?: string }
    if (record.message) return record.message
    if (record.details) return record.details
    if (record.hint) return record.hint
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
