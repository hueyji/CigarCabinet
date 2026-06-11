import { createCabinetPreview } from "./preview3d.js";

const layoutMeta = {
  straight: {
    name: "一字型",
    activeSides: ["frontLength"],
  },
  leftL: {
    name: "左 L 型",
    activeSides: ["frontLength", "leftLength"],
  },
  rightL: {
    name: "右 L 型",
    activeSides: ["frontLength", "rightLength"],
  },
  uShape: {
    name: "U 字型",
    activeSides: ["frontLength", "leftLength", "rightLength"],
  },
};

const FIXED_DEPTH_MM = 400;

const materialMeta = {
  veneer: "雪松木贴皮",
  solid: "雪松木实木",
};

const state = {
  layout: "straight",
  frontLength: 3000,
  leftLength: 1800,
  rightLength: 1800,
  height: 2400,
  depth: FIXED_DEPTH_MM,
  material: "veneer",
  prices: {
    veneer: 1800,
    solid: 2800,
  },
  phone: "",
  quoteUnlocked: false,
};

const elements = {
  layoutName: document.getElementById("layoutName"),
  layoutButtons: [...document.querySelectorAll(".layout-option")],
  frontLengthInput: document.getElementById("frontLengthInput"),
  leftLengthInput: document.getElementById("leftLengthInput"),
  rightLengthInput: document.getElementById("rightLengthInput"),
  heightInput: document.getElementById("heightInput"),
  materialSelect: document.getElementById("materialSelect"),
  phoneInput: document.getElementById("phoneInput"),
  viewQuoteButton: document.getElementById("viewQuoteButton"),
  totalPrice: document.getElementById("totalPrice"),
  priceBadge: document.querySelector(".price-badge"),
  quoteTotal: document.getElementById("quoteTotal"),
  grossLengthText: document.getElementById("grossLengthText"),
  effectiveLengthText: document.getElementById("effectiveLengthText"),
  billableAreaText: document.getElementById("billableAreaText"),
  materialText: document.getElementById("materialText"),
  warningText: document.getElementById("warningText"),
  frontTag: document.getElementById("frontTag"),
  leftTag: document.getElementById("leftTag"),
  rightTag: document.getElementById("rightTag"),
  heightTag: document.getElementById("heightTag"),
  depthText: document.getElementById("depthText"),
  heightText: document.getElementById("heightText"),
  unitPriceText: document.getElementById("unitPriceText"),
  footprint: document.getElementById("footprint"),
  threePreview: document.getElementById("threePreview"),
  threeWrap: document.getElementById("threeWrap"),
  threeHint: document.getElementById("threeHint"),
};

const cabinetPreview = createCabinetPreview({
  canvas: elements.threePreview,
  wrap: elements.threeWrap,
  hint: elements.threeHint,
});

let previewFrame = 0;
let previewHasUpdated = false;

if (!cabinetPreview && elements.threeWrap) {
  elements.threeWrap.classList.add("is-error");
}

window.addEventListener("error", (event) => {
  const fileName = event.filename || "";
  if (fileName.includes("preview3d") || fileName.includes("three.module")) {
    elements.threeWrap?.classList.add("is-error");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = String(event.reason?.message || event.reason || "");
  if (reason.includes("preview3d") || reason.includes("three")) {
    elements.threeWrap?.classList.add("is-error");
  }
});

window.setTimeout(() => {
  if (!previewHasUpdated && !elements.threeWrap?.classList.contains("is-ready")) {
    elements.threeWrap?.classList.add("is-error");
  }
}, 3500);

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toDimensionValue(value) {
  const number = toNumber(value);
  return number > 0 ? number : 0;
}

function previewNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return clamp(number, min, max);
}

function footprintNumber(value, fallback) {
  const number = toNumber(value);
  return number > 0 ? number : fallback;
}

function formatMm(value) {
  const number = toNumber(value);
  return `${Math.round(number).toLocaleString("zh-CN")} mm`;
}

function formatArea(value) {
  return `${value.toFixed(2)} ㎡`;
}

function formatMoney(value) {
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone.trim());
}

function activeLayout() {
  return layoutMeta[state.layout];
}

function getGrossLength() {
  return activeLayout().activeSides.reduce((sum, key) => sum + toNumber(state[key]), 0);
}

function getDeduction() {
  return 0;
}

function getEffectiveLength() {
  return Math.max(0, getGrossLength() - getDeduction());
}

function getBillableArea() {
  return (getEffectiveLength() / 1000) * (toNumber(state.height) / 1000);
}

function getTotalPrice() {
  return getBillableArea() * getUnitPrice();
}

function getUnitPrice() {
  return Number(state.prices[state.material] || 0);
}

function setLayout(layout) {
  state.layout = layout;
  document.body.dataset.layout = layout;
  render();
}

