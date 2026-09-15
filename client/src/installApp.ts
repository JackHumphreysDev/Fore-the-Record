export function isIosDevice(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === 'MacIntel' && maxTouchPoints > 1)
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  appleStandalone: boolean | undefined,
): boolean {
  return displayModeStandalone || appleStandalone === true
}
