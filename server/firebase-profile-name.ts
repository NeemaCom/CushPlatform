type ExistingName = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
};

export type ProfileNamePatch = Partial<{
  firstName: string;
  lastName: string;
}>;

/**
 * Fill blank or placeholder name fields from the verified Firebase identity.
 * Never overwrite an established name with a provider profile edit.
 */
export function firebaseProfileNamePatch(
  current: ExistingName,
  displayName: string | null | undefined,
): ProfileNamePatch {
  const parts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return {};

  const currentFirst = current.firstName?.trim() ?? "";
  const currentLast = current.lastName?.trim() ?? "";
  const firstIsMissing = !currentFirst || currentFirst.toLowerCase() === "user";
  const patch: ProfileNamePatch = {};

  if (firstIsMissing) patch.firstName = parts[0].slice(0, 100);

  if (!currentLast && parts.length > 1 &&
      (firstIsMissing || parts[0].toLowerCase() === currentFirst.toLowerCase())) {
    patch.lastName = parts.slice(1).join(" ").slice(0, 100);
  }

  return patch;
}
