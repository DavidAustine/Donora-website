import { useState, useEffect, useCallback } from "react";
import {
  bloodBankAPI,
  requestAPI,
  matchAPI,
  chatAPI,
  userAPI,
} from "../services/api";

// ─── Generic fetch hook ───────────────────────────────────────────────────────
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialLoad = useState(false);

  // silent=true means don't show spinner (used by polling)
  const refetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}

// ─── Blood stock hook ─────────────────────────────────────────────────────────
export function useStock() {
  const { data, loading, error, refetch, setData } = useFetch(
    bloodBankAPI.getStock
  );

  const updateStock = useCallback(
    async (bloodType, units) => {
      const updated = await bloodBankAPI.updateStock(bloodType, units);
      setData((prev) => {
        if (!prev) return [updated];
        const exists = prev.find((s) => s.bloodType === bloodType);
        if (exists)
          return prev.map((s) => (s.bloodType === bloodType ? updated : s));
        return [...prev, updated];
      });
      return updated;
    },
    [setData]
  );

  const stock = (data || []).map((s) => ({
    ...s,
    units: s.unitsAvailable,
    status:
      s.unitsAvailable < 5
        ? "critical"
        : s.unitsAvailable < 20
        ? "low"
        : "adequate",
  }));

  return { stock, loading, error, refetch, updateStock };
}

export function useNearbyRequests(lng, lat, radius = 10) {
  const fetcher = useCallback(
    () =>
      lng && lat
        ? requestAPI.getNearby(lng, lat, radius)
        : Promise.resolve([]),
    [lng, lat, radius]
  );
  const { data, loading, error, refetch } = useFetch(fetcher, [
    lng,
    lat,
    radius,
  ]);
  return { requests: data || [], loading, error, refetch };
}


// ─── Matches hook ─────────────────────────────────────────────────────────────
export function useMatches() {
  const { data, loading, error, refetch, setData } = useFetch(
    matchAPI.getMyMatches
  );
  // Poll every 10s for unread badge updates
  useEffect(() => {
    const iv = setInterval(() => refetch(true), 10000);
    return () => clearInterval(iv);
  }, [refetch]);

  const cancelMatch = useCallback(
    async (matchId) => {
      await matchAPI.cancelMatch(matchId);
      setData((prev) =>
        prev
          ? prev.map((m) =>
              m._id === matchId ? { ...m, status: "cancelled" } : m
            )
          : prev
      );
    },
    [setData]
  );

  return { matches: data || [], loading, error, refetch, cancelMatch };
}

// ─── Direct threads hook ──────────────────────────────────────────────────────
// Fetches DirectConversation threads — created when the mobile app messages
// a blood bank without a formal match. The blood bank web dashboard needs
// this so those conversations are visible on both sides.
export function useDirectThreads() {
  const { data, loading, error, refetch } = useFetch(
    chatAPI.getMyDirectThreads
  );
  // Poll at the same rate as useMatches so the sidebar stays in sync
  useEffect(() => {
    const iv = setInterval(() => refetch(true), 10000);
    return () => clearInterval(iv);
  }, [refetch]);

  return { threads: data || [], loading, error, refetch };
}

// ─── Chat hook ────────────────────────────────────────────────────────────────
// isDirect=true → fetches from /chat/direct/:threadId/messages and sends
// via chatAPI.sendDirectMessage so the backend auth check (Match vs
// DirectConversation) works correctly for each thread type.
export function useChat(matchId, isDirect = false) {
  const { data, loading, error, refetch, setData } = useFetch(
    () =>
      matchId
        ? isDirect
          ? chatAPI.getDirectThreadMessages(matchId)
          : chatAPI.getMessages(matchId)
        : Promise.resolve([]),
    [matchId, isDirect]
  );

  // Poll every 4s for near-realtime chat
  useEffect(() => {
    if (!matchId) return;
    const iv = setInterval(() => refetch(true), 4000);
    return () => clearInterval(iv);
  }, [matchId, refetch]);

  const sendMessage = useCallback(
    async (message) => {
      const newMsg = isDirect
        ? await chatAPI.sendDirectMessage(matchId, message)
        : await chatAPI.sendMessage(matchId, message);
      setData((prev) => {
        const arr = prev || [];
        if (arr.find((m) => m._id === newMsg._id)) return arr;
        return [...arr, newMsg];
      });
      return newMsg;
    },
    [matchId, isDirect, setData]
  );

  return { messages: data || [], loading, error, refetch, sendMessage };
}

// ─── Blood bank profile hook ──────────────────────────────────────────────────
// FIX: was calling bloodBankAPI.getMyBloodBank and returning raw data which
// didn't match the shape expected — some components used profile.name,
// others profile.bloodBank.name. Now normalised to always expose top-level name.
export function useProfile() {
  const { data, loading, error, refetch, setData } = useFetch(
    bloodBankAPI.getMyBloodBank
  );

  const updateProfile = useCallback(
    async (updates) => {
      const updated = await bloodBankAPI.updateMyBloodBank(updates);
      setData((prev) => ({
        ...prev,
        name: updated.name ?? prev?.name,
        phone: updated.phone ?? prev?.phone,
      }));
      return updated;
    },
    [setData]
  );

  // Normalise: /bloodbank/me returns the BloodBank document directly
  const profile = data
    ? {
        ...data,
        // Ensure name is always at top level
        name: data.name ?? data.bloodBank?.name,
        phone: data.phone ?? data.bloodBank?.phone,
      }
    : null;

  return { profile, loading, error, refetch, updateProfile };
}

// ─── Geolocation hook + push to backend ───────────────────────────────────────
// FIX: geolocation was only stored client-side. Blood bank nearby queries
// rely on the backend having the blood bank's current location.
// This hook now pushes the location to /users/location after acquiring it.
export function useGeolocation() {
  const [coords, setCoords] = useState({ lng: null, lat: null });
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        setCoords({ lng, lat });

        // Push location to backend so nearby queries work cross-device
        try {
          await userAPI.updateLocation(lng, lat);
        } catch (_) {
          // Non-fatal — nearby features may still work if backend
          // already has stored coordinates from registration
        }
      },
      (err) => setGeoError(err.message)
    );
  }, []);

  return { ...coords, geoError };
}
