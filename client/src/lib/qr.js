// Normalizes a scanned QR string for the attendance API.
//
// The public Digital ID QR now encodes a URL (…/id/<token>) so phone cameras
// open the public page. The attendance scanner must still accept this URL AND
// remain backward compatible with raw tokens (old badges, barcode guns, manual
// entry). When the input is our public URL we extract the token; otherwise we
// pass it through unchanged.
export function normalizeScannedQR(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/\/id\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : s;
}

export default normalizeScannedQR;
