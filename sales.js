const state = {
  password: sessionStorage.getItem("salesPassword") || "",
};

const elements = {
  loginPanel: document.getElementById("loginPanel"),
  dashboard: document.getElementById("dashboard"),
  passwordInput: document.getElementById("passwordInput"),
  loginButton: document.getElementById("loginButton"),
  loginMessage: document.getElementById("loginMessage"),
  veneerPriceInput: document.getElementById("veneerPriceInput"),
  solidPriceInput: document.getElementById("solidPriceInput"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
  settingsMessage: document.getElementById("settingsMessage"),
  refreshButton: document.getElementById("refreshButton"),
  clearQuotesButton: document.getElementById("clearQuotesButton"),
  quotesBody: document.getElementById("quotesBody"),
  quotesMessage: document.getElementById("quotesMessage"),
};

function money(value) {
  return `¥${Math.round(Number(value || 0)).toLocaleString("zh-CN")}`;
}

function area(value) {
  return `${Number(value || 0).toFixed(2)} ㎡`;
}

function mm(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("zh-CN")} mm`;
}

function apiOptions(options = {}) {
  return {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-sales-password": state.password,
      ...(options.headers || {}),
    },
  };
}

async function requestJson(url, options) {
  const response = await fetch(url, apiOptions(options));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

function showDashboard() {
  elements.loginPanel.classList.add("is-hidden");
  elements.dashboard.classList.remove("is-hidden");
}

function showLogin(message = "") {
  elements.dashboard.classList.add("is-hidden");
  elements.loginPanel.classList.remove("is-hidden");
  elements.loginMessage.textContent = message;
}

async function loadSettings() {
  const settings = await fetch("/api/settings", { cache: "no-store" }).then((response) => response.json());
  elements.veneerPriceInput.value = Number(settings.prices?.veneer || 0);
  elements.solidPriceInput.value = Number(settings.prices?.solid || 0);
}

function renderQuotes(quotes) {
  if (!quotes.length) {
    elements.quotesBody.innerHTML = '<tr><td colspan="8">暂无客户报价单</td></tr>';
    return;
  }

  elements.quotesBody.innerHTML = quotes.map((quote) => {
    const createdAt = new Date(quote.createdAt).toLocaleString("zh-CN", { hour12: false });
    const dims = quote.dimensions || {};
    return `
      <tr>
        <td>${createdAt}</td>
        <td>${quote.phone || ""}</td>
        <td>${quote.layoutName || quote.layout || ""}</td>
        <td>${quote.materialName || quote.material || ""}</td>
        <td>
          正 ${mm(dims.frontLength)}<br>
          左 ${mm(dims.leftLength)} / 右 ${mm(dims.rightLength)}<br>
          高 ${mm(dims.height)} / 深 ${mm(dims.depth)}
        </td>
        <td>${area(quote.billableArea)}</td>
        <td>${money(quote.unitPrice)}/㎡</td>
        <td><strong>${money(quote.totalPrice)}</strong></td>
      </tr>
    `;
  }).join("");
}

async function loadQuotes() {
  const data = await requestJson("/api/sales/quotes");
  renderQuotes(data.quotes || []);
  elements.quotesMessage.textContent = `共 ${data.quotes?.length || 0} 条报价单`;
}

async function login() {
  state.password = elements.passwordInput.value.trim();
  sessionStorage.setItem("salesPassword", state.password);

  try {
    await loadSettings();
    await loadQuotes();
    showDashboard();
  } catch {
    sessionStorage.removeItem("salesPassword");
    showLogin("密码错误或服务器不可用。");
  }
}

async function saveSettings() {
  elements.settingsMessage.textContent = "";
  try {
    await requestJson("/api/sales/settings", {
      method: "POST",
      body: JSON.stringify({
        prices: {
          veneer: Number(elements.veneerPriceInput.value || 0),
          solid: Number(elements.solidPriceInput.value || 0),
        },
      }),
    });
    elements.settingsMessage.textContent = "单价已保存。";
  } catch {
    elements.settingsMessage.textContent = "保存失败，请确认密码或服务器状态。";
  }
}

async function clearQuotes() {
  if (!confirm("确定删除所有客户报价单吗？此操作不可恢复。")) return;

  try {
    await requestJson("/api/sales/quotes", { method: "DELETE" });
    await loadQuotes();
    elements.quotesMessage.textContent = "报价单已清空。";
  } catch {
    elements.quotesMessage.textContent = "删除失败，请确认密码或服务器状态。";
  }
}

elements.loginButton.addEventListener("click", login);
elements.passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") login();
});
elements.saveSettingsButton.addEventListener("click", saveSettings);
elements.refreshButton.addEventListener("click", async () => {
  await loadSettings();
  await loadQuotes();
});
elements.clearQuotesButton.addEventListener("click", clearQuotes);

if (state.password) {
  elements.passwordInput.value = state.password;
  login();
}
