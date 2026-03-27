import axios from "axios";

const REDITUS_API_BASE_URL = "https://api.getreditus.com/api";

export async function createReditusPayment({
  idempotency_key,
  referral_uid,
  referral_email,
  amount_cents,
  currency,
  subscription_id,
  interval,
  interval_count,
}) {
  const apiKey = process.env.REDITUS_API_KEY;
  if (!apiKey) return { skipped: true, reason: "missing_REDITUS_API_KEY" };

  const payload = {
    idempotency_key,
    amount: amount_cents,
    currency,
    ...(referral_uid ? { referral_uid: String(referral_uid) } : {}),
    ...(referral_email ? { referral_email } : {}),
    ...(subscription_id ? { subscription_id: String(subscription_id) } : {}),
    ...(interval ? { interval } : {}),
    ...(interval_count ? { interval_count } : {}),
  };

  const res = await axios.post(`${REDITUS_API_BASE_URL}/v1/payments`, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });

  return res.data;
}

