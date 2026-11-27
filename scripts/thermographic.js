const MODULE_ID = "earthdawn-thermographic-vision";

const FALLOFF_MODES = ["flat", "linear", "quadratic", "exponential"];

const DEFAULTS = {
  range: 60,
  throughWalls: true,
  falloffMode: "quadratic",
  falloffStrength: 1.0,
  envColor: "#102342",
  detectPrimaryColor: "#ff6a00",
  detectHotColor: "#fff37a",
  intensity: 0.7,

  detectNonLiving: true,
  nonLivingPrimaryColor: "#b83dff",
  nonLivingHotColor: "#ff9ef0",

  detectDead: true,
  deadPrimaryColor: "#2b7a78",
  deadHotColor: "#7be0ad",

  detectHorrorSpirit: true,
  horrorSpiritPrimaryColor: "#9d0208",
  horrorSpiritHotColor: "#ff5400"
};

/**
 * Fragment shader GLSL pour la vision thermographique WebGL.
 */
const THERMO_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec3 uEnvColor;
uniform float uIntensity;
uniform vec2 uViewerScreenPos;
uniform float uRangeScreenPx;
uniform float uFalloffStrength;
uniform vec2 uResolution;
uniform float uTime;

void main(void) {
  vec4 texColor = texture2D(uSampler, vTextureCoord);

  float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  float pulse = 1.0 + 0.025 * sin(uTime * 3.0);

  vec2 fragCoordPx = vTextureCoord * uResolution;
  float distPx = distance(fragCoordPx, uViewerScreenPos);
  float normDist = clamp(distPx / max(uRangeScreenPx, 1.0), 0.0, 1.0);
  float decay = pow(1.0 - normDist, max(uFalloffStrength, 0.0));
  float inRangeFactor = (1.0 - smoothstep(uRangeScreenPx * 0.92, uRangeScreenPx, distPx)) * decay;

  vec3 coldEnv = mix(uEnvColor * (0.35 + 0.85 * luma), uEnvColor, 0.45);
  vec3 thermalTint = mix(coldEnv, coldEnv * 1.25 + vec3(0.08, 0.04, 0.0), inRangeFactor * 0.35);

  float ringDist = abs(distPx - uRangeScreenPx);
  float ringGlow = (1.0 - smoothstep(0.0, 4.0, ringDist)) * 0.45 * pulse;
  thermalTint += vec3(0.9, 0.45, 0.15) * ringGlow;

  vec3 finalRgb = mix(texColor.rgb, thermalTint, clamp(uIntensity * pulse, 0.0, 0.95));
  gl_FragColor = vec4(finalRgb, texColor.a);
}
`;

/**
 * Enregistre les paramètres globaux du module.
 */
Hooks.once("init", () => {
  const registerSetting = (key, opts) => game.settings.register(MODULE_ID, key, opts);

  registerSetting("defaultRange", {
    name: "EDTHERMO.SettingDefaultRange",
    hint: "EDTHERMO.SettingDefaultRangeHint",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULTS.range
  });

  registerSetting("defaultThroughWalls", {
    name: "EDTHERMO.SettingDefaultThroughWalls",
    hint: "EDTHERMO.SettingDefaultThroughWallsHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: DEFAULTS.throughWalls
  });

  registerSetting("defaultFalloffMode", {
    name: "EDTHERMO.SettingDefaultFalloffMode",
    scope: "world",
    config: true,
    type: String,
    choices: {
      flat: "EDTHERMO.FalloffFlat",
      linear: "EDTHERMO.FalloffLinear",
      quadratic: "EDTHERMO.FalloffQuadratic",
      exponential: "EDTHERMO.FalloffExponential"
    },
    default: DEFAULTS.falloffMode
  });

  registerSetting("defaultFalloffStrength", {
    name: "EDTHERMO.SettingDefaultFalloffStrength",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0.0, max: 2.5, step: 0.1 },
    default: DEFAULTS.falloffStrength
  });

  registerSetting("defaultEnvColor", {
    name: "EDTHERMO.SettingDefaultEnvColor",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.envColor
  });

  registerSetting("defaultDetectPrimaryColor", {
    name: "EDTHERMO.SettingDefaultDetectPrimary",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.detectPrimaryColor
  });

  registerSetting("defaultDetectHotColor", {
    name: "EDTHERMO.SettingDefaultDetectHot",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.detectHotColor
  });

  registerSetting("defaultIntensity", {
    name: "EDTHERMO.SettingDefaultIntensity",
    hint: "EDTHERMO.SettingDefaultIntensityHint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0.1, max: 1.0, step: 0.05 },
    default: DEFAULTS.intensity
  });

  registerSetting("defaultDetectNonLiving", {
    name: "EDTHERMO.SettingDefaultDetectNonLiving",
    scope: "world",
    config: true,
    type: Boolean,
    default: DEFAULTS.detectNonLiving
  });

  registerSetting("defaultNonLivingPrimaryColor", {
    name: "EDTHERMO.SettingDefaultNonLivingPrimary",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.nonLivingPrimaryColor
  });

  registerSetting("defaultNonLivingHotColor", {
    name: "EDTHERMO.SettingDefaultNonLivingHot",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.nonLivingHotColor
  });

  registerSetting("defaultDetectDead", {
    name: "EDTHERMO.SettingDefaultDetectDead",
    scope: "world",
    config: true,
    type: Boolean,
    default: DEFAULTS.detectDead
  });

  registerSetting("defaultDeadPrimaryColor", {
    name: "EDTHERMO.SettingDefaultDeadPrimary",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.deadPrimaryColor
  });

  registerSetting("defaultDeadHotColor", {
    name: "EDTHERMO.SettingDefaultDeadHot",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.deadHotColor
  });

  registerSetting("defaultDetectHorrorSpirit", {
    name: "EDTHERMO.SettingDefaultDetectHorrorSpirit",
    scope: "world",
    config: true,
    type: Boolean,
    default: DEFAULTS.detectHorrorSpirit
  });

  registerSetting("defaultHorrorSpiritPrimaryColor", {
    name: "EDTHERMO.SettingDefaultHorrorSpiritPrimary",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.horrorSpiritPrimaryColor
  });

  registerSetting("defaultHorrorSpiritHotColor", {
    name: "EDTHERMO.SettingDefaultHorrorSpiritHot",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULTS.horrorSpiritHotColor
  });
});

/**
 * Récupère la configuration thermographique effective d'un TokenDocument.
 */
function getTokenThermoConfig(tokenDoc) {
  const flags = tokenDoc?.flags?.[MODULE_ID] ?? {};
  const enabled = Boolean(flags.enabled);
  const rawRange = Number(flags.range);
  const defaultRange = Number(game.settings.get(MODULE_ID, "defaultRange")) || DEFAULTS.range;
  const range = rawRange > 0 ? rawRange : defaultRange;

  const resolveBool = (flagVal, settingKey, fallback) =>
    typeof flagVal === "boolean"
      ? flagVal
      : Boolean(game.settings.get(MODULE_ID, settingKey) ?? fallback);

  const resolveStr = (flagVal, settingKey, fallback) =>
    flagVal || game.settings.get(MODULE_ID, settingKey) || fallback;

  const falloffMode = FALLOFF_MODES.includes(flags.falloffMode)
    ? flags.falloffMode
    : FALLOFF_MODES.includes(game.settings.get(MODULE_ID, "defaultFalloffMode"))
      ? game.settings.get(MODULE_ID, "defaultFalloffMode")
      : DEFAULTS.falloffMode;

  const falloffStrength =
    typeof flags.falloffStrength === "number" && !Number.isNaN(flags.falloffStrength)
      ? Math.min(2.5, Math.max(0.0, flags.falloffStrength))
      : Number(game.settings.get(MODULE_ID, "defaultFalloffStrength")) ?? DEFAULTS.falloffStrength;

  return {
    enabled,
    range,
    throughWalls: resolveBool(
      flags.throughWalls,
      "defaultThroughWalls",
      DEFAULTS.throughWalls
    ),
    falloffMode,
    falloffStrength,
    envColor: resolveStr(flags.envColor, "defaultEnvColor", DEFAULTS.envColor),
    detectPrimaryColor: resolveStr(
      flags.detectPrimaryColor,
      "defaultDetectPrimaryColor",
      DEFAULTS.detectPrimaryColor
    ),
    detectHotColor: resolveStr(
      flags.detectHotColor,
      "defaultDetectHotColor",
      DEFAULTS.detectHotColor
    ),
    intensity:
      typeof flags.intensity === "number" && !Number.isNaN(flags.intensity)
        ? Math.min(1, Math.max(0.05, flags.intensity))
        : Number(game.settings.get(MODULE_ID, "defaultIntensity")) || DEFAULTS.intensity,

    detectNonLiving: resolveBool(
      flags.detectNonLiving,
      "defaultDetectNonLiving",
      DEFAULTS.detectNonLiving
    ),
    nonLivingPrimaryColor: resolveStr(
      flags.nonLivingPrimaryColor,
      "defaultNonLivingPrimaryColor",
      DEFAULTS.nonLivingPrimaryColor
    ),
    nonLivingHotColor: resolveStr(
      flags.nonLivingHotColor,
      "defaultNonLivingHotColor",
      DEFAULTS.nonLivingHotColor
    ),

    detectDead: resolveBool(flags.detectDead, "defaultDetectDead", DEFAULTS.detectDead),
    deadPrimaryColor: resolveStr(
      flags.deadPrimaryColor,
      "defaultDeadPrimaryColor",
      DEFAULTS.deadPrimaryColor
    ),
    deadHotColor: resolveStr(flags.deadHotColor, "defaultDeadHotColor", DEFAULTS.deadHotColor),

    detectHorrorSpirit: resolveBool(
      flags.detectHorrorSpirit,
      "defaultDetectHorrorSpirit",
      DEFAULTS.detectHorrorSpirit
    ),
    horrorSpiritPrimaryColor: resolveStr(
      flags.horrorSpiritPrimaryColor,
      "defaultHorrorSpiritPrimaryColor",
      DEFAULTS.horrorSpiritPrimaryColor
    ),
    horrorSpiritHotColor: resolveStr(
      flags.horrorSpiritHotColor,
      "defaultHorrorSpiritHotColor",
      DEFAULTS.horrorSpiritHotColor
    )
  };
}

/**
 * Calcule la décroissance en fonction de la distance normalisée (0 = proche, 1 = bord de portée).
 * Retourne un facteur de présence/chaleur entre 0.0 et 1.0 (1.0 = maximum près de l'observateur).
 */
function computeDistanceFalloff(normDist, mode, strength) {
  const d = Math.min(1, Math.max(0, normDist));
  if (mode === "flat" || strength <= 0) return 1.0;

  let baseDecay;
  switch (mode) {
    case "linear":
      baseDecay = 1.0 - d;
      break;
    case "exponential":
      baseDecay = Math.exp(-3.2 * d);
      break;
    case "quadratic":
    default:
      baseDecay = Math.pow(1.0 - d, 2);
      break;
  }

  return Math.min(1.0, Math.max(0.05, Math.pow(Math.max(0, baseDecay), strength)));
}

/**
 * Vérifie si un point cible est visible depuis l'observateur en tenant compte des murs
 * bloquant la vision (compatible Foundry v12 et v13).
 */
function hasLineOfSight(originPt, targetPt, throughWalls) {
  if (throughWalls) return true;
  if (!canvas?.ready) return true;

  const backend = CONFIG.Canvas?.polygonBackends?.sight;
  if (backend?.testCollision) {
    const blocked = backend.testCollision(originPt, targetPt, {
      type: "sight",
      mode: "any"
    });
    return !blocked;
  }

  const losPolygon = canvas.effects?.vision?.los;
  if (losPolygon && typeof losPolygon.contains === "function") {
    return losPolygon.contains(targetPt.x, targetPt.y);
  }

  return true;
}

/**
 * Détermine si un token est marqué comme source de chaleur non vivante.
 */
function isNonLivingHeatToken(tokenPlaceable) {
  return Boolean(tokenPlaceable?.document?.flags?.[MODULE_ID]?.isNonLivingHeatSource);
}

/**
 * Détermine si une lumière ambiante est marquée comme source de chaleur non vivante.
 */
function isNonLivingHeatLight(lightPlaceable) {
  return Boolean(lightPlaceable?.document?.flags?.[MODULE_ID]?.isNonLivingHeatSource);
}

/**
 * Détermine si un token représente une Horreur, un Esprit ou une entité astrale d'Earthdawn.
 */
function isHorrorSpiritToken(tokenPlaceable) {
  const doc = tokenPlaceable?.document;
  if (!doc) return false;

  if (doc.flags?.[MODULE_ID]?.isHorrorSpirit) return true;

  const actor = tokenPlaceable.actor;
  const actorType = String(actor?.type ?? "").toLowerCase();
  const creatureType = String(
    actor?.system?.details?.type?.value ??
      actor?.system?.creatureType ??
      actor?.system?.type ??
      ""
  ).toLowerCase();
  const nameText = String(actor?.name ?? doc.name ?? "").toLowerCase();

  const keywords = ["horror", "horreur", "spirit", "esprit", "astral", "phantom", "wraith"];
  return keywords.some(
    (kw) => actorType.includes(kw) || creatureType.includes(kw) || nameText.includes(kw)
  );
}

/**
 * Détermine si un token représente une créature morte.
 */
function isDeadCreatureToken(tokenPlaceable) {
  const doc = tokenPlaceable?.document;
  if (!doc) return false;

  if (doc.flags?.[MODULE_ID]?.isDeadCreature) return true;
  if (doc.overlayEffect?.includes("skull") || doc.overlayEffect?.includes("dead")) return true;

  const statuses = doc.statuses;
  if (statuses instanceof Set && (statuses.has("dead") || statuses.has("defeated"))) {
    return true;
  }

  const actor = tokenPlaceable.actor;
  const hpValue =
    actor?.system?.attributes?.hp?.value ??
    actor?.system?.damage?.value ??
    actor?.system?.health?.value;
  if (typeof hpValue === "number" && hpValue <= 0) {
    return true;
  }

  return false;
}

/**
 * Interpole une couleur hexadécimale entre une teinte chaude (0.0) et une teinte de base (1.0).
 */
function interpolateColor(hotHex, primaryHex, t) {
  const clamped = Math.min(1, Math.max(0, t));
  const cHot = PIXI.Color.shared.setValue(hotHex).toRgb();
  const cPri = PIXI.Color.shared.setValue(primaryHex).toRgb();

  const r = Math.round(cHot.r * (1 - clamped) + cPri.r * clamped);
  const g = Math.round(cHot.g * (1 - clamped) + cPri.g * clamped);
  const b = Math.round(cHot.b * (1 - clamped) + cPri.b * clamped);

  return PIXI.Color.shared.setValue({ r, g, b }).toNumber();
}

/**
 * Convertit un hex (#rrggbb) en tableau [r, g, b] normalisé (0.0 - 1.0) pour le shader GLSL.
 */
function hexToVec3(hex) {
  const rgb = PIXI.Color.shared.setValue(hex).toRgb();
  return [rgb.r, rgb.g, rgb.b];
}

/**
 * Récupère le token observateur actif avec vision thermographique activée.
 */
function getActiveThermoViewer() {
  if (!canvas?.ready || !canvas.tokens) return null;

  for (const t of canvas.tokens.controlled ?? []) {
    const cfg = getTokenThermoConfig(t.document);
    if (cfg.enabled) return { token: t, config: cfg };
  }

  if (!game.user.isGM) {
    for (const t of canvas.tokens.placeables.filter((p) => p.actor?.isOwner)) {
      const cfg = getTokenThermoConfig(t.document);
      if (cfg.enabled) return { token: t, config: cfg };
    }
  }

  return null;
}

/**
 * Moteur de rendu combinant le filtre WebGL (PIXI.Filter) et les signatures thermiques.
 */
class ThermographicEngine {
  constructor() {
    this.filter = null;
    this.filteredTargets = [];
    this.overlayContainer = null;
    this.signaturesGraphics = null;
    this.startTime = performance.now();
  }

  ensureFilter() {
    if (!this.filter) {
      const envVec = hexToVec3(DEFAULTS.envColor);
      this.filter = new PIXI.Filter(undefined, THERMO_FRAGMENT_SHADER, {
        uEnvColor: envVec,
        uIntensity: DEFAULTS.intensity,
        uViewerScreenPos: [0, 0],
        uRangeScreenPx: 150,
        uFalloffStrength: DEFAULTS.falloffStrength,
        uResolution: [window.innerWidth || 1920, window.innerHeight || 1080],
        uTime: 0
      });
    }
    return this.filter;
  }

  attachFilterToScene() {
    if (!canvas?.ready || !canvas.stage) return;
    const filter = this.ensureFilter();

    const candidates = [canvas.primary, canvas.environment, canvas.stage].filter(Boolean);
    for (const target of candidates) {
      if (!target.filters) target.filters = [];
      if (!target.filters.includes(filter)) {
        target.filters = [...target.filters, filter];
        this.filteredTargets.push(target);
      }
      break;
    }
  }

  detachFilterFromScene() {
    if (!this.filter) return;
    for (const target of this.filteredTargets) {
      if (target && !target.destroyed && Array.isArray(target.filters)) {
        target.filters = target.filters.filter((f) => f !== this.filter);
      }
    }
    this.filteredTargets = [];
  }

  ensureSignaturesLayer() {
    if (!canvas?.ready || !canvas.stage) return null;
    if (!this.overlayContainer || this.overlayContainer.destroyed) {
      this.overlayContainer = new PIXI.Container();
      this.overlayContainer.name = "ed-thermographic-signatures";
      this.overlayContainer.eventMode = "none";

      this.signaturesGraphics = new PIXI.Graphics();
      this.overlayContainer.addChild(this.signaturesGraphics);

      const parent = canvas.interface ?? canvas.stage;
      parent.addChildAt(this.overlayContainer, 0);
    }
    return this.overlayContainer;
  }

  clear() {
    this.detachFilterFromScene();
    if (this.overlayContainer && !this.overlayContainer.destroyed) {
      this.signaturesGraphics.clear();
      this.overlayContainer.visible = false;
    }
  }

  drawSignature(
    g,
    center,
    baseRadius,
    hotHex,
    primaryHex,
    normDist,
    falloffFactor,
    intensity,
    styleType = "living"
  ) {
    // 0 = chaud/proche, 1 = froid/éloigné
    const colorMixT = 1.0 - falloffFactor;
    const color = interpolateColor(hotHex, primaryHex, colorMixT);
    const radius = baseRadius * (0.65 + 0.35 * falloffFactor);
    const alphaStroke = Math.min(0.95, (intensity + 0.25) * (0.35 + 0.65 * falloffFactor));
    const alphaFill = intensity * 0.34 * (0.25 + 0.75 * falloffFactor);

    if (styleType === "nonLiving") {
      g.lineStyle(2.5, color, alphaStroke);
      g.beginFill(color, alphaFill);
      g.moveTo(center.x, center.y - radius * 1.15);
      g.lineTo(center.x + radius * 1.15, center.y);
      g.lineTo(center.x, center.y + radius * 1.15);
      g.lineTo(center.x - radius * 1.15, center.y);
      g.closePath();
      g.endFill();
    } else if (styleType === "dead") {
      g.lineStyle(2, color, alphaStroke * 0.85);
      g.beginFill(color, alphaFill * 0.75);
      g.drawCircle(center.x, center.y, radius);
      g.endFill();

      g.lineStyle(1.5, color, alphaStroke * 0.65);
      g.drawCircle(center.x, center.y, radius * 1.25);
    } else if (styleType === "horrorSpirit") {
      // Motif prismatique / étoile à 4 branches pour Horreurs et Esprits
      const outer = radius * 1.3;
      const inner = radius * 0.55;
      g.lineStyle(2.5, color, alphaStroke);
      g.beginFill(color, alphaFill);
      g.moveTo(center.x, center.y - outer);
      g.lineTo(center.x + inner, center.y - inner);
      g.lineTo(center.x + outer, center.y);
      g.lineTo(center.x + inner, center.y + inner);
      g.lineTo(center.x, center.y + outer);
      g.lineTo(center.x - inner, center.y + inner);
      g.lineTo(center.x - outer, center.y);
      g.lineTo(center.x - inner, center.y - inner);
      g.closePath();
      g.endFill();
    } else {
      g.lineStyle(2.5, color, alphaStroke);
      g.beginFill(color, alphaFill);
      g.drawCircle(center.x, center.y, radius);
      g.endFill();
    }
  }

  render() {
    const viewer = getActiveThermoViewer();
    if (!viewer || !canvas?.ready) {
      this.clear();
      return;
    }

    const { token: viewerToken, config } = viewer;
    const gridSize = canvas.dimensions?.size || 100;
    const gridDistance = canvas.dimensions?.distance || 5;
    const rangePixels = (config.range / gridDistance) * gridSize;

    const viewerCenter = viewerToken.center ?? {
      x: viewerToken.x + viewerToken.w / 2,
      y: viewerToken.y + viewerToken.h / 2
    };

    // 1. Mise à jour du filtre Shader WebGL
    this.attachFilterToScene();
    const filter = this.ensureFilter();
    const stageTransform = canvas.stage?.worldTransform;
    const scaleX = stageTransform?.a ?? 1;
    const scaleY = stageTransform?.d ?? 1;
    const tx = stageTransform?.tx ?? 0;
    const ty = stageTransform?.ty ?? 0;

    const screenX = viewerCenter.x * scaleX + tx;
    const screenY = viewerCenter.y * scaleY + ty;
    const rangeScreenPx = rangePixels * ((scaleX + scaleY) * 0.5);

    const rendererWidth = canvas.app?.renderer?.screen?.width || window.innerWidth || 1920;
    const rendererHeight = canvas.app?.renderer?.screen?.height || window.innerHeight || 1080;

    filter.uniforms.uEnvColor = hexToVec3(config.envColor);
    filter.uniforms.uIntensity = config.intensity;
    filter.uniforms.uViewerScreenPos = [screenX, screenY];
    filter.uniforms.uRangeScreenPx = rangeScreenPx;
    filter.uniforms.uFalloffStrength =
      config.falloffMode === "flat" ? 0.0 : config.falloffStrength;
    filter.uniforms.uResolution = [rendererWidth, rendererHeight];
    filter.uniforms.uTime = (performance.now() - this.startTime) / 1000;

    // 2. Rendu des signatures thermiques
    const layer = this.ensureSignaturesLayer();
    if (!layer) return;

    layer.visible = true;
    const g = this.signaturesGraphics;
    g.clear();

    for (const other of canvas.tokens.placeables ?? []) {
      if (other.id === viewerToken.id || other.document.hidden) continue;

      const otherCenter = other.center ?? {
        x: other.x + other.w / 2,
        y: other.y + other.h / 2
      };

      const distPx = Math.hypot(otherCenter.x - viewerCenter.x, otherCenter.y - viewerCenter.y);
      if (distPx > rangePixels) continue;
      if (!hasLineOfSight(viewerCenter, otherCenter, config.throughWalls)) continue;

      const normDist = rangePixels > 0 ? distPx / rangePixels : 0;
      const falloffFactor = computeDistanceFalloff(
        normDist,
        config.falloffMode,
        config.falloffStrength
      );
      const radius = Math.max(other.w, other.h) * 0.55;

      if (isNonLivingHeatToken(other)) {
        if (!config.detectNonLiving) continue;
        this.drawSignature(
          g,
          otherCenter,
          radius * 0.9,
          config.nonLivingHotColor,
          config.nonLivingPrimaryColor,
          normDist,
          falloffFactor,
          config.intensity,
          "nonLiving"
        );
      } else if (isHorrorSpiritToken(other)) {
        if (!config.detectHorrorSpirit) continue;
        this.drawSignature(
          g,
          otherCenter,
          radius,
          config.horrorSpiritHotColor,
          config.horrorSpiritPrimaryColor,
          normDist,
          falloffFactor,
          config.intensity,
          "horrorSpirit"
        );
      } else if (isDeadCreatureToken(other)) {
        if (!config.detectDead) continue;
        this.drawSignature(
          g,
          otherCenter,
          radius * 0.95,
          config.deadHotColor,
          config.deadPrimaryColor,
          normDist,
          falloffFactor,
          config.intensity,
          "dead"
        );
      } else {
        this.drawSignature(
          g,
          otherCenter,
          radius,
          config.detectHotColor,
          config.detectPrimaryColor,
          normDist,
          falloffFactor,
          config.intensity,
          "living"
        );
      }
    }

    if (config.detectNonLiving && canvas.lighting?.placeables) {
      for (const light of canvas.lighting.placeables) {
        if (light.document.hidden || !isNonLivingHeatLight(light)) continue;

        const lightCenter = { x: light.x, y: light.y };
        const distPx = Math.hypot(lightCenter.x - viewerCenter.x, lightCenter.y - viewerCenter.y);
        if (distPx > rangePixels) continue;
        if (!hasLineOfSight(viewerCenter, lightCenter, config.throughWalls)) continue;

        const normDist = rangePixels > 0 ? distPx / rangePixels : 0;
        const falloffFactor = computeDistanceFalloff(
          normDist,
          config.falloffMode,
          config.falloffStrength
        );
        this.drawSignature(
          g,
          lightCenter,
          gridSize * 0.45,
          config.nonLivingHotColor,
          config.nonLivingPrimaryColor,
          normDist,
          falloffFactor,
          config.intensity,
          "nonLiving"
        );
      }
    }
  }
}

const thermoEngine = new ThermographicEngine();

Hooks.on("canvasReady", () => {
  thermoEngine.render();
  ui.controls?.render();
});

Hooks.on("controlToken", () => {
  thermoEngine.render();
  ui.controls?.render();
});

Hooks.on("refreshToken", () => thermoEngine.render());

Hooks.on("updateToken", (tokenDoc, changes) => {
  thermoEngine.render();
  if (changes.flags?.[MODULE_ID] && "enabled" in changes.flags[MODULE_ID]) {
    ui.controls?.render();
  }
});

Hooks.on("deleteToken", () => {
  thermoEngine.render();
  ui.controls?.render();
});

Hooks.on("updateAmbientLight", () => thermoEngine.render());
Hooks.on("createAmbientLight", () => thermoEngine.render());
Hooks.on("deleteAmbientLight", () => thermoEngine.render());
Hooks.on("updateWall", () => thermoEngine.render());
Hooks.on("createWall", () => thermoEngine.render());
Hooks.on("deleteWall", () => thermoEngine.render());

if (canvas?.app?.ticker) {
  canvas.app.ticker.add(() => {
    if (getActiveThermoViewer()) {
      thermoEngine.render();
    }
  });
} else {
  Hooks.once("canvasReady", () => {
    canvas.app?.ticker?.add(() => {
      if (getActiveThermoViewer()) {
        thermoEngine.render();
      }
    });
  });
}

/**
 * Injection de la configuration complète dans la fiche d'un Token (v12 & v13).
 */
Hooks.on("renderTokenConfig", (app, html) => {
  const tokenDoc = app.token ?? app.object;
  if (!tokenDoc) return;

  const cfg = getTokenThermoConfig(tokenDoc);
  const flags = tokenDoc.flags?.[MODULE_ID] ?? {};
  const isNonLivingFlag = Boolean(flags.isNonLivingHeatSource);
  const isDeadFlag = Boolean(flags.isDeadCreature);
  const isHorrorSpiritFlag = Boolean(flags.isHorrorSpirit);

  const rootEl = html instanceof HTMLElement ? html : html[0];
  if (!rootEl || rootEl.querySelector(".ed-thermo-fieldset")) return;

  const fieldset = document.createElement("fieldset");
  fieldset.className = "ed-thermo-fieldset";
  fieldset.innerHTML = `
    <legend>${game.i18n.localize("EDTHERMO.TokenSection")}</legend>

    <div class="form-group">
      <label>${game.i18n.localize("EDTHERMO.Enabled")}</label>
      <div class="form-fields">
        <input type="checkbox" name="flags.${MODULE_ID}.enabled" ${cfg.enabled ? "checked" : ""} />
      </div>
    </div>

    <div class="form-group">
      <label>${game.i18n.localize("EDTHERMO.Range")}</label>
      <div class="form-fields">
        <input type="number" name="flags.${MODULE_ID}.range" value="${cfg.range}" min="0" step="1" />
      </div>
      <p class="hint">${game.i18n.localize("EDTHERMO.RangeHint")}</p>
    </div>

    <div class="form-group">
      <label>${game.i18n.localize("EDTHERMO.ThroughWalls")}</label>
      <div class="form-fields">
        <input type="checkbox" name="flags.${MODULE_ID}.throughWalls" ${cfg.throughWalls ? "checked" : ""} />
      </div>
      <p class="hint">${game.i18n.localize("EDTHERMO.ThroughWallsHint")}</p>
    </div>

    <div class="form-group">
      <label>${game.i18n.localize("EDTHERMO.FalloffMode")}</label>
      <div class="form-fields">
        <select name="flags.${MODULE_ID}.falloffMode">
          <option value="flat" ${cfg.falloffMode === "flat" ? "selected" : ""}>${game.i18n.localize("EDTHERMO.FalloffFlat")}</option>
          <option value="linear" ${cfg.falloffMode === "linear" ? "selected" : ""}>${game.i18n.localize("EDTHERMO.FalloffLinear")}</option>
          <option value="quadratic" ${cfg.falloffMode === "quadratic" ? "selected" : ""}>${game.i18n.localize("EDTHERMO.FalloffQuadratic")}</option>
          <option value="exponential" ${cfg.falloffMode === "exponential" ? "selected" : ""}>${game.i18n.localize("EDTHERMO.FalloffExponential")}</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>${game.i18n.localize("EDTHERMO.FalloffStrength")}</label>
      <div class="form-fields">
        <input type="number" name="flags.${MODULE_ID}.falloffStrength" value="${cfg.falloffStrength}" min="0" max="2.5" step="0.1" />
      </div>
    </div>

    <div class="form-group">
      <label>${game.i18n.localize("EDTHERMO.Intensity")}</label>
      <div class="form-fields">
        <input type="number" name="flags.${MODULE_ID}.intensity" value="${cfg.intensity}" min="0.05" max="1" step="0.05" />
      </div>
    </div>

    <div class="ed-thermo-grid">
      <div class="ed-thermo-field">
        <label>${game.i18n.localize("EDTHERMO.EnvColor")}</label>
        <input type="color" name="flags.${MODULE_ID}.envColor" value="${cfg.envColor}" />
      </div>

      <div class="ed-thermo-field">
        <label>${game.i18n.localize("EDTHERMO.DetectPrimaryColor")}</label>
        <input type="color" name="flags.${MODULE_ID}.detectPrimaryColor" value="${cfg.detectPrimaryColor}" />
      </div>

      <div class="ed-thermo-field">
        <label>${game.i18n.localize("EDTHERMO.DetectHotColor")}</label>
        <input type="color" name="flags.${MODULE_ID}.detectHotColor" value="${cfg.detectHotColor}" />
      </div>
    </div>

    <div class="ed-thermo-subblock">
      <div class="form-group">
        <label>${game.i18n.localize("EDTHERMO.DetectNonLiving")}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.detectNonLiving" ${cfg.detectNonLiving ? "checked" : ""} />
        </div>
      </div>

      <div class="ed-thermo-grid">
        <div class="ed-thermo-field">
          <label>${game.i18n.localize("EDTHERMO.NonLivingPrimaryColor")}</label>
          <input type="color" name="flags.${MODULE_ID}.nonLivingPrimaryColor" value="${cfg.nonLivingPrimaryColor}" />
        </div>
        <div class="ed-thermo-field">
          <label>${game.i18n.localize("EDTHERMO.NonLivingHotColor")}</label>
          <input type="color" name="flags.${MODULE_ID}.nonLivingHotColor" value="${cfg.nonLivingHotColor}" />
        </div>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("EDTHERMO.IsNonLivingHeatSource")}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.isNonLivingHeatSource" ${isNonLivingFlag ? "checked" : ""} />
        </div>
        <p class="hint">${game.i18n.localize("EDTHERMO.IsNonLivingHeatSourceHint")}</p>
      </div>
    </div>

    <div class="ed-thermo-subblock">
      <div class="form-group">
        <label>${game.i18n.localize("EDTHERMO.DetectDead")}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.detectDead" ${cfg.detectDead ? "checked" : ""} />
        </div>
      </div>

      <div class="ed-thermo-grid">
        <div class="ed-thermo-field">
          <label>${game.i18n.localize("EDTHERMO.DeadPrimaryColor")}</label>
          <input type="color" name="flags.${MODULE_ID}.deadPrimaryColor" value="${cfg.deadPrimaryColor}" />
        </div>
        <div class="ed-thermo-field">
          <label>${game.i18n.localize("EDTHERMO.DeadHotColor")}</label>
          <input type="color" name="flags.${MODULE_ID}.deadHotColor" value="${cfg.deadHotColor}" />
        </div>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("EDTHERMO.IsDeadCreature")}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.isDeadCreature" ${isDeadFlag ? "checked" : ""} />
        </div>
        <p class="hint">${game.i18n.localize("EDTHERMO.IsDeadCreatureHint")}</p>
      </div>
    </div>

    <div class="ed-thermo-subblock">
      <div class="form-group">
        <label>${game.i18n.localize("EDTHERMO.DetectHorrorSpirit")}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.detectHorrorSpirit" ${cfg.detectHorrorSpirit ? "checked" : ""} />
        </div>
      </div>

      <div class="ed-thermo-grid">
        <div class="ed-thermo-field">
          <label>${game.i18n.localize("EDTHERMO.HorrorSpiritPrimaryColor")}</label>
          <input type="color" name="flags.${MODULE_ID}.horrorSpiritPrimaryColor" value="${cfg.horrorSpiritPrimaryColor}" />
        </div>
        <div class="ed-thermo-field">
          <label>${game.i18n.localize("EDTHERMO.HorrorSpiritHotColor")}</label>
          <input type="color" name="flags.${MODULE_ID}.horrorSpiritHotColor" value="${cfg.horrorSpiritHotColor}" />
        </div>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("EDTHERMO.IsHorrorSpirit")}</label>
        <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.isHorrorSpirit" ${isHorrorSpiritFlag ? "checked" : ""} />
        </div>
        <p class="hint">${game.i18n.localize("EDTHERMO.IsHorrorSpiritHint")}</p>
      </div>
    </div>
  `;

  const targetForm = rootEl.querySelector("form") ?? rootEl;
  const submitBtn = targetForm.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn.parentElement) {
    submitBtn.parentElement.before(fieldset);
  } else {
    targetForm.appendChild(fieldset);
  }
});

/**
 * Permet aussi de marquer une lumière ambiante comme source de chaleur non vivante.
 */
Hooks.on("renderAmbientLightConfig", (app, html) => {
  const lightDoc = app.document ?? app.object;
  if (!lightDoc) return;

  const isNonLiving = Boolean(lightDoc.flags?.[MODULE_ID]?.isNonLivingHeatSource);
  const rootEl = html instanceof HTMLElement ? html : html[0];
  if (!rootEl || rootEl.querySelector(".ed-thermo-light-group")) return;

  const group = document.createElement("div");
  group.className = "form-group ed-thermo-light-group";
  group.innerHTML = `
    <label>${game.i18n.localize("EDTHERMO.IsNonLivingHeatSource")}</label>
    <div class="form-fields">
      <input type="checkbox" name="flags.${MODULE_ID}.isNonLivingHeatSource" ${isNonLiving ? "checked" : ""} />
    </div>
    <p class="hint">${game.i18n.localize("EDTHERMO.IsNonLivingHeatSourceHint")}</p>
  `;

  const targetForm = rootEl.querySelector("form") ?? rootEl;
  const submitBtn = targetForm.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn.parentElement) {
    submitBtn.parentElement.before(group);
  } else {
    targetForm.appendChild(group);
  }
});

/**
 * Bascule l'état de vision thermographique sur une liste de tokens (ou les tokens contrôlés).
 */
async function toggleThermographicOnTokens(tokens = null) {
  const targets = tokens ?? canvas?.tokens?.controlled ?? [];
  if (!targets.length) {
    ui.notifications?.warn(game.i18n.localize("EDTHERMO.ToggleToolHint"));
    return;
  }

  const anyEnabled = targets.some((t) => Boolean(t.document?.flags?.[MODULE_ID]?.enabled));
  const nextState = !anyEnabled;

  for (const token of targets) {
    await token.document.setFlag(MODULE_ID, "enabled", nextState);
  }

  thermoEngine.render();
  ui.controls?.render();
}

/**
 * Ajoute un bouton rapide dans la barre d'outils des Tokens (v12 & v13).
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const toolDef = {
    name: "thermographicVision",
    title: game.i18n.localize("EDTHERMO.ToggleTool") || "Vision Thermographique",
    icon: "fa-solid fa-temperature-high",
    toggle: true,
    active: Boolean(getActiveThermoViewer()),
    button: true,
    onClick: () => toggleThermographicOnTokens()
  };

  if (controls && typeof controls === "object" && !Array.isArray(controls)) {
    const tokenControl = controls.tokens ?? controls.token;
    if (tokenControl?.tools) {
      if (Array.isArray(tokenControl.tools)) {
        tokenControl.tools.push(toolDef);
      } else {
        tokenControl.tools[toolDef.name] = toolDef;
      }
    }
    return;
  }

  if (Array.isArray(controls)) {
    const tokenControl = controls.find((c) => c.name === "token" || c.name === "tokens");
    if (tokenControl && Array.isArray(tokenControl.tools)) {
      tokenControl.tools.push(toolDef);
    }
  }
});