function setValue(key, value) {
  state[key] = value;
  state.quoteUnlocked = false;
  render();
}

function syncStaticInputs() {
  ["frontLength", "leftLength", "rightLength", "height"].forEach((key) => {
    elements[`${key}Input`].value = state[key];
  });
  elements.materialSelect.value = state.material;
  elements.phoneInput.value = state.phone;
}

function renderLayoutButtons() {
  elements.layoutButtons.forEach((button) => {
    const isActive = button.dataset.layout === state.layout;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderPreviewScale() {
  const frontLength = previewNumber(state.frontLength, 3000, 500, 12000);
  const leftLength = previewNumber(state.leftLength, 1800, 300, 12000);
  const rightLength = previewNumber(state.rightLength, 1800, 300, 12000);
  const height = previewNumber(state.height, 2400, 800, 5000);
  const depth = previewNumber(state.depth, FIXED_DEPTH_MM, 100, 1500);
  const frontRatio = frontLength / 12000;
  const sideMax = Math.max(leftLength, rightLength);
  const sideRatio = sideMax / 12000;
  const heightRatio = height / 5000;
  const depthRatio = depth / 1500;

  const frontWidth = Math.round(180 + clamp(frontRatio, 0, 1) * 260);
  const sideWidth = Math.round(110 + clamp(sideRatio, 0, 1) * 150);
  const runHeight = Math.round(280 + clamp(heightRatio, 0, 1) * 180);
  const runDepth = Math.round(36 + clamp(depthRatio, 0, 1) * 52);

  document.documentElement.style.setProperty("--front-width", `${frontWidth}px`);
  document.documentElement.style.setProperty("--side-width", `${sideWidth}px`);
  document.documentElement.style.setProperty("--run-height", `${runHeight}px`);
  document.documentElement.style.setProperty("--run-depth", `${runDepth}px`);
}

function renderFootprintScale() {
  if (!elements.footprint) return;

  const layout = activeLayout();
  const frontLength = footprintNumber(state.frontLength, 3000);
  const leftLength = layout.activeSides.includes("leftLength") ? footprintNumber(state.leftLength, 1800) : 0;
  const rightLength = layout.activeSides.includes("rightLength") ? footprintNumber(state.rightLength, 1800) : 0;
  const sideLength = Math.max(leftLength, rightLength, FIXED_DEPTH_MM);
  const boxWidth = elements.footprint.clientWidth || 320;
  const boxHeight = elements.footprint.clientHeight || 156;
  const horizontalPadding = 18;
  const verticalPadding = 18;
  const bottom = 18;
  const maxWidth = Math.max(120, boxWidth - horizontalPadding * 2);
  const maxHeight = Math.max(80, boxHeight - verticalPadding - bottom);
  const scale = Math.min(maxWidth / Math.max(frontLength, FIXED_DEPTH_MM), maxHeight / sideLength);
  const depthPx = Math.round(clamp(FIXED_DEPTH_MM * scale, 12, 28));
  const frontPx = Math.round(clamp(frontLength * scale, depthPx * 3, maxWidth));
  const leftPx = Math.round(leftLength > 0 ? clamp(leftLength * scale, depthPx, maxHeight) : depthPx);
  const rightPx = Math.round(rightLength > 0 ? clamp(rightLength * scale, depthPx, maxHeight) : depthPx);
  const frontLeft = Math.round((boxWidth - frontPx) / 2);
  const rightLeft = Math.round(frontLeft + frontPx - depthPx);

  elements.footprint.style.setProperty("--fp-front-left", `${frontLeft}px`);
  elements.footprint.style.setProperty("--fp-right-left", `${rightLeft}px`);
  elements.footprint.style.setProperty("--fp-front-width", `${frontPx}px`);
  elements.footprint.style.setProperty("--fp-left-height", `${leftPx}px`);
  elements.footprint.style.setProperty("--fp-right-height", `${rightPx}px`);
  elements.footprint.style.setProperty("--fp-depth", `${depthPx}px`);
  elements.footprint.style.setProperty("--fp-bottom", `${bottom}px`);
}

function renderQuote() {
  const layout = activeLayout();
  const grossLength = getGrossLength();
  const effectiveLength = getEffectiveLength();
  const billableArea = getBillableArea();
  const totalPrice = getTotalPrice();

  elements.layoutName.textContent = layout.name;
  elements.grossLengthText.textContent = formatMm(grossLength);
  elements.effectiveLengthText.textContent = formatMm(effectiveLength);
  elements.billableAreaText.textContent = formatArea(billableArea);
  const quoteText = state.quoteUnlocked ? formatMoney(totalPrice) : "输入手机号查看";
  elements.totalPrice.textContent = quoteText;
  elements.quoteTotal.textContent = quoteText;
  elements.priceBadge.classList.toggle("is-locked", !state.quoteUnlocked);
  elements.quoteTotal.classList.toggle("is-locked", !state.quoteUnlocked);
  elements.frontTag.textContent = formatMm(state.frontLength);
  elements.leftTag.textContent = formatMm(state.leftLength);
  elements.rightTag.textContent = formatMm(state.rightLength);
  elements.heightTag.textContent = formatMm(state.height);
  elements.depthText.textContent = formatMm(state.depth);
  elements.heightText.textContent = formatMm(state.height);
  elements.unitPriceText.textContent = `${formatMoney(getUnitPrice())}/㎡`;
  elements.materialText.textContent = materialMeta[state.material];

  const warnings = [];
  const activeSideValues = layout.activeSides.map((key) => toNumber(state[key])).filter((value) => value > 0);
  if (toNumber(state.height) > 2800) {
    warnings.push("高度超过 2800 mm，建议确认现场层高、运输和安装分段。");
  }
  if (!activeSideValues.length || toNumber(state.height) <= 0) {
    warnings.push("请填写有效尺寸后查看报价。");
  }
  elements.warningText.textContent = warnings.join(" ");
}

function sync3dPreview() {
  if (!cabinetPreview) return;
  if (previewFrame) return;

  previewFrame = requestAnimationFrame(() => {
    previewFrame = 0;
    previewHasUpdated = true;
    const previewConfig = {
      layout: state.layout,
      frontLength: previewNumber(state.frontLength, 3000, 500, 12000),
      leftLength: previewNumber(state.leftLength, 1800, 300, 12000),
      rightLength: previewNumber(state.rightLength, 1800, 300, 12000),
      height: previewNumber(state.height, 2400, 800, 5000),
      depth: previewNumber(state.depth, FIXED_DEPTH_MM, 100, 1500),
    };
    cabinetPreview.update({
      ...previewConfig,
    });
  });
}

function render() {
  renderLayoutButtons();
  renderPreviewScale();
  renderFootprintScale();
  renderQuote();
  sync3dPreview();
}

function bindValue(key) {
  const input = elements[`${key}Input`];

  input.addEventListener("input", (event) => {
    setValue(key, event.target.value);
  });
}

async function loadSettings() {
  try {
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (!response.ok) return;
    const settings = await response.json();
    state.prices = {
      veneer: Number(settings.prices?.veneer || state.prices.veneer),
      solid: Number(settings.prices?.solid || state.prices.solid),
    };
    render();
  } catch (error) {
    console.warn("Failed to load settings:", error);
  }
}

function quotePayload() {
  const layout = activeLayout();
  return {
    phone: state.phone.trim(),
    layout: state.layout,
    layoutName: layout.name,
    material: state.material,
    materialName: materialMeta[state.material],
    dimensions: {
      frontLength: toDimensionValue(state.frontLength),
      leftLength: toDimensionValue(state.leftLength),
      rightLength: toDimensionValue(state.rightLength),
      height: toDimensionValue(state.height),
      depth: toDimensionValue(state.depth),
    },
    unitPrice: getUnitPrice(),
    grossLength: getGrossLength(),
    deduction: getDeduction(),
    effectiveLength: getEffectiveLength(),
    billableArea: getBillableArea(),
    totalPrice: getTotalPrice(),
  };
}

async function unlockQuote() {
  state.phone = elements.phoneInput.value.trim();
  if (!isValidPhone(state.phone)) {
    state.quoteUnlocked = false;
    render();
    elements.warningText.textContent = "请输入有效的 11 位中国大陆手机号后查看报价。";
    elements.phoneInput.focus();
    return;
  }
  if (getBillableArea() <= 0) {
    state.quoteUnlocked = false;
    render();
    elements.warningText.textContent = "请先填写有效尺寸，再查看报价。";
    return;
  }

  state.quoteUnlocked = true;
  render();

  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotePayload()),
    });
    if (!response.ok) throw new Error("保存报价单失败");
  } catch (error) {
    elements.warningText.textContent = "报价已显示，但保存报价单失败，请确认服务器是否运行。";
  }
}

elements.layoutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLayout(button.dataset.layout);
  });
});

["frontLength", "leftLength", "rightLength", "height"].forEach(bindValue);

elements.materialSelect.addEventListener("change", (event) => {
  state.material = event.target.value;
  state.quoteUnlocked = false;
  render();
});

elements.phoneInput.addEventListener("input", (event) => {
  state.phone = event.target.value;
  state.quoteUnlocked = false;
  render();
});

elements.viewQuoteButton.addEventListener("click", unlockQuote);

window.addEventListener("resize", renderFootprintScale);

loadSettings();
syncStaticInputs();
render();
