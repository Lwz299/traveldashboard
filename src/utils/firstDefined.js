/**
 * Read the first own property in `keys` whose value is usable.
 * Common for ASP.NET-style camelCase / PascalCase payloads.
 */

/** @param {object} obj */
export function firstDefined(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null) return v
    }
  }
  return undefined
}

/** Same as {@link firstDefined} but treats empty string as missing. */
export function firstDefinedNonEmpty(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return undefined
}
