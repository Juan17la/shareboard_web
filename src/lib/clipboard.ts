/**
 * Copying text.
 *
 * `navigator.clipboard` needs a secure context, which a LAN address served over
 * plain HTTP is not — and that is exactly how this app gets used in a classroom
 * during development. So there is a fallback: a hidden textarea and the legacy
 * `execCommand('copy')`, which still works everywhere the modern API does not.
 */
export async function copyText(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall through: a denied permission or an insecure context both land here.
  }

  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('Copy was refused');
}
