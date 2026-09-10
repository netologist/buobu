export function formatAmountWithSymbol(amount: number, currency: string) {
  try {
    const formatter = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = formatter.formatToParts(amount);
    const number = parts
      .filter((part) => ["integer", "group", "decimal", "fraction"].includes(part.type))
      .map((part) => part.value)
      .join("");
    const symbol = parts.find((part) => part.type === "currency")?.value ?? currency;
    return `${number}${symbol}`;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
