export function squeeze(string: string): string {
  return string.replaceAll(/\s+/g, " ").trim();
}
