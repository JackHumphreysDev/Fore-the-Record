type NamedClub = {
  name: string
}

export function normalizeClubName(clubName: string): string {
  return clubName.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getClubNameSearchTerms(clubName: string): string[] {
  return normalizeClubName(clubName).split(' ').filter(Boolean)
}

export function findBestClubNameMatch<T extends NamedClub>(
  clubs: readonly T[],
  searchQuery: string,
): T | undefined {
  const normalizedQuery = normalizeClubName(searchQuery)
  const searchTerms = getClubNameSearchTerms(searchQuery)

  if (normalizedQuery === '') {
    return undefined
  }

  return clubs.reduce<
    { club: T; matchType: number; extraCharacters: number } | undefined
  >((bestMatch, club) => {
    const normalizedName = normalizeClubName(club.name)

    if (!searchTerms.every((term) => normalizedName.includes(term))) {
      return bestMatch
    }

    // Rank exact names first, then progressively looser partial matches.
    const matchType =
      normalizedName === normalizedQuery
        ? 0
        : normalizedName.startsWith(normalizedQuery)
          ? 1
          : normalizedName.includes(normalizedQuery)
            ? 2
            : 3
    const extraCharacters = Math.abs(
      normalizedName.length - normalizedQuery.length,
    )

    if (
      !bestMatch ||
      matchType < bestMatch.matchType ||
      (matchType === bestMatch.matchType &&
        extraCharacters < bestMatch.extraCharacters)
    ) {
      return { club, matchType, extraCharacters }
    }

    return bestMatch
  }, undefined)?.club
}
