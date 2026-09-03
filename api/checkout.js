const APPROVED = 'APPROVED_FOR_LIMITED_PILOT';

function approvalState(env = process.env) {
  const status = env.QA_MARKET_STATUS || 'BLOCKED';
  const approvalDigest = env.QA_APPROVAL_RECORD_SHA256 || '';
  const checkoutUrl = env.STRIPE_CHECKOUT_URL || '';

  const digestValid = /^[a-f0-9]{64}$/i.test(approvalDigest);
  const checkoutValid = /^https:\/\/buy\.stripe\.com\//i.test(checkoutUrl);
  const approved = status === APPROVED && digestValid && checkoutValid;

  return {
    approved,
    status,
    approvalDigestPresent: digestValid,
    checkoutConfigured: checkoutValid,
    reason: approved
      ? 'limited_pilot_approved'
      : 'checkout_locked_pending_independent_relay_qa_approval',
  };
}

function handler(req, res) {
  const state = approvalState();

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'GET') {
    return res.status(state.approved ? 200 : 423).json({
      product: 'Outcome Economics Intelligence — Founding Pilot',
      plannedPriceAud: 49,
      paymentAccepted: state.approved,
      marketStatus: state.status,
      approvalEvidenceBound: state.approvalDigestPresent,
      checkoutConfigured: state.checkoutConfigured,
      reason: state.reason,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!state.approved) {
    return res.status(423).json({
      error: 'paid_launch_blocked',
      marketStatus: state.status,
      paymentAccepted: false,
      reason: state.reason,
    });
  }

  // Simplest viable payment path: redirect only after all independent-gate
  // assertions are present. No Stripe secret is required or handled here.
  res.setHeader('Location', process.env.STRIPE_CHECKOUT_URL);
  return res.status(303).end();
}

module.exports = handler;
module.exports.approvalState = approvalState;
module.exports.APPROVED = APPROVED;
