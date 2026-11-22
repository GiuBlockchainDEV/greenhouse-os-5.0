import type {
  FertigationComponentCatalogItem,
  FertigationComponentDefaults,
  FertigationComponentKind,
} from "@/types/fertigation";

export const FERTIGATION_PROJECT_STORAGE_KEY = "growa-engineering-studio-v16-project";

export const FERTIGATION_BASE_SETTINGS = {
  ecSet: 1.8,
  phSet: 5.8,
  ecTolerance: 0.18,
  phTolerance: 0.28,
  qualityHoldS: 12,
  transferAuto: false,
  sourceAuto: true,
  autoMix: true,
  autoCrop: false,
  autoDose: false,
  sourceFillRate: 2.6,
  sourceFillTargetPct: 80,
  cropTargetPct: 70,
  temperatureC: 27,
  chemicalConcentrationGL: 75,
  acidEffect: 0.75,
  pipeWarningVelocity: 2.5,
} as const;

function defaultsRecord(
  values: FertigationComponentDefaults,
): FertigationComponentDefaults {
  return values;
}

export const FERTIGATION_COMPONENT_CATALOG: Record<
  FertigationComponentKind,
  FertigationComponentCatalogItem
> = {
  source: {
    kind: "source",
    nameKey: "components.source.name",
    categoryKey: "components.source.category",
    prefix: "SRC",
    glyph: "source",
    descriptionKey: "components.source.description",
    defaults: defaultsRecord({
      type: "well",
      availableFlow: 7.5,
      sourceEC: 0.55,
      sourcePH: 7.3,
      sourcePressure: 2.7,
      staticLevel: 18,
      dynamicLevel: 23,
    }),
  },
  filter: {
    kind: "filter",
    nameKey: "components.filter.name",
    categoryKey: "components.filter.category",
    prefix: "FIL",
    glyph: "filter",
    descriptionKey: "components.filter.description",
    defaults: defaultsRecord({
      nominalFlow: 10,
      cleanDP: 0.16,
      alarmDP: 0.75,
      fouling: 0.12,
    }),
  },
  tank: {
    kind: "tank",
    nameKey: "components.tank.name",
    categoryKey: "components.tank.category",
    prefix: "TK",
    glyph: "tank",
    descriptionKey: "components.tank.description",
    defaults: defaultsRecord({
      capacityL: 2500,
      initialPct: 65,
      lowPct: 13,
      highPct: 95,
      initialEC: 1.5,
      initialPH: 6.05,
    }),
  },
  pump: {
    kind: "pump",
    nameKey: "components.pump.name",
    categoryKey: "components.pump.category",
    prefix: "P",
    glyph: "pump",
    descriptionKey: "components.pump.description",
    defaults: defaultsRecord({
      flowDesign: 6,
      headM: 24,
      efficiency: 0.65,
      motorKW: 2.2,
      minimumFlow: 0.15,
      staticLiftM: 1.8,
    }),
  },
  valve: {
    kind: "valve",
    nameKey: "components.valve.name",
    categoryKey: "components.valve.category",
    prefix: "XV",
    glyph: "valve",
    descriptionKey: "components.valve.description",
    defaults: defaultsRecord({
      open: true,
      actuation: "automatic",
      failMode: "closed",
      kLoss: 2,
    }),
  },
  injector: {
    kind: "injector",
    nameKey: "components.injector.name",
    categoryKey: "components.injector.category",
    prefix: "INJ",
    glyph: "injector",
    descriptionKey: "components.injector.description",
    defaults: defaultsRecord({
      channels: 4,
      maxRateLh: 16,
      stockECPerL: 0.065,
      acidStrength: 1.0,
      chemicalLevels: [85, 84, 90, 75],
    }),
  },
  sensor: {
    kind: "sensor",
    nameKey: "components.sensor.name",
    categoryKey: "components.sensor.category",
    prefix: "AIT",
    glyph: "sensor",
    descriptionKey: "components.sensor.description",
    defaults: defaultsRecord({
      measurement: "ecph",
      sensorOk: true,
      delayS: 7,
    }),
  },
  flowmeter: {
    kind: "flowmeter",
    nameKey: "components.flowmeter.name",
    categoryKey: "components.flowmeter.category",
    prefix: "FIT",
    glyph: "flowmeter",
    descriptionKey: "components.flowmeter.description",
    defaults: defaultsRecord({
      rangeM3h: 12,
      sensorOk: true,
    }),
  },
  manifold: {
    kind: "manifold",
    nameKey: "components.manifold.name",
    categoryKey: "components.manifold.category",
    prefix: "MAN",
    glyph: "manifold",
    descriptionKey: "components.manifold.description",
    defaults: defaultsRecord({
      sectors: 8,
      sectorFlowM3h: 2.2,
      enabled: [true, true, false, false, false, false, false, false],
      valveFeedback: true,
    }),
  },
  crop: {
    kind: "crop",
    nameKey: "components.crop.name",
    categoryKey: "components.crop.category",
    prefix: "NFT",
    glyph: "crop",
    descriptionKey: "components.crop.description",
    defaults: defaultsRecord({
      system: "nft",
      areaM2: 350,
      channels: 24,
      uptakeLpd: 640,
      evaporationLpd: 50,
      residenceSeconds: 35,
    }),
  },
  return: {
    kind: "return",
    nameKey: "components.return.name",
    categoryKey: "components.return.category",
    prefix: "RET",
    glyph: "return",
    descriptionKey: "components.return.description",
    defaults: defaultsRecord({
      restricted: false,
      minorLossK: 3,
    }),
  },
  junction: {
    kind: "junction",
    nameKey: "components.junction.name",
    categoryKey: "components.junction.category",
    prefix: "J",
    glyph: "junction",
    descriptionKey: "components.junction.description",
    defaults: defaultsRecord({}),
  },
};

export const FERTIGATION_COMPONENT_KINDS = Object.keys(
  FERTIGATION_COMPONENT_CATALOG,
) as FertigationComponentKind[];