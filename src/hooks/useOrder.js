import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "@/api/menu.api";
import { menuKeys } from "./useMenu";

// The session poll — same pattern as yulo_restaurant's useCustomerOrder(orderId,
// { pollInterval }), but polled by table (session), not by a single order id: a guest can
// place more than one order in a visit (batches), and the status screen should show all
// of them plus the running total, not just the one just placed.
export function useGuestSession(restaurantId, tableId, { pollInterval = 0 } = {}) {
  return useQuery({
    queryKey: menuKeys.session(restaurantId, tableId),
    queryFn: () => menuApi.getSession(restaurantId, tableId).then((r) => r.data.data.session),
    enabled: !!restaurantId && !!tableId,
    refetchInterval: pollInterval || false,
    staleTime: 0,
  });
}

export function usePlaceOrder(restaurantId, tableId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => menuApi.placeOrder(restaurantId, tableId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.session(restaurantId, tableId) }),
  });
}

export function useCreateRequest(restaurantId) {
  return useMutation({
    mutationFn: ({ type, note, tableId }) => menuApi.createRequest(restaurantId, { type, note, tableId }),
  });
}
