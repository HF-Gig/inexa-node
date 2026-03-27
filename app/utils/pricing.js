export function getStandardPricing() {
  const firstPaymentAmountUSD = Number(process.env.FIRST_PAYMENT_AMOUNT) || 333;
  const quarterlyPaymentAmountUSD = Number(process.env.QUARTERLY_PAYMENT_AMOUNT) || 222;

  return { firstPaymentAmountUSD, quarterlyPaymentAmountUSD };
}
