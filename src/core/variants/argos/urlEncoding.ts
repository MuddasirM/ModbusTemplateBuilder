// Argos/Netbiter URL-encodes certain characters in <Point> name= and unit=
// attributes when storing XML internally (confirmed from production Netbiter
// XML exports: commas, slashes, colons, hashes and percent signs in point
// names and units come back encoded, e.g. "Battery SOC%2C Cabinet 1",
// "%25" for a "%" unit). No other element or variant uses this convention;
// buildXml/parseXml apply these only to Point name=/unit=.

/** Encodes a Point name=/unit= value for the XML file boundary. `%` is
 * encoded first so it can't double-encode the escapes added after it. */
export function encodeField(value: string): string {
  return value
    .replaceAll('%', '%25')
    .replaceAll(',', '%2C')
    .replaceAll('/', '%2F')
    .replaceAll(':', '%3A')
    .replaceAll('#', '%23');
}

/** Decodes a Point name=/unit= value read from the XML file boundary. Falls
 * back to the raw string on a malformed escape sequence: a bad value must
 * not crash the import. */
export function decodeField(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
