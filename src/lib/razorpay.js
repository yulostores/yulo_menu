// Unlike yulostores_mobile (React Native, no in-app browser tab that can load a
// third-party script), this is a plain web page — Razorpay's own Checkout SDK can be
// loaded and opened directly, no hosted-page/redirect trip needed.

let scriptPromise = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the payment gateway. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export class RazorpayCancelledError extends Error {
  constructor() {
    super("Payment was cancelled");
    this.name = "RazorpayCancelledError";
  }
}

// razorpayOrder is the { id, amount, currency, keyId } object POST .../bill/pay returns
// once the server has a real gateway key configured (see payment.service.js's
// createRazorpayOrder).
export async function openRazorpayCheckout(razorpayOrder, { name, description } = {}) {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: razorpayOrder.keyId,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: name || "Yulo Stores",
      description,
      handler: (response) => {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new RazorpayCancelledError()),
      },
    });

    rzp.on("payment.failed", () => reject(new Error("Payment failed")));
    rzp.open();
  });
}
