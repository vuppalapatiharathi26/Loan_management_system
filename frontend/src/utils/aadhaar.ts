export const aadhaarDigits = (value: string) => value.replace(/\D/g, "").slice(0, 12);

// Formats partial or full Aadhaar digits as "XXXX XXXX XXXX"
export const formatAadhaar = (value: string) => {
  const d = aadhaarDigits(value);
  const p1 = d.slice(0, 4);
  const p2 = d.slice(4, 8);
  const p3 = d.slice(8, 12);
  return [p1, p2, p3].filter(Boolean).join(" ");
};

export const isValidAadhaarDigits = (value: string) => /^\d{12}$/.test(aadhaarDigits(value));

export const isValidAadhaarFormatted = (value: string) => /^\d{4} \d{4} \d{4}$/.test(value);
