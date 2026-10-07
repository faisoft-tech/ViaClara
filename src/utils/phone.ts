// Profile mockup: masked phone display, e.g. "612345214" -> "6•• ••• 214"
// (first digit visible, middle digits hidden, last 3 digits visible).
export function maskPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 4) return digits;
  const first = digits[0];
  const last3 = digits.slice(-3);
  const maskedCount = digits.length - 4;
  const combined = first + '•'.repeat(maskedCount);
  const groups: string[] = [];
  for (let i = 0; i < combined.length; i += 3) groups.push(combined.slice(i, i + 3));
  groups.push(last3);
  return groups.join(' ');
}
