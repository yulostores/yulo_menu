import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "@/api/menu.api";
import { menuKeys } from "./useMenu";

// Polled while a payment might be in flight (the guest is looking at the Bill screen) so
// the total stays current if someone else at the table adds another round, and so a bill
// settled by a webhook — even if the guest's own verify call never lands — is noticed.
//
// The endpoint answers 404 once the sitting has closed (paid) or before anything was
// ordered; that is "no bill to show", not an error — the screen then asks the payment
// status endpoint whether it was just paid. `pollInterval` is ms, or 0/false to stop.
export function useBill(restaurantId, tableId, { pollInterval = 0 } = {}) {
  return useQuery({
    queryKey: menuKeys.bill(restaurantId, tableId),
    queryFn: () =>
      menuApi
        .getBill(restaurantId, tableId)
        .then((r) => r.data.data.bill)
        .catch((err) => {
          if (err?.status === 404) return null;
          throw err;
        }),
    enabled: !!restaurantId && !!tableId,
    refetchInterval: pollInterval || false,
    staleTime: 0,
  });
}

// The public app switches. Only payments.paymentSimulationEnabled is read here — the
// simulated stand-in is used only when the server says it may be.
export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: () => menuApi.getAppConfig().then((r) => r.data.data.config ?? {}),
    staleTime: 5 * 60_000,
  });
}

export function usePayBill(restaurantId, tableId) {
  return useMutation({
    mutationFn: () => menuApi.payBill(restaurantId, tableId).then((r) => r.data.data),
  });
}

export function usePayBillSimulate(restaurantId, tableId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => menuApi.payBillSimulate(restaurantId, tableId).then((r) => r.data.data.bill),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.bill(restaurantId, tableId) }),
  });
}

export function useVerifyBillPayment(restaurantId, tableId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signature) =>
      menuApi.verifyBillPayment(restaurantId, tableId, signature).then((r) => r.data.data.bill),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.bill(restaurantId, tableId) }),
  });
}

export function useCancelBillPayment(restaurantId, tableId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => menuApi.cancelBillPayment(restaurantId, tableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.bill(restaurantId, tableId) }),
  });
}

// One read of where a payment stands (see menuApi.getBillPaymentStatus) — the Bill screen
// calls it in its own confirm loop rather than as a polled query, because it decides
// after each answer whether to keep asking.
export function fetchBillPaymentStatus(restaurantId, tableId, razorpayOrderId) {
  return menuApi
    .getBillPaymentStatus(restaurantId, tableId, razorpayOrderId)
    .then((r) => r.data.data.bill ?? null);
}
