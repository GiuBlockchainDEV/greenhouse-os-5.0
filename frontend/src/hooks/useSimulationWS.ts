import { useCallback, useEffect, useRef } from "react";

import { expandBayArchTypes } from "@/lib/structureUtils";
import { useGreenhouseStore } from "@/store/useGreenhouseStore";
import type {
  WSConnectionStatus,
  WSIncomingMessage,
  WSUpdatePayload,
  WSSimulationResults,
} from "@/types/simulation";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const DEBOUNCE_MS = 150;

function buildWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/simulation`;
}

function buildUpdatePayload(): WSUpdatePayload {
  const state = useGreenhouseStore.getState();
  return {
    event: "UPDATE_SIMULATION",
    data: {
      location: {
        lat: state.location.lat,
        lon: state.location.lon,
        elevation_m: state.location.elevationM,
      },
      geometry: {
        length: state.dimensions.length,
        width: state.dimensions.width,
        ridge_height: state.dimensions.ridgeHeight,
        eave_height: state.dimensions.eaveHeight,
        bay_count: state.structure.bayCount,
        bay_width_m: state.structure.bayWidthM,
        arch_type: state.structure.archType,
        bay_arch_types: expandBayArchTypes(
          state.structure.bayCount,
          state.structure.archType,
        ),
      },
      materials: {
        covering_type: state.covering.type,
        transmittance: state.covering.transmittance,
        u_value: state.covering.uValue,
      },
      crop: {
        type: state.crop.type,
        system: state.crop.system,
        lai: state.crop.lai,
        growth_stage: state.crop.growthStage,
        layout: {
          tier_count: state.crop.layout.tierCount,
          gutter_length_m: state.crop.layout.gutterLengthM,
          plants_per_tier: state.crop.layout.plantsPerTier,
          plant_density: state.crop.layout.plantDensity,
          bed_line_count: state.crop.layout.bedLineCount,
          pathway_width_m: state.crop.layout.pathwayWidthM,
          side_clearance_m: state.crop.layout.sideClearanceM,
        },
      },
      equipment: {
        cooling: state.climateEquipment.cooling,
        heating: state.climateEquipment.heating,
        ventilation: state.climateEquipment.ventilation,
        sizing: {
          exhaust_fan_count: state.climateEquipment.sizing.exhaustFanCount,
          exhaust_fan_diameter_m: state.climateEquipment.sizing.exhaustFanDiameterM,
          roof_exhaust_fan_count: state.climateEquipment.sizing.roofExhaustFanCount,
          roof_exhaust_fan_diameter_m: state.climateEquipment.sizing.roofExhaustFanDiameterM,
          circulation_fan_count: state.climateEquipment.sizing.circulationFanCount,
          circulation_fan_diameter_m: state.climateEquipment.sizing.circulationFanDiameterM,
          pad_wall_width_m: state.climateEquipment.sizing.padWallWidthM,
          pad_wall_height_m: state.climateEquipment.sizing.padWallHeightM,
          ac_unit_count: state.climateEquipment.sizing.acUnitCount,
          ac_unit_width_m: state.climateEquipment.sizing.acUnitWidthM,
          roof_vent_count: state.climateEquipment.sizing.roofVentCount,
          roof_vent_width_m: state.climateEquipment.sizing.roofVentWidthM,
          side_vent_count: state.climateEquipment.sizing.sideVentCount,
          side_vent_height_m: state.climateEquipment.sizing.sideVentHeightM,
          heater_unit_count: state.climateEquipment.sizing.heaterUnitCount,
          pipe_row_count: state.climateEquipment.sizing.pipeRowCount,
          fog_line_count: state.climateEquipment.sizing.fogLineCount,
        },
      },
    },
  };
}

function isSimulationResults(msg: WSIncomingMessage): msg is WSSimulationResults {
  return msg.event === "SIMULATION_RESULTS";
}

export interface UseSimulationWSReturn {
  status: WSConnectionStatus;
  reconnect: () => void;
  sendUpdate: () => void;
}

export function useSimulationWS(): UseSimulationWSReturn {
  const status = useGreenhouseStore((s) => s.simulationStatus);
  const setSimulationStatus = useGreenhouseStore((s) => s.setSimulationStatus);
  const setSimulationResults = useGreenhouseStore((s) => s.setSimulationResults);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectMsRef = useRef(INITIAL_RECONNECT_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendUpdate = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(buildUpdatePayload()));
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    clearReconnectTimer();
    setSimulationStatus("disconnected");

    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current();
      reconnectMsRef.current = Math.min(reconnectMsRef.current * 2, MAX_RECONNECT_MS);
    }, reconnectMsRef.current);
  }, [clearReconnectTimer, setSimulationStatus]);

  const connectRef = useRef<() => void>(() => {});

  connectRef.current = () => {
    if (!mountedRef.current) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearReconnectTimer();
    setSimulationStatus("connecting");

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      reconnectMsRef.current = INITIAL_RECONNECT_MS;
      setSimulationStatus("connected");
      ws.send(JSON.stringify(buildUpdatePayload()));
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data) as WSIncomingMessage;
        if (isSimulationResults(parsed)) {
          setSimulationResults(parsed.data);
        }
      } catch {
        setSimulationStatus("error");
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setSimulationStatus("error");
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      scheduleReconnect();
    };
  };

  const reconnect = useCallback(() => {
    reconnectMsRef.current = INITIAL_RECONNECT_MS;
    wsRef.current?.close();
    connectRef.current();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectRef.current();

    const pingInterval = setInterval(() => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: "PING" }));
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(pingInterval);
      clearReconnectTimer();
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [clearReconnectTimer]);

  useEffect(() => {
    const unsubscribe = useGreenhouseStore.subscribe((state, prev) => {
      const changed =
        state.dimensions !== prev.dimensions ||
        state.structure !== prev.structure ||
        state.covering !== prev.covering ||
        state.crop !== prev.crop ||
        state.climateEquipment !== prev.climateEquipment ||
        state.location !== prev.location;

      if (!changed) return;

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        sendUpdate();
      }, DEBOUNCE_MS);
    });

    return () => unsubscribe();
  }, [sendUpdate]);

  return { status, reconnect, sendUpdate };
}
