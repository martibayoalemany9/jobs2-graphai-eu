/** Lowercase and strip combining marks so Czech/French/German titles share ASCII needles. */
export function foldText(s: string): string {
  return String(s || "")
    .replace(/ß/g, "ss")
    .replace(/ẞ/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
}
