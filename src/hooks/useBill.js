import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "@/api/menu.api";
import { menuKeys } from "./useMenu";

// Polled while a payment might be in flight (the guest is looking at the Bill screen) so
// the total stays current if someone else at the table adds another round, and so
// bill.status flips to "paid" here the moment a webhook settles it even if the guest's
// own verify call never lands (see src/lib/razorpay.js).
export function useBill(restaurantId, tableId, { pollInterval = 0 } = {}) {
  return useQuery({
    queryKey: menuKeys.bill(restaurantId, tableId),
    queryFn: () => menuApi.getBill(restaurantId, tableId).then((r) => r.data.data.bill),
    enabled: !!restaurantId && !!tableId,
    refetchInterval: pollInterval || false,
    staleTime: 0,
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
