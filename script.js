import { createCabinetPreview } from "./preview3d.js";

const layoutMeta = {
  straight: {
    name: "一字型",
    activeSides: ["frontLength"],
    cornerCount: 0,
    rule: "无转角扣重",
  },
  leftL: {
    name: "左 L 型",
    activeSides: ["frontLength", "leftLength"],
    cornerCount: 1,
    rule: "L 型扣 1 个柜深",
  },
  rightL: {
    name: "右 L 型",
    activeSides: ["frontLength", "rightLength"],
    cornerCount: 1,
    rule: "L 型扣 1 个柜深",
  },
  uShape: {
    name: "U 字型",
    activeSides: ["frontLength", "leftLength", "rightLength"],
    cornerCount: 2,
    rule: "U 型扣 2 个柜深",
  },
};

const materialMeta = {
  veneer: "雪松木贴皮",
  solid: "雪松木实木",
};

const limits = {
  frontLength: { min: 800, max: 9000 },
  leftLength: { min: 800, max: 6000 },
  rightLength: { min: 800, max: 6000 },
  height: { min: 1200, max: 3200 },
  depth: { min: 300, max: 900 },
};

const state = {
  layout: "straight",
  frontLength: 3000,
  leftLength: 1800,
  rightLength: 1800,
  height: 2400,
  depth: 500,
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
  depthInput: document.getElementById("depthInput"),
  materialSelect: document.getElementById("materialSelect"),
  phoneInput: document.getElementById("phoneInput"),
  viewQuoteButton: document.getElementById("viewQuoteButton"),
  totalPrice: document.getElementById("totalPrice"),
  priceBadge: document.querySelector(".price-badge"),
  quoteTotal: document.getElementById("quoteTotal"),
  cornerRule: document.getElementById("cornerRule"),
  overlapText: document.getElementById("overlapText"),
  grossLengthText: document.getElementById("grossLengthText"),
  deductionText: document.getElementById("deductionText"),
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

function formatMm(value) {
  return `${Math.round(value).toLocaleString("zh-CN")} mm`;
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
  return activeLayout().activeSides.reduce((sum, key) => sum + state[key], 0);
}

function getDeduction() {
  return activeLayout().cornerCount * state.depth;
}

function getEffectiveLength() {
  return Math.max(0, getGrossLength() - getDeduction());
}

function getBillableArea() {
  return (getEffectiveLength() / 1000) * (state.height / 1000);
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
  const next = clamp(Number(value), limits[key].min, limits[key].max);
  state[key] = next;
  render();
}

function syncInputs() {
  ["frontLength", "leftLength", "rightLength", "height", "depth"].forEach((key) => {
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
  const frontRatio = state.frontLength / limits.frontLength.max;
  const sideMax = Math.max(state.leftLength, state.rightLength);
  const sideRatio = sideMax / limits.leftLength.max;
  const heightRatio = state.height / limits.height.max;
  const depthRatio = state.depth / limits.depth.max;

  const frontWidth = Math.round(180 + frontRatio * 260);
  const sideWidth = Math.round(110 + sideRatio * 150);
  const runHeight = Math.round(280 + heightRatio * 180);
  const runDepth = Math.round(36 + depthRatio * 52);

  document.documentElement.style.setProperty("--front-width", `${frontWidth}px`);
  document.documentElement.style.setProperty("--side-width", `${sideWidth}px`);
  document.documentElement.style.setProperty("--run-height", `${runHeight}px`);
  document.documentElement.style.setProperty("--run-depth", `${runDepth}px`);
}

function renderQuote() {
  const layout = activeLayout();
  const grossLength = getGrossLength();
  const deduction = getDeduction();
  const effectiveLength = getEffectiveLength();
  const billableArea = getBillableArea();
  const totalPrice = getTotalPrice();

  elements.layoutName.textContent = layout.name;
  elements.cornerRule.textContent = layout.rule;
  elements.overlapText.textContent = `扣 ${layout.cornerCount} 个柜深`;
  elements.grossLengthText.textContent = formatMm(grossLength);
  elements.deductionText.textContent = formatMm(deduction);
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
  if (layout.cornerCount > 0 && state.depth >= Math.min(...layout.activeSides.map((key) => state[key])) / 2) {
    warnings.push("柜深接近某条边长度的一半，转角处可能需要单独确认结构。");
  }
  if (state.height > 2800) {
    warnings.push("高度超过 2800 mm，建议确认现场层高、运输和安装分段。");
  }
  elements.warningText.textContent = warnings.join(" ");
}

function sync3dPreview() {
  if (!cabinetPreview) return;
  if (previewFrame) return;

  previewFrame = requestAnimationFrame(() => {
    previewFrame = 0;
    previewHasUpdated = true;
    cabinetPreview.update({
      layout: state.layout,
      frontLength: state.frontLength,
      leftLength: state.leftLength,
      rightLength: state.rightLength,
      height: state.height,
      depth: state.depth,
    });
  });
}

function render() {
  syncInputs();
  renderLayoutButtons();
  renderPreviewScale();
  renderQuote();
  sync3dPreview();
}

function bindValue(key) {
  const input = elements[`${key}Input`];

  input.addEventListener("input", (event) => {
    setValue(key, event.target.value);
  });

  input.addEventListener("blur", () => {
    syncInputs();
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
      frontLength: state.frontLength,
      leftLength: state.leftLength,
      rightLength: state.rightLength,
      height: state.height,
      depth: state.depth,
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

["frontLength", "leftLength", "rightLength", "height", "depth"].forEach(bindValue);

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

loadSettings();
render();
