export function updateCachedPassportMode<
  TPassport extends { mode: string },
>(
  current: { passport: TPassport },
  mode: TPassport["mode"],
): { passport: TPassport } {
  return {
    ...current,
    passport: {
      ...current.passport,
      mode,
    },
  };
}
