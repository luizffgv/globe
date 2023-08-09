/**
 * Maps a value from the range [0, 1] to the range [`from` , `to`].
 *
 * @param from - Range start.
 * @param to - Range end.
 * @param value - Value to interpolate.
 * @returns `from` if `value` is `0`, `to` if `value` is `1`, otherwise
 * something inbetween.
 */
export function lerp(from: number, to: number, value: number): number {
  return (1 - value) * from + to * value;
}

/**
 * Maps a value from the range [`from`, `to`] to the range [0, 1].
 *
 * @param from - Range start.
 * @param to - Range end.
 * @param value - Value to map.
 * @return `0` if `value` is `from`, `1` if value is `to`, otherwise something
 * inbetween.
 */
export function lerpInv(from: number, to: number, value: number): number {
  return (value - from) / (to - from);
}

/**
 * Remaps a value from a range to another.
 *
 * @param srcFrom - Start of the source range.
 * @param srcTo - End of the source range.
 * @param destFrom - Start of the destination range.
 * @param destTo - End of the destination range.
 * @param value - Value to remap.
 * @returns `lerpInv(srcFrom, srcTo, value)` but returning a value in the range
 * [`destFrom`, `destTo`] instead of [0, 1].
 */
export function remap(
  srcFrom: number,
  srcTo: number,
  destFrom: number,
  destTo: number,
  value: number
): number {
  return lerp(destFrom, destTo, lerpInv(srcFrom, srcTo, value));
}
