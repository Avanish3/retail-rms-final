const loginPageRoot = document.querySelector("#loginPage");
const dashboardPageRoot = document.querySelector("#dashboardPage");

const STORAGE_KEYS = {
  apiBase: "retail_rms_api_base",
  session: "retail_rms_session",
  theme: "retail_rms_theme"
};

const ROUTES = [
  { id: "dashboard", label: "Dashboard", short: "KPIs" },
  { id: "catalog", label: "Catalog", short: "SKUs" },
  { id: "inventory", label: "Inventory", short: "Stock" },
  { id: "customers", label: "Customers", short: "CRM" },
  { id: "billing", label: "Billing", short: "POS" },
  { id: "orders", label: "Orders", short: "Supply" },
  { id: "operations", label: "Operations", short: "Ops" },
  { id: "ai", label: "AI Studio", short: "Insights" },
  { id: "settings", label: "Settings", short: "Config" }
];

const DEMO_USERS = [
  { label: "Admin", email: "admin@retailrms.com", password: "Password@123" },
  { label: "Manager", email: "manager@retailrms.com", password: "Password@123" },
  { label: "Cashier", email: "cashier@retailrms.com", password: "Password@123" }
];

const defaultApiBase = "http://127.0.0.1:4000/api";
const shouldRestoreInitialSession = shouldRestoreSessionFromLocation();
const storedSession = readStorage(STORAGE_KEYS.session, null);
const initialSession = shouldRestoreInitialSession ? normalizeSession(storedSession) : null;

const state = {
  route: "dashboard",
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) ?? defaultApiBase,
  session: initialSession,
  loading: false,
  loadingLabel: "Syncing data",
  feedback: null,
  data: createEmptyData(),
  ui: {
    authMode: "login",
    mobileSidebarOpen: false,
    productEditId: null,
    customerHistory: null,
    aiProductId: "",
    barcodeQuery: "",
    dashboardRangeDays: "30",
    globalSearch: "",
    storeFilter: "all",
    productFilter: "all",
    productSort: "updated",
    inventorySort: "risk",
    customerSort: "recent",
    orderSort: "recent",
    theme: localStorage.getItem(STORAGE_KEYS.theme) ?? "light",
    productInsights: {
      recommendations: [],
      dynamicPricing: null
    },
    lastBill: null,
    billingDraft: createBillingDraft(),
    supplyDraft: createSupplyDraft()
  }
};

if (shouldRestoreInitialSession && !initialSession && localStorage.getItem(STORAGE_KEYS.session)) {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function createEmptyData() {
  return {
    stores: [],
    users: [],
    products: [],
    inventory: [],
    lowStock: [],
    customers: [],
    orders: [],
    notifications: [],
    auditLogs: [],
    dashboard: null,
    sales: null,
    profit: null,
    inventoryReport: null,
    demandForecast: [],
    inventoryAlerts: [],
    fraudDetections: [],
    schema: null,
    health: null
  };
}

function createLineItem() {
  return {
    productId: "",
    quantity: "1",
    unitPrice: "",
    taxRate: ""
  };
}

function createPaymentLine() {
  return {
    method: "CASH",
    amount: "",
    reference: ""
  };
}

function createBillingDraft() {
  return {
    storeId: "",
    customerId: "",
    discountAmount: "0",
    taxRate: "18",
    notes: "",
    items: [createLineItem()],
    payments: [createPaymentLine()]
  };
}

function createSupplyDraft() {
  return {
    storeId: "",
    supplierName: "",
    status: "COMPLETED",
    discountAmount: "0",
    taxRate: "18",
    notes: "",
    items: [createLineItem()]
  };
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return null;
  }

  const token = typeof session.token === "string" ? session.token.trim() : "";
  if (!token) {
    return null;
  }

  return {
    ...session,
    token
  };
}

function isAuthenticated() {
  return Boolean(state.session?.token);
}

function getBackendBase() {
  return state.apiBase.replace(/\/api\/?$/, "");
}

function hasRole(...roles) {
  const role = state.session?.user?.role;
  return Boolean(role && roles.includes(role));
}

function isKnownRoute(routeId) {
  return ROUTES.some((route) => route.id === routeId);
}

function normalizeRouteId(routeId) {
  return isKnownRoute(routeId) ? routeId : "dashboard";
}

function routeFromPathname(pathname) {
  const segments = String(pathname ?? "")
    .split("/")
    .filter(Boolean);

  if (!segments.length) {
    return "dashboard";
  }

  if (segments[0] === "app") {
    return normalizeRouteId(segments[1] ?? "dashboard");
  }

  return normalizeRouteId(segments[0] ?? "dashboard");
}

function routeFromHash(hash) {
  const normalizedHash = String(hash ?? "").replace(/^#\/?/, "").trim();
  if (!normalizedHash) {
    return null;
  }

  return normalizeRouteId(normalizedHash.split("/")[0]);
}

function hasExplicitRouteInPathname(pathname) {
  const segments = String(pathname ?? "")
    .split("/")
    .filter(Boolean);

  if (!segments.length) {
    return false;
  }

  if (segments[0] === "app") {
    return Boolean(segments[1] && isKnownRoute(segments[1]));
  }

  return isKnownRoute(segments[0]);
}

function shouldRestoreSessionFromLocation() {
  return Boolean(routeFromHash(window.location.hash) || hasExplicitRouteInPathname(window.location.pathname));
}

function syncRouteFromLocation() {
  const hashRoute = routeFromHash(window.location.hash);
  state.route = hashRoute ?? routeFromPathname(window.location.pathname);
}

function routeBasePath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[0] === "app" ? "/app" : "";
}

function syncLocationWithRoute() {
  if (typeof window.history?.replaceState !== "function") {
    return;
  }

  const targetPath = isAuthenticated()
    ? `${routeBasePath()}/${normalizeRouteId(state.route)}`.replace(/\/{2,}/g, "/")
    : "/";
  const targetUrl = `${targetPath}${window.location.search}`;
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (currentUrl === targetUrl && !window.location.hash) {
    return;
  }

  window.history.replaceState(null, "", targetUrl);
}

function currentRole() {
  return state.session?.user?.role ?? null;
}

function visibleRoutes() {
  const role = currentRole();
  if (role === "CASHIER") {
    return ROUTES.filter((route) => ["dashboard", "customers", "billing", "operations", "settings"].includes(route.id));
  }
  if (role === "MANAGER") {
    return ROUTES.filter((route) => route.id !== "settings");
  }
  return ROUTES;
}

function canAccessRoute(routeId) {
  return visibleRoutes().some((route) => route.id === routeId);
}

function normalizedSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function searchTokens(value) {
  return normalizedSearch(value)
    .split(" ")
    .filter((token) => token && !["store", "stores", "shop", "shops"].includes(token));
}

function matchesSearch(values, query) {
  const needle = normalizedSearch(query);
  if (!needle) {
    return true;
  }

  const haystack = values.map((value) => normalizedSearch(value)).filter(Boolean).join(" ");
  if (!haystack) {
    return false;
  }

  if (haystack.includes(needle)) {
    return true;
  }

  const tokens = searchTokens(query);
  if (!tokens.length) {
    return false;
  }

  const matchedTokenCount = tokens.filter((token) => haystack.includes(token)).length;
  return matchedTokenCount >= Math.max(1, Math.min(tokens.length, 2));
}

function compareByDateDesc(left, right, key) {
  return new Date(right?.[key] ?? 0).getTime() - new Date(left?.[key] ?? 0).getTime();
}

function setFeedback(type, text) {
  state.feedback = { type, text };
}

function clearFeedback() {
  state.feedback = null;
}

function syncTheme() {
  document.documentElement.dataset.theme = state.ui.theme;
  localStorage.setItem(STORAGE_KEYS.theme, state.ui.theme);
}

function startLoading(label) {
  state.loading = true;
  state.loadingLabel = label ?? "Working";
  render();
}

function stopLoading() {
  state.loading = false;
  render();
}

function logout(message) {
  state.session = null;
  writeStorage(STORAGE_KEYS.session, null);
  state.data = createEmptyData();
  state.route = "dashboard";
  state.ui.authMode = "login";
  state.ui.mobileSidebarOpen = false;
  state.ui.productEditId = null;
  state.ui.customerHistory = null;
  state.ui.aiProductId = "";
  state.ui.barcodeQuery = "";
  state.ui.globalSearch = "";
  state.ui.storeFilter = "all";
  state.ui.productFilter = "all";
  state.ui.productInsights = { recommendations: [], dynamicPricing: null };
  state.ui.lastBill = null;
  state.ui.billingDraft = createBillingDraft();
  state.ui.supplyDraft = createSupplyDraft();
  if (message) {
    setFeedback("error", message);
  }
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function numberOrDefault(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function summarizeError(error, fallback) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return `Backend is unreachable at ${state.apiBase}. Start the API on http://127.0.0.1:4000 and try again.`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

async function api(path, options = {}) {
  const { method = "GET", body, auth = true } = options;
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && state.session?.token) {
    headers.Authorization = `Bearer ${state.session.token}`;
  }

  const response = await fetch(`${state.apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;
  const message =
    payload?.message ??
    payload?.error ??
    payload?.details?.[0]?.message ??
    `Request failed with status ${response.status}`;

  if (!response.ok) {
    if (response.status === 401 && auth) {
      logout("Your session expired or the token is invalid. Please sign in again.");
    }
    throw new Error(message);
  }

  return payload?.data ?? payload;
}

async function fetchHealth() {
  try {
    const response = await fetch(`${getBackendBase()}/health`);
    const payload = safeJsonParse(await response.text());
    if (!response.ok) {
      throw new Error(payload?.message ?? "Unable to reach backend health endpoint");
    }
    return payload?.data ?? payload;
  } catch (error) {
    throw new Error(summarizeError(error, "Unable to reach backend health endpoint"));
  }
}

function ensureDraftDefaults() {
  const defaultStoreId = state.session?.user?.store?.id ?? state.data.stores[0]?.id ?? "";
  if (!state.ui.billingDraft.storeId) {
    state.ui.billingDraft.storeId = defaultStoreId;
  }
  if (!state.ui.supplyDraft.storeId) {
    state.ui.supplyDraft.storeId = defaultStoreId;
  }
  if (!state.ui.aiProductId && state.data.products.length > 0) {
    state.ui.aiProductId = state.data.products[0].id;
  }
}

async function hydrateAppData(options = {}) {
  const { showSuccess = false } = options;
  if (!state.session?.token) {
    render();
    return;
  }

  const reportDays = Math.max(1, Math.round(numberOrDefault(state.ui.dashboardRangeDays, 30)));

  startLoading("Loading dashboards, POS, operations, and AI insights");

  const tasks = {
    stores: api("/stores"),
    products: api("/products"),
    inventory: api("/inventory"),
    lowStock: api("/inventory/low-stock"),
    customers: api("/customers"),
    orders: api("/orders"),
    notifications: api("/ops/notifications"),
    auditLogs: api("/ops/audit-logs"),
    dashboard: api("/reports/dashboard"),
    sales: api(`/reports/sales?days=${reportDays}`),
    profit: api(`/reports/profit?days=${reportDays}`),
    inventoryReport: api("/reports/inventory"),
    demandForecast: api("/ai/demand-forecast"),
    inventoryAlerts: api("/ai/inventory-alerts"),
    fraudDetections: api("/ai/fraud-detection"),
    schema: api("/database/schema", { auth: false }),
    health: fetchHealth()
  };

  if (hasRole("ADMIN")) {
    tasks.users = api("/users");
  }

  const keys = Object.keys(tasks);
  const results = await Promise.allSettled(Object.values(tasks));
  const nextData = createEmptyData();
  const failures = [];

  keys.forEach((key, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      nextData[key] = result.value ?? nextData[key];
      return;
    }

    failures.push(`${key}: ${summarizeError(result.reason, "Unknown error")}`);
  });

  state.data = nextData;
  if (!canAccessRoute(state.route)) {
    state.route = visibleRoutes()[0]?.id ?? "dashboard";
  }
  ensureDraftDefaults();

  if (state.ui.customerHistory?.id) {
    await refreshCustomerHistory(state.ui.customerHistory.id, false);
  }

  if (state.ui.aiProductId) {
    await refreshProductInsights(false);
  }

  if (failures.length > 0) {
    setFeedback("error", `Some modules could not load. ${failures.slice(0, 3).join(" | ")}`);
  } else if (showSuccess) {
    setFeedback("success", "Control center is synced with the backend.");
  }

  stopLoading();
}

async function login(email, password, apiBase) {
  state.apiBase = apiBase || state.apiBase;
  localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
  startLoading("Signing in to Retail RMS");

  try {
    const data = await api("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password }
    });

    const nextSession = normalizeSession(data);
    if (!nextSession) {
      throw new Error("Login succeeded but no authentication token was returned.");
    }

    state.session = nextSession;
    state.route = "dashboard";
    writeStorage(STORAGE_KEYS.session, nextSession);
    state.ui.authMode = "login";
    state.ui.mobileSidebarOpen = false;
    clearFeedback();
    ensureDraftDefaults();
    render();
    await hydrateAppData({ showSuccess: true });
  } catch (error) {
    setFeedback("error", summarizeError(error, "Unable to sign in"));
    stopLoading();
  }
}

async function signup(payload) {
  state.apiBase = payload.apiBase || state.apiBase;
  localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
  startLoading("Creating user account");

  try {
    await api("/auth/register", {
      method: "POST",
      auth: false,
      body: {
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        storeId: payload.storeId || undefined
      }
    });

    state.ui.authMode = "login";
    setFeedback("success", "Account created successfully. Sign in with your new credentials.");
    stopLoading();
  } catch (error) {
    setFeedback("error", summarizeError(error, "Unable to sign up"));
    stopLoading();
  }
}

function filteredProducts() {
  const search = state.ui.globalSearch;
  const storeFilter = state.ui.storeFilter;
  const productFilter = state.ui.productFilter;
  const inventoryByProductId = new Map();
  const hasSearch = Boolean(normalizedSearch(search));
  const hasGlobalProductMatch = hasSearch
    ? state.data.products.some((product) =>
        matchesSearch([product.productId, product.name, product.category, product.barcode], search)
      )
    : false;
  const matchingStores = hasSearch
    ? state.data.stores.filter((store) => matchesSearch([store.code, store.name, store.city], search))
    : [];
  const hasStoreOnlySearch = matchingStores.length > 0 && !hasGlobalProductMatch;

  state.data.inventory.forEach((item) => {
    const current = inventoryByProductId.get(item.product.id) ?? 0;
    const includeStore = storeFilter === "all" || item.store.id === storeFilter;
    if (includeStore) {
      inventoryByProductId.set(item.product.id, current + Number(item.stock ?? 0));
    }
  });

  const list = state.data.products.filter((product) => {
    const relatedInventory = state.data.inventory.filter((item) => item.product.id === product.id);
    const visibleInventory = relatedInventory.filter((item) => storeFilter === "all" || item.store.id === storeFilter);
    const storeMatch = storeFilter === "all" || visibleInventory.length > 0;
    const storeSearchValues = visibleInventory.flatMap((item) => [
      item.store?.code,
      item.store?.name,
      item.store?.city,
      item.warehouseLocation
    ]);
    const productSearchValues = [product.productId, product.name, product.category, product.barcode];
    const productMatchesSearch = matchesSearch(productSearchValues, search);
    const relatedStoreMatchesSearch = storeSearchValues.length > 0 && matchesSearch(storeSearchValues, search);
    const searchMatch =
      !hasSearch || productMatchesSearch || relatedStoreMatchesSearch || (hasStoreOnlySearch && !relatedStoreMatchesSearch);

    return (
      (productFilter === "all" || product.id === productFilter) &&
      storeMatch &&
      searchMatch
    );
  });

  const sorted = [...list];
  if (state.ui.productSort === "name") {
    sorted.sort((left, right) => left.name.localeCompare(right.name));
  } else if (state.ui.productSort === "price-high") {
    sorted.sort((left, right) => Number(right.price) - Number(left.price));
  } else if (state.ui.productSort === "stock-low") {
    sorted.sort((left, right) => (inventoryByProductId.get(left.id) ?? 0) - (inventoryByProductId.get(right.id) ?? 0));
  } else {
    sorted.sort((left, right) => compareByDateDesc(left, right, "updatedAt"));
  }

  return sorted;
}

function filteredStores() {
  const list = state.data.stores.filter((store) => {
    const storeMatch = state.ui.storeFilter === "all" || store.id === state.ui.storeFilter;
    const inventoryForStore = state.data.inventory.filter((item) => item.store.id === store.id);
    const productMatch =
      state.ui.productFilter === "all" || inventoryForStore.some((item) => item.product.id === state.ui.productFilter);
    const stockedProductValues = inventoryForStore.flatMap((item) => [
      item.product?.productId,
      item.product?.name,
      item.product?.category,
      item.warehouseLocation
    ]);

    return (
      storeMatch &&
      productMatch &&
      matchesSearch([store.code, store.name, store.city, ...stockedProductValues], state.ui.globalSearch)
    );
  });

  return [...list].sort((left, right) => compareByDateDesc(left, right, "createdAt"));
}

function filteredInventory() {
  const list = state.data.inventory.filter((item) => {
    const storeMatch = state.ui.storeFilter === "all" || item.store.id === state.ui.storeFilter;
    const productMatch = state.ui.productFilter === "all" || item.product.id === state.ui.productFilter;
    return productMatch && storeMatch && matchesSearch([item.product.productId, item.product.name, item.store.name, item.warehouseLocation], state.ui.globalSearch);
  });

  const sorted = [...list];
  if (state.ui.inventorySort === "stock-high") {
    sorted.sort((left, right) => Number(right.stock) - Number(left.stock));
  } else if (state.ui.inventorySort === "store") {
    sorted.sort((left, right) => left.store.name.localeCompare(right.store.name));
  } else {
    sorted.sort((left, right) => (left.stock - left.product.reorderLevel) - (right.stock - right.product.reorderLevel));
  }
  return sorted;
}

function filteredCustomers() {
  const list = state.data.customers.filter((customer) =>
    matchesSearch([customer.name, customer.phone, customer.email], state.ui.globalSearch)
  );

  const sorted = [...list];
  if (state.ui.customerSort === "spend") {
    sorted.sort((left, right) => Number(right.totalSpent ?? 0) - Number(left.totalSpent ?? 0));
  } else if (state.ui.customerSort === "name") {
    sorted.sort((left, right) => left.name.localeCompare(right.name));
  } else {
    sorted.sort((left, right) => compareByDateDesc(left, right, "updatedAt"));
  }
  return sorted;
}

function filteredOrders() {
  const list = state.data.orders.filter((order) => {
    const storeMatch = state.ui.storeFilter === "all" || order.store?.id === state.ui.storeFilter;
    const productMatch =
      state.ui.productFilter === "all" ||
      (order.items ?? []).some((item) => item.product?.id === state.ui.productFilter);
    return productMatch && storeMatch && matchesSearch([order.orderNumber, order.type, order.status, order.store?.name, order.createdBy?.fullName], state.ui.globalSearch);
  });

  const sorted = [...list];
  if (state.ui.orderSort === "value") {
    sorted.sort((left, right) => Number(right.totalAmount ?? 0) - Number(left.totalAmount ?? 0));
  } else if (state.ui.orderSort === "status") {
    sorted.sort((left, right) => String(left.status).localeCompare(String(right.status)));
  } else {
    sorted.sort((left, right) => compareByDateDesc(left, right, "createdAt"));
  }
  return sorted;
}

function dashboardSalesSeries() {
  const cutoff = Date.now() - Math.max(1, numberOrDefault(state.ui.dashboardRangeDays, 30)) * 24 * 60 * 60 * 1000;
  const orders = filteredOrders()
    .filter((order) => order.type === "SALE")
    .filter((order) => new Date(order.createdAt ?? 0).getTime() >= cutoff)
    .slice(0, 12)
    .reverse();
  return orders.map((order) => ({
    label: order.orderNumber,
    value: Number(order.totalAmount ?? 0)
  }));
}

function revenueByCategory() {
  const totals = new Map();
  const cutoff = Date.now() - Math.max(1, numberOrDefault(state.ui.dashboardRangeDays, 30)) * 24 * 60 * 60 * 1000;

  filteredOrders()
    .filter((order) => order.type === "SALE")
    .filter((order) => new Date(order.createdAt ?? 0).getTime() >= cutoff)
    .forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const key = item.product?.category ?? "Uncategorized";
        totals.set(key, (totals.get(key) ?? 0) + Number(item.lineTotal ?? item.unitPrice ?? 0));
      });
    });

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
}

function profitDistribution() {
  const profit = state.data.profit;
  if (!profit) {
    return [];
  }

  const gross = Math.max(0, Number(profit.grossProfit ?? 0));
  const costs = Math.max(0, Number(profit.totalCost ?? 0));
  const tax = Math.max(0, Number(state.data.sales?.taxCollected ?? 0));
  return [
    { label: "Gross Profit", value: gross, tone: "var(--accent)" },
    { label: "Cost Base", value: costs, tone: "var(--surface-dark)" },
    { label: "Tax", value: tax, tone: "var(--warning)" }
  ].filter((item) => item.value > 0);
}

function salesByStore() {
  const totals = new Map();
  filteredOrders()
    .filter((order) => order.type === "SALE")
    .forEach((order) => {
      const key = order.store?.name ?? "Unassigned";
      totals.set(key, (totals.get(key) ?? 0) + Number(order.totalAmount ?? 0));
    });

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
}

function predictionHighlights() {
  const forecast = [...state.data.demandForecast]
    .sort((left, right) => Number(right.predictedDemand ?? 0) - Number(left.predictedDemand ?? 0))
    .slice(0, 4)
    .map((item) => ({
      title: item.name,
      detail: `Predicted demand ${item.predictedDemand} units`,
      note: `30d: ${item.soldLast30Days} | 90d: ${item.soldLast90Days}`
    }));

  const alerts = [...state.data.inventoryAlerts]
    .filter((item) => item.risk !== "BALANCED")
    .slice(0, 3)
    .map((item) => ({
      title: `${item.productName} | ${item.store}`,
      detail: `${item.risk} risk with ${item.daysOfCover} days of cover`,
      note: `Current stock ${item.currentStock} | Monthly demand ${item.predictedMonthlyDemand}`
    }));

  return [...forecast, ...alerts].slice(0, 6);
}

async function refreshCustomerHistory(customerId, announce = true) {
  if (!customerId) {
    state.ui.customerHistory = null;
    render();
    return;
  }

  try {
    if (announce) {
      startLoading("Loading customer history");
    }
    state.ui.customerHistory = await api(`/customers/${customerId}/history`);
    if (announce) {
      stopLoading();
    } else {
      render();
    }
  } catch (error) {
    setFeedback("error", summarizeError(error, "Unable to load customer history"));
    if (announce) {
      stopLoading();
    } else {
      render();
    }
  }
}

async function refreshProductInsights(announce = true) {
  const productId = state.ui.aiProductId;
  if (!productId) {
    state.ui.productInsights = { recommendations: [], dynamicPricing: null };
    render();
    return;
  }

  try {
    if (announce) {
      startLoading("Loading AI product intelligence");
    }

    const [recommendations, dynamicPricing] = await Promise.all([
      api(`/ai/recommendations/${productId}`),
      api(`/ai/dynamic-pricing/${productId}`)
    ]);

    state.ui.productInsights = { recommendations, dynamicPricing };
    if (announce) {
      stopLoading();
    } else {
      render();
    }
  } catch (error) {
    setFeedback("error", summarizeError(error, "Unable to load AI product insights"));
    if (announce) {
      stopLoading();
    } else {
      render();
    }
  }
}

function findProduct(productId) {
  return state.data.products.find((item) => item.id === productId) ?? null;
}

function findStore(storeId) {
  return state.data.stores.find((item) => item.id === storeId) ?? null;
}

function billingStockByProductId(storeId) {
  const totals = new Map();

  state.data.inventory
    .filter((item) => item.store.id === storeId)
    .forEach((item) => {
      totals.set(item.product.id, (totals.get(item.product.id) ?? 0) + Number(item.stock ?? 0));
    });

  return totals;
}

function availableBillingProducts(storeId) {
  if (!storeId) {
    return state.data.products;
  }

  const stockByProductId = billingStockByProductId(storeId);
  return state.data.products.filter((product) => (stockByProductId.get(product.id) ?? 0) > 0);
}

function syncBillingDraftForStore(storeId) {
  const availableProductIds = new Set(availableBillingProducts(storeId).map((product) => product.id));

  state.ui.billingDraft.items.forEach((item) => {
    if (item.productId && !availableProductIds.has(item.productId)) {
      item.productId = "";
      item.unitPrice = "";
    }
  });
}

function validateBillingDraft(draft) {
  if (!draft.storeId) {
    return "Billing requires a store.";
  }

  const store = findStore(draft.storeId);
  const stockByProductId = billingStockByProductId(draft.storeId);
  const requestedByProductId = new Map();

  for (const item of draft.items.filter((entry) => entry.productId)) {
    requestedByProductId.set(
      item.productId,
      (requestedByProductId.get(item.productId) ?? 0) + Math.max(1, Math.round(numberOrDefault(item.quantity, 1)))
    );
  }

  for (const [productId, quantity] of requestedByProductId.entries()) {
    const product = findProduct(productId);
    const available = stockByProductId.get(productId) ?? 0;

    if (available <= 0) {
      return `${product?.name ?? "Selected product"} is not stocked in ${store?.name ?? "the selected store"}.`;
    }

    if (quantity > available) {
      return `Only ${available} units of ${product?.name ?? "the selected product"} are available in ${store?.name ?? "the selected store"}.`;
    }
  }

  return null;
}

function computeDraftSummary(draft) {
  let subTotal = 0;
  let taxAmount = 0;

  draft.items.forEach((item) => {
    const product = findProduct(item.productId);
    if (!product) {
      return;
    }

    const quantity = Math.max(0, numberOrDefault(item.quantity, 0));
    const unitPrice =
      item.unitPrice !== "" ? numberOrDefault(item.unitPrice, Number(product.price)) : Number(product.price);
    const taxRate =
      item.taxRate !== "" ? numberOrDefault(item.taxRate, 18) : numberOrDefault(draft.taxRate, 18);

    const lineSubTotal = unitPrice * quantity;
    const lineTax = (lineSubTotal * taxRate) / 100;

    subTotal += lineSubTotal;
    taxAmount += lineTax;
  });

  const discountAmount = numberOrDefault(draft.discountAmount, 0);
  const totalAmount = subTotal + taxAmount - discountAmount;
  const paymentTotal = Array.isArray(draft.payments)
    ? draft.payments.reduce((sum, payment) => sum + numberOrDefault(payment.amount, 0), 0)
    : 0;

  return {
    itemsCount: draft.items.length,
    subTotal: Number(subTotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentTotal: Number(paymentTotal.toFixed(2))
  };
}

function buildDraftPayload(draft, type) {
  const items = draft.items
    .filter((item) => item.productId)
    .map((item) => {
      const payload = {
        productId: item.productId,
        quantity: Math.max(1, Math.round(numberOrDefault(item.quantity, 1)))
      };

      if (item.unitPrice !== "") {
        payload.unitPrice = numberOrDefault(item.unitPrice, 0);
      }
      if (item.taxRate !== "") {
        payload.taxRate = numberOrDefault(item.taxRate, 0);
      }

      return payload;
    });

  const payload = {
    storeId: draft.storeId,
    discountAmount: numberOrDefault(draft.discountAmount, 0),
    taxRate: numberOrDefault(draft.taxRate, 18),
    notes: draft.notes || undefined,
    items
  };

  if (type === "billing") {
    payload.customerId = draft.customerId || undefined;
    payload.payments = draft.payments
      .filter((payment) => payment.amount !== "")
      .map((payment) => ({
        method: payment.method,
        amount: numberOrDefault(payment.amount, 0),
        reference: payment.reference || undefined
      }));
  }

  if (type === "supply") {
    payload.type = "SUPPLY";
    payload.status = draft.status;
    payload.supplierName = draft.supplierName || undefined;
  }

  return payload;
}

function roleRestriction(allowed) {
  return allowed ? "" : `<div class="permission-note">This action is limited by your current role.</div>`;
}

function renderOptions(list, valueKey, labelBuilder, selectedValue, placeholder) {
  const placeholderMarkup = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "";
  const optionMarkup = list
    .map((item) => {
      const value = item[valueKey];
      const label = labelBuilder(item);
      return `<option value="${escapeHtml(value)}" ${
        String(value) === String(selectedValue) ? "selected" : ""
      }>${escapeHtml(label)}</option>`;
    })
    .join("");

  return `${placeholderMarkup}${optionMarkup}`;
}

function renderMetricCard(label, value, note) {
  return `
    <article class="metric-card interactive-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      <div class="metric-note">${escapeHtml(note)}</div>
    </article>
  `;
}

function renderSkeletonBlock(lines = 3) {
  return `
    <div class="skeleton-card">
      ${Array.from({ length: lines }, () => `<div class="skeleton-line"></div>`).join("")}
    </div>
  `;
}

function renderFilterToolbar() {
  const showSort =
    state.route === "catalog" ||
    state.route === "inventory" ||
    state.route === "customers" ||
    state.route === "orders";
  const showProductFilter = ["dashboard", "catalog", "inventory", "billing", "orders", "ai"].includes(state.route);

  let sortOptions = "";
  let sortValue = "";

  if (state.route === "catalog") {
    sortValue = state.ui.productSort;
    sortOptions = `
      <option value="updated" ${sortValue === "updated" ? "selected" : ""}>Newest Products</option>
      <option value="name" ${sortValue === "name" ? "selected" : ""}>Name A-Z</option>
      <option value="price-high" ${sortValue === "price-high" ? "selected" : ""}>Highest Price</option>
      <option value="stock-low" ${sortValue === "stock-low" ? "selected" : ""}>Lowest Stock</option>
    `;
  } else if (state.route === "inventory") {
    sortValue = state.ui.inventorySort;
    sortOptions = `
      <option value="risk" ${sortValue === "risk" ? "selected" : ""}>Highest Risk</option>
      <option value="stock-high" ${sortValue === "stock-high" ? "selected" : ""}>Highest Stock</option>
      <option value="store" ${sortValue === "store" ? "selected" : ""}>Store Name</option>
    `;
  } else if (state.route === "customers") {
    sortValue = state.ui.customerSort;
    sortOptions = `
      <option value="recent" ${sortValue === "recent" ? "selected" : ""}>Recently Updated</option>
      <option value="spend" ${sortValue === "spend" ? "selected" : ""}>Highest Spend</option>
      <option value="name" ${sortValue === "name" ? "selected" : ""}>Name A-Z</option>
    `;
  } else if (state.route === "orders") {
    sortValue = state.ui.orderSort;
    sortOptions = `
      <option value="recent" ${sortValue === "recent" ? "selected" : ""}>Most Recent</option>
      <option value="value" ${sortValue === "value" ? "selected" : ""}>Highest Value</option>
      <option value="status" ${sortValue === "status" ? "selected" : ""}>Status</option>
    `;
  }

  return `
    <section class="toolbar-card">
      <div class="toolbar-grid">
        <div class="field">
          <label for="globalSearch">Search</label>
          <input id="globalSearch" data-ui-field="globalSearch" value="${escapeHtml(state.ui.globalSearch)}" placeholder="Search records, products, stores, or people" />
        </div>
        <div class="field">
          <label for="storeFilter">Store Filter</label>
          <select id="storeFilter" data-ui-field="storeFilter">
            <option value="all" ${state.ui.storeFilter === "all" ? "selected" : ""}>All stores</option>
            ${renderOptions(state.data.stores, "id", (store) => `${store.code} - ${store.name}`, state.ui.storeFilter, "")}
          </select>
        </div>
        ${
          showProductFilter
            ? `
              <div class="field">
                <label for="productFilter">Product Filter</label>
                <select id="productFilter" data-ui-field="productFilter">
                  <option value="all" ${state.ui.productFilter === "all" ? "selected" : ""}>All products</option>
                  ${renderOptions(state.data.products, "id", (product) => `${product.productId} - ${product.name}`, state.ui.productFilter, "")}
                </select>
              </div>
            `
            : ""
        }
        ${
          state.route === "dashboard"
            ? `
              <div class="field">
                <label for="dashboardRangeDays">Dashboard Window</label>
                <select id="dashboardRangeDays" data-ui-field="dashboardRangeDays">
                  <option value="7" ${state.ui.dashboardRangeDays === "7" ? "selected" : ""}>Last 7 days</option>
                  <option value="30" ${state.ui.dashboardRangeDays === "30" ? "selected" : ""}>Last 30 days</option>
                  <option value="90" ${state.ui.dashboardRangeDays === "90" ? "selected" : ""}>Last 90 days</option>
                </select>
              </div>
              `
            : showSort
              ? `
                <div class="field">
                  <label for="sortSelect">Sort</label>
                  <select id="sortSelect" data-ui-field="${
                    state.route === "catalog"
                      ? "productSort"
                      : state.route === "inventory"
                        ? "inventorySort"
                        : state.route === "customers"
                          ? "customerSort"
                          : "orderSort"
                  }">
                    ${sortOptions}
                  </select>
                </div>
              `
              : `
                <div class="detail-card toolbar-note">
                  <span class="subdued-label">Role Mode</span>
                  <strong>${escapeHtml(currentRole() ?? "Guest")}</strong>
                </div>
              `
        }
      </div>
    </section>
  `;
}

function renderEmptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderStatusChip(label, variant) {
  return `<span class="status-chip ${escapeHtml(variant)}">${escapeHtml(label)}</span>`;
}

function renderSeverityChip(label) {
  const variant = String(label || "info").toLowerCase();
  return `<span class="severity-chip ${escapeHtml(variant)}">${escapeHtml(label)}</span>`;
}

function renderLineChart(points) {
  if (!points.length) {
    return renderEmptyState("No sales trend data available for the current filters.");
  }

  const width = 440;
  const height = 180;
  const padding = 18;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const step = points.length === 1 ? width - padding * 2 : (width - padding * 2) / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = padding + step * index;
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    return { ...point, x, y };
  });
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Sales trend chart">
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"></path>
      ${coords
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="4.5" fill="var(--surface-strong)"></circle>
            <circle cx="${point.x}" cy="${point.y}" r="3" fill="var(--accent)"></circle>
            <title>${point.label}: ${formatCurrency(point.value)}</title>
          `
        )
        .join("")}
    </svg>
    <div class="chart-legend">
      ${coords
        .map((point) => `<span class="mini-chip">${escapeHtml(point.label)} · ${escapeHtml(formatCurrency(point.value))}</span>`)
        .join("")}
    </div>
  `;
}

function renderBarChart(items) {
  if (!items.length) {
    return renderEmptyState("No category revenue data available for the current filters.");
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return `
    <div class="chart-bars chart-bars-strong">
      ${items
        .map((item) => {
          const width = (item.value / maxValue) * 100;
          return `
            <div class="chart-row" data-tooltip="${escapeHtml(`${item.label}: ${formatCurrency(item.value)}`)}">
              <strong>${escapeHtml(item.label)}</strong>
              <div class="chart-track"><div class="chart-fill" style="width: ${width}%;"></div></div>
              <span>${escapeHtml(formatCurrency(item.value))}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDonutChart(items) {
  if (!items.length) {
    return renderEmptyState("No profit distribution data is available yet.");
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  const segments = items
    .map((item) => {
      const dash = (item.value / total) * 100;
      const segment = `<circle r="36" cx="50" cy="50" fill="transparent" stroke="${item.tone}" stroke-width="12" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="${-offset}" pathLength="100"></circle>`;
      offset += dash;
      return segment;
    })
    .join("");

  return `
    <div class="donut-layout">
      <svg viewBox="0 0 100 100" class="donut-chart" role="img" aria-label="Profit distribution chart">
        <circle r="36" cx="50" cy="50" fill="transparent" stroke="rgba(15, 45, 50, 0.08)" stroke-width="12"></circle>
        ${segments}
      </svg>
      <div class="donut-legend">
        ${items
          .map(
            (item) => `
              <div class="legend-row" data-tooltip="${escapeHtml(`${item.label}: ${formatCurrency(item.value)}`)}">
                <span class="legend-swatch" style="background:${item.tone};"></span>
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(formatCurrency(item.value))}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function exportRows(filename, rows) {
  if (!rows.length) {
    setFeedback("error", "There is no data to export for the current view.");
    render();
    return;
  }

  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function currentRouteExportRows() {
  if (state.route === "catalog") {
    return [
      ["Product ID", "Name", "Category", "Price", "Cost Price", "Reorder Level", "Status"],
      ...filteredProducts().map((product) => [
        product.productId,
        product.name,
        product.category,
        product.price,
        product.costPrice,
        product.reorderLevel,
        product.isActive ? "ACTIVE" : "INACTIVE"
      ])
    ];
  }

  if (state.route === "inventory") {
    return [
      ["Product", "Store", "Stock", "Reserved", "Warehouse"],
      ...filteredInventory().map((item) => [
        item.product.name,
        item.store.name,
        item.stock,
        item.reservedStock,
        item.warehouseLocation ?? ""
      ])
    ];
  }

  if (state.route === "customers") {
    return [
      ["Name", "Phone", "Email", "Total Spent"],
      ...filteredCustomers().map((customer) => [customer.name, customer.phone, customer.email ?? "", customer.totalSpent ?? 0])
    ];
  }

  if (state.route === "orders" || state.route === "dashboard") {
    return [
      ["Order No", "Type", "Status", "Store", "Customer", "Total"],
      ...filteredOrders().map((order) => [
        order.orderNumber,
        order.type,
        order.status,
        order.store?.name ?? "",
        order.customer?.name ?? "Walk-in",
        order.totalAmount ?? 0
      ])
    ];
  }

  if (state.route === "ai") {
    return [
      ["Product ID", "Name", "30d Sold", "90d Sold", "Predicted Demand"],
      ...state.data.demandForecast.map((row) => [row.productId, row.name, row.soldLast30Days, row.soldLast90Days, row.predictedDemand])
    ];
  }

  return [
    ["Notification", "Severity", "Created At"],
    ...state.data.notifications.map((notification) => [notification.title, notification.severity, notification.createdAt])
  ];
}

function routeTitle() {
  const route = ROUTES.find((item) => item.id === state.route);
  return route?.label ?? "Retail RMS";
}

function routeDescription() {
  switch (state.route) {
    case "dashboard":
      return "Track live revenue, margin posture, stock risk, and operational velocity from one control surface.";
    case "catalog":
      return "Manage stores and product master data with role-aware actions tied to the live backend.";
    case "inventory":
      return "Control stock, low-stock risk, and replenishment updates by store and product.";
    case "customers":
      return "Build the customer base and inspect purchase history directly from recorded orders.";
    case "billing":
      return "Run the POS billing flow with tax, discounts, split payments, and invoice confirmation.";
    case "orders":
      return "Create supply orders and monitor every completed sale or replenishment order.";
    case "operations":
      return "Review notifications, audit trails, and the logical database footprint exposed by the backend.";
    case "ai":
      return "Use forecasting, dynamic pricing, fraud checks, and recommendations against seeded retail data.";
    case "settings":
      return "Tune the API connection, verify environment access, and keep the team aligned on credentials.";
    default:
      return "Retail intelligence across the whole platform.";
  }
}

function renderRoute() {
  switch (state.route) {
    case "catalog":
      return renderCatalog();
    case "inventory":
      return renderInventory();
    case "customers":
      return renderCustomers();
    case "billing":
      return renderBilling();
    case "orders":
      return renderOrders();
    case "operations":
      return renderOperations();
    case "ai":
      return renderAi();
    case "settings":
      return renderSettings();
    case "dashboard":
    default:
      return renderDashboard();
  }
}

function renderApp() {
  const user = state.session?.user;
  const docsHref = `${getBackendBase()}/api-docs`;
  const routes = visibleRoutes();

  return `
    <div class="app-shell">
      <aside class="sidebar ${state.ui.mobileSidebarOpen ? "open" : ""}">
        <div class="sidebar-header">
          <div class="brand-mark">RC</div>
          <div class="brand-chip">Retail Control Center</div>
          <div>
            <div class="card-title">Enterprise execution for stores, stock, billing, and AI decisions.</div>
          </div>
          <div class="stack-row">
            <span class="role-badge">${escapeHtml(user?.role ?? "Unknown")}</span>
            ${user?.store ? `<span class="mini-chip">${escapeHtml(user.store.name)}</span>` : ""}
          </div>
        </div>

        <nav class="sidebar-nav">
          ${routes.map(
            (route) => `
              <button class="nav-button ${state.route === route.id ? "active" : ""}" data-route="${route.id}">
                <span>${escapeHtml(route.label)}</span>
                <span class="mini-chip">${escapeHtml(route.short)}</span>
              </button>
            `
          ).join("")}
        </nav>

        <div class="sidebar-footer">
          <div class="muted">${escapeHtml(user?.fullName ?? "Unknown user")}</div>
          <div class="muted">${escapeHtml(user?.email ?? "")}</div>
          <a class="ghost-button" href="${escapeHtml(docsHref)}" target="_blank" rel="noreferrer">Open Swagger</a>
          <button class="secondary-button" data-action="refresh">Refresh Data</button>
          <button class="ghost-button" data-action="logout">Sign Out</button>
        </div>
      </aside>

      <main class="content-shell">
        <section class="topbar">
          <div>
            <button class="menu-toggle" type="button" data-action="toggle-sidebar">Menu</button>
            <div class="section-eyebrow">Retail Operations</div>
            <h1 class="page-title">${escapeHtml(routeTitle())}</h1>
            <div class="section-copy">${escapeHtml(routeDescription())}</div>
          </div>
          <div class="topbar-actions">
            <button class="ghost-button" type="button" data-action="toggle-theme">
              ${state.ui.theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button class="secondary-button" type="button" data-action="export-csv">Export CSV</button>
            <button class="ghost-button" type="button" data-action="export-pdf">Export PDF</button>
            ${
              state.loading
                ? `<div class="loading-pill"><span class="spinner"></span>${escapeHtml(state.loadingLabel)}</div>`
                : ""
            }
            <span class="mini-chip">${escapeHtml(formatDate(new Date().toISOString()))}</span>
          </div>
        </section>

        ${
          state.feedback
            ? `
              <section class="banner ${escapeHtml(state.feedback.type)}">
                <div>${escapeHtml(state.feedback.text)}</div>
                <button class="icon-button" data-action="clear-feedback">X</button>
              </section>
            `
            : ""
        }

        ${renderFilterToolbar()}
        ${renderRoute()}
      </main>
    </div>
  `;
}

function renderDashboard() {
  const dashboard = state.data.dashboard;
  const sales = state.data.sales;
  const inventoryReport = state.data.inventoryReport;
  const recentOrders = filteredOrders().slice(0, 6);
  const recentNotifications = state.data.notifications.slice(0, 5);
  const lowStockItems = inventoryReport?.lowStockItems ?? [];
  const salesTrend = dashboardSalesSeries();
  const categoryBars = revenueByCategory();
  const profitSlices = profitDistribution();
  const storeBars = salesByStore();
  const predictions = predictionHighlights();
  const role = currentRole();

  if (state.loading && !dashboard) {
    return `
      <section class="page-section">
        <div class="metric-grid">
          ${renderSkeletonBlock(3)}
          ${renderSkeletonBlock(3)}
          ${renderSkeletonBlock(3)}
          ${renderSkeletonBlock(3)}
        </div>
        <div class="dashboard-grid">
          ${renderSkeletonBlock(5)}
          ${renderSkeletonBlock(5)}
        </div>
      </section>
    `;
  }

  if (role === "CASHIER") {
    return `
      <section class="page-section">
        <div class="metric-grid">
          ${renderMetricCard("Today POS Pulse", dashboard ? formatCurrency(dashboard.sales.averageBillValue) : "--", "Average active basket")}
          ${renderMetricCard("Customers", String(state.data.customers.length), "Quick access to repeat shoppers")}
          ${renderMetricCard("Alerts", String(recentNotifications.length), "Latest system messages")}
          ${renderMetricCard("Ready Items", String(state.data.products.filter((product) => product.isActive).length), "Sellable active SKUs")}
        </div>

        <div class="two-column">
          <article class="panel interactive-card">
            <div class="section-eyebrow">Cashier Workspace</div>
            <h2 class="section-title">Fast POS actions</h2>
            <div class="table-subtitle">This role is intentionally focused on billing, customers, and live counter operations.</div>
            <div class="quick-action-grid" style="margin-top: 18px;">
              <button class="secondary-button" type="button" data-route="billing">Open POS</button>
              <button class="secondary-button" type="button" data-route="customers">Customer Lookup</button>
              <button class="secondary-button" type="button" data-route="operations">View Alerts</button>
              <button class="secondary-button" type="button" data-action="refresh">Refresh Counter</button>
            </div>
          </article>

          <article class="table-card interactive-card">
            <div class="section-eyebrow">Live Queue</div>
            <h2 class="section-title">Recent POS bills</h2>
            <div class="timeline" style="margin-top: 18px;">
              ${
                recentOrders.filter((order) => order.type === "SALE").length
                  ? recentOrders
                      .filter((order) => order.type === "SALE")
                      .map(
                        (order) => `
                          <div class="timeline-item">
                            <div class="stack-row">
                              ${renderStatusChip(order.status, "success")}
                              <span class="mini-chip">${escapeHtml(order.orderNumber)}</span>
                            </div>
                            <strong style="margin-top: 10px;">${escapeHtml(formatCurrency(order.totalAmount))}</strong>
                            <div class="muted">${escapeHtml(order.customer?.name ?? "Walk-in customer")}</div>
                          </div>
                        `
                      )
                      .join("")
                  : renderEmptyState("New POS bills will appear here once checkout starts.")
              }
            </div>
          </article>
        </div>

        <article class="table-card interactive-card">
          <div class="section-eyebrow">Counter Notifications</div>
          <h2 class="section-title">Store messages and stock warnings</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${
              recentNotifications.length
                ? recentNotifications
                    .map(
                      (notification) => `
                        <div class="timeline-item">
                          <div class="stack-row">
                            ${renderSeverityChip(notification.severity)}
                            <span class="mini-chip">${escapeHtml(formatDate(notification.createdAt))}</span>
                          </div>
                          <strong style="margin-top: 10px;">${escapeHtml(notification.title)}</strong>
                          <div class="muted">${escapeHtml(notification.message)}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("No counter alerts right now.")
            }
          </div>
        </article>
      </section>
    `;
  }

  if (role === "MANAGER") {
    return `
      <section class="page-section">
        <div class="metric-grid">
          ${renderMetricCard("Revenue", dashboard ? formatCurrency(dashboard.sales.revenue) : "--", "Store-window revenue")}
          ${renderMetricCard("Margin", dashboard ? `${formatNumber(dashboard.profit.marginPercent)}%` : "--", "Profitability snapshot")}
          ${renderMetricCard("Low Stock", String(lowStockItems.length), "Items needing replenishment")}
          ${renderMetricCard("Predictions", String(predictions.length), "AI-led focus areas")}
        </div>

        <div class="dashboard-grid">
          <article class="chart-card interactive-card">
            <div class="section-eyebrow">Store Revenue</div>
            <h2 class="section-title">Sales by store</h2>
            <div class="table-subtitle">Manager-focused view of performance by operating location.</div>
            <div style="margin-top: 18px;">${renderBarChart(storeBars)}</div>
          </article>

          <article class="chart-card interactive-card">
            <div class="section-eyebrow">Demand Signals</div>
            <h2 class="section-title">Top prediction highlights</h2>
            <div class="timeline" style="margin-top: 18px;">
              ${
                predictions.length
                  ? predictions
                      .map(
                        (item) => `
                          <div class="timeline-item">
                            <strong>${escapeHtml(item.title)}</strong>
                            <div class="muted">${escapeHtml(item.detail)}</div>
                            <div class="muted">${escapeHtml(item.note)}</div>
                          </div>
                        `
                      )
                      .join("")
                  : renderEmptyState("AI predictions will appear once forecasting data is available.")
              }
            </div>
          </article>
        </div>

        <div class="two-column">
          <article class="table-card interactive-card">
            <div class="section-eyebrow">Inventory Risk</div>
            <h2 class="section-title">Low stock exposure</h2>
            <div class="table-wrap" style="margin-top: 18px;">
              <table>
                <thead>
                  <tr><th>Product</th><th>Store</th><th>Stock</th><th>Reorder</th></tr>
                </thead>
                <tbody>
                  ${
                    lowStockItems.length
                      ? lowStockItems.slice(0, 8).map((item) => `
                        <tr>
                          <td>${escapeHtml(item.productName)}</td>
                          <td>${escapeHtml(item.store)}</td>
                          <td>${escapeHtml(String(item.stock))}</td>
                          <td>${escapeHtml(String(item.reorderLevel))}</td>
                        </tr>
                      `).join("")
                      : `<tr><td colspan="4">${renderEmptyState("No low stock items right now.")}</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="table-card interactive-card">
            <div class="section-eyebrow">Notifications</div>
            <h2 class="section-title">Operational feed</h2>
            <div class="timeline" style="margin-top: 18px;">
              ${
                recentNotifications.length
                  ? recentNotifications.map((notification) => `
                    <div class="timeline-item">
                      <div class="stack-row">
                        ${renderSeverityChip(notification.severity)}
                        <span class="mini-chip">${escapeHtml(formatDate(notification.createdAt))}</span>
                      </div>
                      <strong style="margin-top: 10px;">${escapeHtml(notification.title)}</strong>
                      <div class="muted">${escapeHtml(notification.message)}</div>
                    </div>
                  `).join("")
                  : renderEmptyState("No operational alerts right now.")
              }
            </div>
          </article>
        </div>
      </section>
    `;
  }

  return `
    <section class="page-section">
      <div class="metric-grid">
        ${renderMetricCard(`Revenue ${state.ui.dashboardRangeDays}d`, dashboard ? formatCurrency(dashboard.sales.revenue) : "--", "From completed sales orders")}
        ${renderMetricCard("Average Bill", dashboard ? formatCurrency(dashboard.sales.averageBillValue) : "--", "Average POS basket value")}
        ${renderMetricCard(
          "Gross Profit",
          dashboard ? formatCurrency(dashboard.profit.grossProfit) : "--",
          dashboard ? `${formatNumber(dashboard.profit.marginPercent)}% margin` : "Waiting for report data"
        )}
        ${renderMetricCard("Low Stock Items", String(lowStockItems.length), "Immediate replenishment watchlist")}
      </div>

      <div class="dashboard-grid dashboard-grid-wide">
        <article class="chart-card interactive-card">
          <div class="section-eyebrow">Sales Trend</div>
          <h2 class="section-title">Revenue movement by recent orders</h2>
          <div class="table-subtitle">Live line chart built from filtered sale orders.</div>
          <div style="margin-top: 18px;">${renderLineChart(salesTrend)}</div>
        </article>

        <article class="chart-card interactive-card">
          <div class="section-eyebrow">Revenue Mix</div>
          <h2 class="section-title">Revenue by category</h2>
          <div class="table-subtitle">Filtered live bar chart for a more professional overview.</div>
          <div style="margin-top: 18px;">${renderBarChart(categoryBars)}</div>
        </article>

        <article class="chart-card interactive-card">
          <div class="section-eyebrow">Regional Sales</div>
          <h2 class="section-title">Sales by store</h2>
          <div class="table-subtitle">Extra widget to reduce empty space and show revenue concentration.</div>
          <div style="margin-top: 18px;">${renderBarChart(storeBars)}</div>
        </article>
      </div>

      <div class="dashboard-grid">
        <article class="chart-card interactive-card">
          <div class="section-eyebrow">Profit Split</div>
          <h2 class="section-title">Profit distribution snapshot</h2>
          <div class="table-subtitle">Donut view of profit, tax, and cost base.</div>
          <div style="margin-top: 18px;">${renderDonutChart(profitSlices)}</div>
        </article>

        <article class="chart-card interactive-card">
          <div class="section-eyebrow">System Pulse</div>
          <h2 class="section-title">${role === "CASHIER" ? "POS operating context" : "Backend posture"}</h2>
          <div class="stat-list" style="margin-top: 18px;">
            <div class="detail-card">
              <span class="subdued-label">Health</span>
              <strong>${escapeHtml(state.data.health?.message ?? "Unavailable")}</strong>
            </div>
            <div class="detail-card">
              <span class="subdued-label">${role === "CASHIER" ? "Active customers" : "Products tracked"}</span>
              <strong>${escapeHtml(String(role === "CASHIER" ? state.data.customers.length : dashboard?.productCount ?? state.data.products.length))}</strong>
            </div>
            <div class="detail-card">
              <span class="subdued-label">${role === "CASHIER" ? "Tax collected" : "Gross margin"}</span>
              <strong>${escapeHtml(
                role === "CASHIER"
                  ? sales
                    ? formatCurrency(sales.taxCollected)
                    : "--"
                  : dashboard
                    ? `${formatNumber(dashboard.profit.marginPercent)}%`
                    : "--"
              )}</strong>
            </div>
            <div class="detail-card">
              <span class="subdued-label">Database tables</span>
              <strong>${escapeHtml(String(state.data.schema?.tables?.length ?? 0))}</strong>
            </div>
          </div>
        </article>
      </div>

      <article class="table-card interactive-card">
        <div class="section-eyebrow">AI Prediction Board</div>
        <h2 class="section-title">High-priority demand and stock signals</h2>
        <div class="three-column" style="margin-top: 18px;">
          ${
            predictions.length
              ? predictions.map((item) => `
                <div class="timeline-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <div class="muted">${escapeHtml(item.detail)}</div>
                  <div class="muted">${escapeHtml(item.note)}</div>
                </div>
              `).join("")
              : renderEmptyState("AI prediction signals will appear here once forecast data is available.")
          }
        </div>
      </article>

      <div class="two-column">
        <article class="table-card interactive-card">
          <div class="section-eyebrow">Risk Watch</div>
          <h2 class="section-title">Low stock exposure</h2>
          <div class="table-wrap" style="margin-top: 18px;">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Store</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                ${
                  lowStockItems.length
                    ? lowStockItems
                        .slice(0, 8)
                        .map(
                          (item) => `
                            <tr>
                              <td>${escapeHtml(item.productName)}</td>
                              <td>${escapeHtml(item.store)}</td>
                              <td>${escapeHtml(String(item.stock))}</td>
                              <td>${escapeHtml(String(item.reorderLevel))}</td>
                            </tr>
                          `
                        )
                        .join("")
                    : `<tr><td colspan="4">${renderEmptyState("No low stock items right now.")}</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="table-card interactive-card">
          <div class="section-eyebrow">Ops Feed</div>
          <h2 class="section-title">Latest notifications</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${
              recentNotifications.length
                ? recentNotifications
                    .map(
                      (notification) => `
                        <div class="timeline-item">
                          <div class="stack-row">
                            ${renderSeverityChip(notification.severity)}
                            <span class="mini-chip">${escapeHtml(formatDate(notification.createdAt))}</span>
                          </div>
                          <strong style="margin-top: 10px;">${escapeHtml(notification.title)}</strong>
                          <div class="muted">${escapeHtml(notification.message)}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("Notifications will appear here when inventory or orders create system events.")
            }
          </div>
        </article>
      </div>

      <article class="table-card interactive-card">
        <div class="section-eyebrow">Order Stream</div>
        <h2 class="section-title">${role === "CASHIER" ? "Recent POS bills" : "Recent orders"}</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Order No</th>
                <th>Type</th>
                <th>Status</th>
                <th>Store</th>
                <th>Total</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentOrders.length
                  ? recentOrders
                      .map(
                        (order) => `
                          <tr>
                            <td>${escapeHtml(order.orderNumber)}</td>
                            <td>${escapeHtml(order.type)}</td>
                            <td>${renderStatusChip(order.status, order.status === "COMPLETED" ? "success" : "warning")}</td>
                            <td>${escapeHtml(order.store?.name ?? "Not linked")}</td>
                            <td>${escapeHtml(formatCurrency(order.totalAmount))}</td>
                            <td>${escapeHtml(order.createdBy?.fullName ?? "System")}</td>
                            <td>${escapeHtml(formatDate(order.createdAt))}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="7">${renderEmptyState("Orders will appear once billing or supply flows are used.")}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderCatalog() {
  const editProduct = state.data.products.find((item) => item.id === state.ui.productEditId) ?? null;
  const canManage = hasRole("ADMIN", "MANAGER");
  const products = filteredProducts();
  const stores = filteredStores();
  const catalogFiltersActive =
    Boolean(normalizedSearch(state.ui.globalSearch)) || state.ui.storeFilter !== "all" || state.ui.productFilter !== "all";

  return `
    <section class="page-section">
      <div class="inline-form-grid">
        <article class="panel interactive-card">
          <div class="section-eyebrow">Product Master</div>
          <h2 class="section-title">${editProduct ? "Update product" : "Create product"}</h2>
          <div class="table-subtitle">Uses the live \`/products\` create and patch endpoints.</div>
          ${roleRestriction(canManage)}
          <form id="product-form" style="margin-top: 18px;">
            <div class="input-grid">
              <div class="field">
                <label for="productId">Product ID</label>
                <input id="productId" name="productId" value="${escapeHtml(editProduct?.productId ?? "")}" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="productName">Name</label>
                <input id="productName" name="name" value="${escapeHtml(editProduct?.name ?? "")}" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="productCategory">Category</label>
                <input id="productCategory" name="category" value="${escapeHtml(editProduct?.category ?? "")}" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="productPrice">Price</label>
                <input id="productPrice" name="price" type="number" step="0.01" value="${escapeHtml(editProduct?.price ?? "")}" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="productCost">Cost Price</label>
                <input id="productCost" name="costPrice" type="number" step="0.01" value="${escapeHtml(editProduct?.costPrice ?? "")}" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="productBarcode">Barcode</label>
                <input id="productBarcode" name="barcode" value="${escapeHtml(editProduct?.barcode ?? "")}" ${canManage ? "" : "disabled"} />
              </div>
              <div class="field">
                <label for="productReorderLevel">Reorder Level</label>
                <input id="productReorderLevel" name="reorderLevel" type="number" value="${escapeHtml(editProduct?.reorderLevel ?? 10)}" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="productActive">Status</label>
                <select id="productActive" name="isActive" ${canManage ? "" : "disabled"}>
                  <option value="true" ${(editProduct?.isActive ?? true) ? "selected" : ""}>Active</option>
                  <option value="false" ${editProduct && !editProduct.isActive ? "selected" : ""}>Inactive</option>
                </select>
              </div>
            </div>
            <div class="field" style="margin-top: 16px;">
              <label for="productDescription">Description</label>
              <textarea id="productDescription" name="description" ${canManage ? "" : "disabled"}>${escapeHtml(editProduct?.description ?? "")}</textarea>
            </div>
            <div class="button-row" style="margin-top: 18px;">
              <button class="primary-button" type="submit" ${canManage ? "" : "disabled"}>${editProduct ? "Save Product" : "Create Product"}</button>
              ${editProduct ? `<button class="secondary-button" type="button" data-action="cancel-product-edit">Cancel Edit</button>` : ""}
            </div>
          </form>
        </article>

        <article class="panel">
          <div class="section-eyebrow">Store Master</div>
          <h2 class="section-title">Register store</h2>
          <div class="table-subtitle">Create a new physical or operating location from the backend store API.</div>
          ${roleRestriction(canManage)}
          <form id="store-form" style="margin-top: 18px;">
            <div class="input-grid">
              <div class="field">
                <label for="storeCode">Store Code</label>
                <input id="storeCode" name="code" placeholder="BLR-002" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="storeName">Store Name</label>
                <input id="storeName" name="name" placeholder="Airport Retail Hub" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="storeCity">City</label>
                <input id="storeCity" name="city" placeholder="Bangalore" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="storeActive">Status</label>
                <select id="storeActive" name="isActive" ${canManage ? "" : "disabled"}>
                  <option value="true" selected>Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div class="button-row" style="margin-top: 18px;">
              <button class="primary-button" type="submit" ${canManage ? "" : "disabled"}>Create Store</button>
            </div>
          </form>
        </article>
      </div>

      <article class="table-card">
        <div class="section-eyebrow">Products</div>
        <h2 class="section-title">Live product catalog</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                products.length
                  ? products
                      .map(
                        (product) => `
                          <tr>
                            <td>${escapeHtml(product.productId)}</td>
                            <td>${escapeHtml(product.name)}</td>
                            <td>${escapeHtml(product.category)}</td>
                            <td>${escapeHtml(formatCurrency(product.price))}</td>
                            <td>${escapeHtml(formatCurrency(product.costPrice))}</td>
                            <td>${escapeHtml(String(product.reorderLevel))}</td>
                            <td>${renderStatusChip(product.isActive ? "ACTIVE" : "INACTIVE", product.isActive ? "success" : "warning")}</td>
                            <td>${escapeHtml(formatDate(product.updatedAt))}</td>
                            <td><button class="secondary-button" type="button" data-action="edit-product" data-id="${escapeHtml(product.id)}" ${canManage ? "" : "disabled"}>Edit</button></td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="9">${renderEmptyState(
                      catalogFiltersActive
                        ? "No products match the current search or filters."
                        : "No products found. Seed data or create the first SKU here."
                    )}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>

      <article class="table-card">
        <div class="section-eyebrow">Stores</div>
        <h2 class="section-title">Current store network</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>City</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${
                stores.length
                  ? stores
                      .map(
                        (store) => `
                          <tr>
                            <td>${escapeHtml(store.code)}</td>
                            <td>${escapeHtml(store.name)}</td>
                            <td>${escapeHtml(store.city)}</td>
                            <td>${renderStatusChip(store.isActive ? "ACTIVE" : "INACTIVE", store.isActive ? "success" : "warning")}</td>
                            <td>${escapeHtml(formatDate(store.createdAt))}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="5">${renderEmptyState(
                      catalogFiltersActive ? "No stores match the current search or filters." : "No stores found yet."
                    )}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderInventory() {
  const canManage = hasRole("ADMIN", "MANAGER");
  const inventoryReport = state.data.inventoryReport;
  const inventoryItems = filteredInventory();

  return `
    <section class="page-section">
      <div class="metric-grid">
        ${renderMetricCard("Total SKUs", String(inventoryReport?.totalSkus ?? state.data.inventory.length), "Unique product-store inventory records")}
        ${renderMetricCard("Total Units", String(inventoryReport?.totalUnits ?? 0), "Combined on-hand quantity")}
        ${renderMetricCard("Low Stock Records", String(state.data.lowStock.length), "Threshold breaches across stores")}
        ${renderMetricCard("Stores Covered", String(state.data.stores.length), "Locations in current workspace")}
      </div>

      <div class="two-column">
        <article class="panel">
          <div class="section-eyebrow">Stock Update</div>
          <h2 class="section-title">Upsert inventory</h2>
          <div class="table-subtitle">Writes directly to \`/inventory/upsert\` and refreshes the low-stock feed.</div>
          ${roleRestriction(canManage)}
          <form id="inventory-form" style="margin-top: 18px;">
            <div class="input-grid">
              <div class="field">
                <label for="inventoryStore">Store</label>
                <select id="inventoryStore" name="storeId" ${canManage ? "" : "disabled"} required>
                  ${renderOptions(state.data.stores, "id", (store) => `${store.code} - ${store.name}`, state.ui.billingDraft.storeId, "Select store")}
                </select>
              </div>
              <div class="field">
                <label for="inventoryProduct">Product</label>
                <select id="inventoryProduct" name="productId" ${canManage ? "" : "disabled"} required>
                  ${renderOptions(state.data.products, "id", (product) => `${product.productId} - ${product.name}`, "", "Select product")}
                </select>
              </div>
              <div class="field">
                <label for="inventoryStock">Stock</label>
                <input id="inventoryStock" name="stock" type="number" min="0" value="0" ${canManage ? "" : "disabled"} required />
              </div>
              <div class="field">
                <label for="inventoryReserved">Reserved Stock</label>
                <input id="inventoryReserved" name="reservedStock" type="number" min="0" value="0" ${canManage ? "" : "disabled"} required />
              </div>
            </div>
            <div class="field" style="margin-top: 16px;">
              <label for="inventoryWarehouse">Warehouse Location</label>
              <input id="inventoryWarehouse" name="warehouseLocation" value="Main Warehouse" ${canManage ? "" : "disabled"} />
            </div>
            <div class="button-row" style="margin-top: 18px;">
              <button class="primary-button" type="submit" ${canManage ? "" : "disabled"}>Save Inventory</button>
            </div>
          </form>
        </article>

        <article class="table-card interactive-card">
          <div class="section-eyebrow">Risk Preview</div>
          <h2 class="section-title">Low stock queue</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${
              state.data.lowStock.length
                ? state.data.lowStock
                    .slice(0, 6)
                    .map(
                      (item) => `
                        <div class="timeline-item">
                          <div class="stack-row">
                            ${renderSeverityChip(item.stock === 0 ? "CRITICAL" : "WARNING")}
                            <span class="mini-chip">${escapeHtml(item.store.name)}</span>
                          </div>
                          <strong style="margin-top: 10px;">${escapeHtml(item.product.name)}</strong>
                          <div class="muted">Current stock: ${escapeHtml(String(item.stock))} | Reorder level: ${escapeHtml(String(item.product.reorderLevel))}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("Inventory looks healthy right now.")
            }
          </div>
        </article>
      </div>

      <article class="table-card">
        <div class="section-eyebrow">Inventory Ledger</div>
        <h2 class="section-title">All inventory records</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Store</th>
                <th>Stock</th>
                <th>Reserved</th>
                <th>Warehouse</th>
                <th>Last Restocked</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              ${
                inventoryItems.length
                  ? inventoryItems
                      .map(
                        (item) => `
                          <tr>
                            <td>${escapeHtml(`${item.product.productId} - ${item.product.name}`)}</td>
                            <td>${escapeHtml(item.store.name)}</td>
                            <td>${escapeHtml(String(item.stock))}</td>
                            <td>${escapeHtml(String(item.reservedStock))}</td>
                            <td>${escapeHtml(item.warehouseLocation ?? "Not set")}</td>
                            <td>${escapeHtml(formatDate(item.lastRestockedAt))}</td>
                            <td>${escapeHtml(formatDate(item.updatedAt))}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="7">${renderEmptyState("No inventory records found.")}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderCustomers() {
  const selectedCustomer = state.ui.customerHistory;
  const customers = filteredCustomers();

  return `
    <section class="page-section">
      <div class="two-column">
        <article class="panel">
          <div class="section-eyebrow">Customer Intake</div>
          <h2 class="section-title">Create customer</h2>
          <div class="table-subtitle">Available to admin, manager, and cashier roles.</div>
          <form id="customer-form" style="margin-top: 18px;">
            <div class="input-grid">
              <div class="field">
                <label for="customerName">Name</label>
                <input id="customerName" name="name" required />
              </div>
              <div class="field">
                <label for="customerPhone">Phone</label>
                <input id="customerPhone" name="phone" required />
              </div>
              <div class="field">
                <label for="customerEmail">Email</label>
                <input id="customerEmail" name="email" type="email" />
              </div>
              <div class="field">
                <label for="customerAddress">Address</label>
                <input id="customerAddress" name="address" />
              </div>
            </div>
            <div class="button-row" style="margin-top: 18px;">
              <button class="primary-button" type="submit">Create Customer</button>
            </div>
          </form>
        </article>

        <article class="table-card interactive-card">
          <div class="section-eyebrow">Purchase History</div>
          <h2 class="section-title">${escapeHtml(selectedCustomer?.name ?? "Select a customer")}</h2>
          ${
            selectedCustomer
              ? `
                <div class="summary-grid" style="margin-top: 18px;">
                  <div class="summary-tile"><span class="subdued-label">Phone</span><strong>${escapeHtml(selectedCustomer.phone)}</strong></div>
                  <div class="summary-tile"><span class="subdued-label">Email</span><strong>${escapeHtml(selectedCustomer.email ?? "Not provided")}</strong></div>
                  <div class="summary-tile"><span class="subdued-label">Lifetime Spend</span><strong>${escapeHtml(formatCurrency(selectedCustomer.totalSpent))}</strong></div>
                  <div class="summary-tile"><span class="subdued-label">Orders</span><strong>${escapeHtml(String(selectedCustomer.orders?.length ?? 0))}</strong></div>
                </div>
                <div class="timeline" style="margin-top: 18px;">
                  ${
                    selectedCustomer.orders?.length
                      ? selectedCustomer.orders
                          .map(
                            (order) => `
                              <div class="timeline-item">
                                <div class="stack-row">
                                  ${renderStatusChip(order.status, order.status === "COMPLETED" ? "success" : "warning")}
                                  <span class="mini-chip">${escapeHtml(order.orderNumber)}</span>
                                </div>
                                <div class="muted" style="margin-top: 10px;">${escapeHtml(formatDate(order.createdAt))}</div>
                                <div style="margin-top: 10px;">${escapeHtml(formatCurrency(order.totalAmount))}</div>
                                <div class="muted">${escapeHtml(
                                  (order.items ?? []).map((item) => `${item.product.name} x${item.quantity}`).join(", ") || "No items"
                                )}</div>
                              </div>
                            `
                          )
                          .join("")
                      : renderEmptyState("This customer has no order history yet.")
                  }
                </div>
                <div class="button-row" style="margin-top: 18px;">
                  <button class="secondary-button" type="button" data-action="clear-customer-history">Clear Selection</button>
                </div>
              `
              : renderEmptyState("Use the History button in the customer table to inspect purchases.")
          }
        </article>
      </div>

      <article class="table-card">
        <div class="section-eyebrow">Customer List</div>
        <h2 class="section-title">CRM records</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Total Spent</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                customers.length
                  ? customers
                      .map(
                        (customer) => `
                          <tr>
                            <td>${escapeHtml(customer.name)}</td>
                            <td>${escapeHtml(customer.phone)}</td>
                            <td>${escapeHtml(customer.email ?? "Not provided")}</td>
                            <td>${escapeHtml(formatCurrency(customer.totalSpent))}</td>
                            <td>${escapeHtml(formatDate(customer.updatedAt))}</td>
                            <td><button class="secondary-button" type="button" data-action="customer-history" data-id="${escapeHtml(customer.id)}">History</button></td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="6">${renderEmptyState("No customers found yet.")}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderBillingLineItems() {
  const stockByProductId = billingStockByProductId(state.ui.billingDraft.storeId);
  const products = availableBillingProducts(state.ui.billingDraft.storeId);

  return state.ui.billingDraft.items
    .map(
      (item, index) => `
        <div class="line-row">
          <div class="field">
            <label>Product</label>
            <select data-draft="bill" data-collection="items" data-index="${index}" data-field="productId">
              ${renderOptions(
                products,
                "id",
                (product) => `${product.productId} - ${product.name} (${stockByProductId.get(product.id) ?? 0} in stock)`,
                item.productId,
                products.length ? "Select product" : "No stocked products for this store"
              )}
            </select>
          </div>
          <div class="field">
            <label>Qty</label>
            <input type="number" min="1" value="${escapeHtml(item.quantity)}" data-draft="bill" data-collection="items" data-index="${index}" data-field="quantity" />
          </div>
          <div class="field">
            <label>Unit Price</label>
            <input type="number" min="0" step="0.01" value="${escapeHtml(item.unitPrice)}" data-draft="bill" data-collection="items" data-index="${index}" data-field="unitPrice" />
          </div>
          <div class="field">
            <label>Tax %</label>
            <input type="number" min="0" step="0.01" value="${escapeHtml(item.taxRate)}" data-draft="bill" data-collection="items" data-index="${index}" data-field="taxRate" />
          </div>
          <button class="icon-button" type="button" data-action="remove-bill-item" data-index="${index}" ${state.ui.billingDraft.items.length === 1 ? "disabled" : ""}>-</button>
        </div>
      `
    )
    .join("");
}

function renderBillingPayments() {
  return state.ui.billingDraft.payments
    .map(
      (payment, index) => `
        <div class="line-row payments">
          <div class="field">
            <label>Method</label>
            <select data-draft="bill" data-collection="payments" data-index="${index}" data-field="method">
              <option value="CASH" ${payment.method === "CASH" ? "selected" : ""}>Cash</option>
              <option value="CARD" ${payment.method === "CARD" ? "selected" : ""}>Card</option>
              <option value="UPI" ${payment.method === "UPI" ? "selected" : ""}>UPI</option>
              <option value="BANK_TRANSFER" ${payment.method === "BANK_TRANSFER" ? "selected" : ""}>Bank Transfer</option>
            </select>
          </div>
          <div class="field">
            <label>Amount</label>
            <input type="number" min="0" step="0.01" value="${escapeHtml(payment.amount)}" data-draft="bill" data-collection="payments" data-index="${index}" data-field="amount" />
          </div>
          <div class="field">
            <label>Reference</label>
            <input value="${escapeHtml(payment.reference)}" data-draft="bill" data-collection="payments" data-index="${index}" data-field="reference" />
          </div>
          <button class="icon-button" type="button" data-action="remove-bill-payment" data-index="${index}" ${state.ui.billingDraft.payments.length === 1 ? "disabled" : ""}>-</button>
        </div>
      `
    )
    .join("");
}

function renderBilling() {
  const draft = state.ui.billingDraft;
  const summary = computeDraftSummary(draft);
  const allowed = hasRole("ADMIN", "MANAGER", "CASHIER");
  const lastBill = state.ui.lastBill;
  const availableProducts = availableBillingProducts(draft.storeId);

  return `
    <section class="page-section">
      <div class="split-card">
        <article class="panel">
          <div class="section-eyebrow">POS Billing</div>
          <h2 class="section-title">Create retail bill</h2>
          <div class="table-subtitle">Builds a sale using \`/billing\` with line items, tax, discount, and payments.</div>
          ${roleRestriction(allowed)}
          <form id="billing-form" style="margin-top: 18px;">
            <div class="input-grid">
              <div class="field">
                <label>Store</label>
                <select data-draft="bill" data-field="storeId" ${allowed ? "" : "disabled"}>
                  ${renderOptions(state.data.stores, "id", (store) => `${store.code} - ${store.name}`, draft.storeId, "Select store")}
                </select>
              </div>
              <div class="field">
                <label>Customer</label>
                <select data-draft="bill" data-field="customerId" ${allowed ? "" : "disabled"}>
                  ${renderOptions(state.data.customers, "id", (customer) => `${customer.name} (${customer.phone})`, draft.customerId, "Walk-in customer")}
                </select>
              </div>
              <div class="field">
                <label>Discount</label>
                <input type="number" min="0" step="0.01" value="${escapeHtml(draft.discountAmount)}" data-draft="bill" data-field="discountAmount" ${allowed ? "" : "disabled"} />
              </div>
              <div class="field">
                <label>Default Tax %</label>
                <input type="number" min="0" step="0.01" value="${escapeHtml(draft.taxRate)}" data-draft="bill" data-field="taxRate" ${allowed ? "" : "disabled"} />
              </div>
            </div>

            <div class="field" style="margin-top: 16px;">
              <label>Notes</label>
              <textarea data-draft="bill" data-field="notes" ${allowed ? "" : "disabled"}>${escapeHtml(draft.notes)}</textarea>
            </div>

            <div class="line-builder" style="margin-top: 20px;">
              <div class="button-row">
                <h3 class="card-title">Quick Barcode Add</h3>
                <button class="secondary-button" type="button" data-action="fill-barcode-product" ${allowed ? "" : "disabled"}>Add From Barcode</button>
              </div>
              <div class="input-grid single">
                <div class="field">
                  <label>Barcode Scanner Input</label>
                  <input value="${escapeHtml(state.ui.barcodeQuery)}" data-ui-field="barcodeQuery" placeholder="Scan or type barcode and add instantly" ${allowed ? "" : "disabled"} />
                </div>
              </div>
            </div>

            <div class="line-builder" style="margin-top: 20px;">
              <div class="button-row">
                <h3 class="card-title">Items</h3>
                <button class="secondary-button" type="button" data-action="add-bill-item" ${allowed ? "" : "disabled"}>Add Item</button>
              </div>
              ${
                draft.storeId && !availableProducts.length
                  ? `<div class="permission-note">No stocked products are available for the selected store. Add inventory first or switch stores.</div>`
                  : ""
              }
              ${renderBillingLineItems()}
            </div>

            <div class="line-builder" style="margin-top: 20px;">
              <div class="button-row">
                <h3 class="card-title">Payments</h3>
                <button class="secondary-button" type="button" data-action="add-bill-payment" ${allowed ? "" : "disabled"}>Add Payment</button>
              </div>
              ${renderBillingPayments()}
            </div>

            <div class="summary-grid" style="margin-top: 20px;">
              <div class="summary-tile"><span class="subdued-label">Subtotal</span><strong>${escapeHtml(formatCurrency(summary.subTotal))}</strong></div>
              <div class="summary-tile"><span class="subdued-label">Tax</span><strong>${escapeHtml(formatCurrency(summary.taxAmount))}</strong></div>
              <div class="summary-tile"><span class="subdued-label">Total</span><strong>${escapeHtml(formatCurrency(summary.totalAmount))}</strong></div>
              <div class="summary-tile"><span class="subdued-label">Payments</span><strong>${escapeHtml(formatCurrency(summary.paymentTotal))}</strong></div>
            </div>

            <div class="button-row" style="margin-top: 20px;">
              <button class="primary-button" type="submit" ${allowed ? "" : "disabled"}>Create Bill</button>
              <button class="ghost-button" type="button" data-action="reset-bill">Reset Draft</button>
            </div>
          </form>
        </article>

        <article class="table-card interactive-card">
          <div class="section-eyebrow">Invoice Output</div>
          <h2 class="section-title">${escapeHtml(lastBill?.invoiceNumber ?? "Awaiting bill creation")}</h2>
          ${
            lastBill
              ? `
                <div class="summary-grid" style="margin-top: 18px;">
                  <div class="summary-tile"><span class="subdued-label">Bill ID</span><strong>${escapeHtml(lastBill.billId)}</strong></div>
                  <div class="summary-tile"><span class="subdued-label">Tax</span><strong>${escapeHtml(formatCurrency(lastBill.taxAmount))}</strong></div>
                  <div class="summary-tile"><span class="subdued-label">Total</span><strong>${escapeHtml(formatCurrency(lastBill.totalAmount))}</strong></div>
                  <div class="summary-tile"><span class="subdued-label">Lines</span><strong>${escapeHtml(String(lastBill.items?.length ?? 0))}</strong></div>
                </div>
                <div class="timeline" style="margin-top: 18px;">
                  ${(lastBill.items ?? [])
                    .map(
                      (item) => `
                        <div class="timeline-item">
                          <strong>${escapeHtml(item.product.name)}</strong>
                          <div class="muted">${escapeHtml(`Qty ${item.quantity} | Unit ${formatCurrency(item.unitPrice)} | Tax ${item.taxRate}%`)}</div>
                          <div>${escapeHtml(formatCurrency(item.lineTotal))}</div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
                <div class="button-row" style="margin-top: 18px;">
                  <button class="secondary-button" type="button" data-action="print-bill">Print Invoice</button>
                </div>
              `
              : renderEmptyState("After a successful POS bill, the invoice summary will appear here.")
          }
        </article>
      </div>
    </section>
  `;
}

function renderSupplyLineItems() {
  return state.ui.supplyDraft.items
    .map(
      (item, index) => `
        <div class="line-row">
          <div class="field">
            <label>Product</label>
            <select data-draft="supply" data-collection="items" data-index="${index}" data-field="productId">
              ${renderOptions(state.data.products, "id", (product) => `${product.productId} - ${product.name}`, item.productId, "Select product")}
            </select>
          </div>
          <div class="field">
            <label>Qty</label>
            <input type="number" min="1" value="${escapeHtml(item.quantity)}" data-draft="supply" data-collection="items" data-index="${index}" data-field="quantity" />
          </div>
          <div class="field">
            <label>Unit Price</label>
            <input type="number" min="0" step="0.01" value="${escapeHtml(item.unitPrice)}" data-draft="supply" data-collection="items" data-index="${index}" data-field="unitPrice" />
          </div>
          <div class="field">
            <label>Tax %</label>
            <input type="number" min="0" step="0.01" value="${escapeHtml(item.taxRate)}" data-draft="supply" data-collection="items" data-index="${index}" data-field="taxRate" />
          </div>
          <button class="icon-button" type="button" data-action="remove-supply-item" data-index="${index}" ${state.ui.supplyDraft.items.length === 1 ? "disabled" : ""}>-</button>
        </div>
      `
    )
    .join("");
}

function renderOrders() {
  const draft = state.ui.supplyDraft;
  const summary = computeDraftSummary(draft);
  const allowed = hasRole("ADMIN", "MANAGER");
  const orders = filteredOrders();

  return `
    <section class="page-section">
      <div class="split-card">
        <article class="panel">
          <div class="section-eyebrow">Supply Orders</div>
          <h2 class="section-title">Create replenishment order</h2>
          <div class="table-subtitle">Uses \`/orders\` with type \`SUPPLY\` and updates inventory automatically.</div>
          ${roleRestriction(allowed)}
          <form id="supply-form" style="margin-top: 18px;">
            <div class="input-grid">
              <div class="field">
                <label>Store</label>
                <select data-draft="supply" data-field="storeId" ${allowed ? "" : "disabled"}>
                  ${renderOptions(state.data.stores, "id", (store) => `${store.code} - ${store.name}`, draft.storeId, "Select store")}
                </select>
              </div>
              <div class="field">
                <label>Status</label>
                <select data-draft="supply" data-field="status" ${allowed ? "" : "disabled"}>
                  <option value="PENDING" ${draft.status === "PENDING" ? "selected" : ""}>Pending</option>
                  <option value="APPROVED" ${draft.status === "APPROVED" ? "selected" : ""}>Approved</option>
                  <option value="COMPLETED" ${draft.status === "COMPLETED" ? "selected" : ""}>Completed</option>
                  <option value="CANCELLED" ${draft.status === "CANCELLED" ? "selected" : ""}>Cancelled</option>
                </select>
              </div>
              <div class="field">
                <label>Supplier Name</label>
                <input value="${escapeHtml(draft.supplierName)}" data-draft="supply" data-field="supplierName" ${allowed ? "" : "disabled"} />
              </div>
              <div class="field">
                <label>Discount</label>
                <input type="number" min="0" step="0.01" value="${escapeHtml(draft.discountAmount)}" data-draft="supply" data-field="discountAmount" ${allowed ? "" : "disabled"} />
              </div>
              <div class="field">
                <label>Default Tax %</label>
                <input type="number" min="0" step="0.01" value="${escapeHtml(draft.taxRate)}" data-draft="supply" data-field="taxRate" ${allowed ? "" : "disabled"} />
              </div>
            </div>

            <div class="field" style="margin-top: 16px;">
              <label>Notes</label>
              <textarea data-draft="supply" data-field="notes" ${allowed ? "" : "disabled"}>${escapeHtml(draft.notes)}</textarea>
            </div>

            <div class="line-builder" style="margin-top: 20px;">
              <div class="button-row">
                <h3 class="card-title">Items</h3>
                <button class="secondary-button" type="button" data-action="add-supply-item" ${allowed ? "" : "disabled"}>Add Item</button>
              </div>
              ${renderSupplyLineItems()}
            </div>

            <div class="summary-grid" style="margin-top: 20px;">
              <div class="summary-tile"><span class="subdued-label">Lines</span><strong>${escapeHtml(String(summary.itemsCount))}</strong></div>
              <div class="summary-tile"><span class="subdued-label">Subtotal</span><strong>${escapeHtml(formatCurrency(summary.subTotal))}</strong></div>
              <div class="summary-tile"><span class="subdued-label">Tax</span><strong>${escapeHtml(formatCurrency(summary.taxAmount))}</strong></div>
              <div class="summary-tile"><span class="subdued-label">Total</span><strong>${escapeHtml(formatCurrency(summary.totalAmount))}</strong></div>
            </div>

            <div class="button-row" style="margin-top: 20px;">
              <button class="primary-button" type="submit" ${allowed ? "" : "disabled"}>Create Supply Order</button>
              <button class="ghost-button" type="button" data-action="reset-supply">Reset Draft</button>
            </div>
          </form>
        </article>

        <article class="table-card">
          <div class="section-eyebrow">Execution Notes</div>
          <h2 class="section-title">Order behavior</h2>
          <div class="timeline" style="margin-top: 18px;">
            <div class="timeline-item">
              <strong>Supply orders raise stock</strong>
              <div class="muted">The backend creates or updates the inventory record for the selected store and product.</div>
            </div>
            <div class="timeline-item">
              <strong>POS sales reduce stock</strong>
              <div class="muted">Retail bills are created through the Billing section, not from this supply workflow.</div>
            </div>
            <div class="timeline-item">
              <strong>Audit trails stay intact</strong>
              <div class="muted">Successful creations are written into audit logs and can be reviewed in Operations.</div>
            </div>
          </div>
        </article>
      </div>

      <article class="table-card">
        <div class="section-eyebrow">Orders Ledger</div>
        <h2 class="section-title">All orders</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Order No</th>
                <th>Type</th>
                <th>Status</th>
                <th>Store</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Total</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${
                orders.length
                  ? orders
                      .map(
                        (order) => `
                          <tr>
                            <td>${escapeHtml(order.orderNumber)}</td>
                            <td>${escapeHtml(order.type)}</td>
                            <td>${renderStatusChip(order.status, order.status === "COMPLETED" ? "success" : "warning")}</td>
                            <td>${escapeHtml(order.store?.name ?? "Not linked")}</td>
                            <td>${escapeHtml(order.customer?.name ?? "Walk-in")}</td>
                            <td>${escapeHtml(order.supplierName ?? "Not provided")}</td>
                            <td>${escapeHtml(formatCurrency(order.totalAmount))}</td>
                            <td>${escapeHtml(order.createdBy?.fullName ?? "System")}</td>
                            <td>${escapeHtml(formatDate(order.createdAt))}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="9">${renderEmptyState("No orders have been recorded yet.")}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderOperations() {
  return `
    <section class="page-section">
      <div class="two-column">
        <article class="table-card">
          <div class="section-eyebrow">Notifications</div>
          <h2 class="section-title">System notifications</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${
              state.data.notifications.length
                ? state.data.notifications
                    .map(
                      (notification) => `
                        <div class="timeline-item">
                          <div class="stack-row">
                            ${renderSeverityChip(notification.severity)}
                            <span class="mini-chip">${escapeHtml(formatDate(notification.createdAt))}</span>
                          </div>
                          <strong style="margin-top: 10px;">${escapeHtml(notification.title)}</strong>
                          <div class="muted">${escapeHtml(notification.message)}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("No notifications recorded.")
            }
          </div>
        </article>

        <article class="table-card">
          <div class="section-eyebrow">Schema View</div>
          <h2 class="section-title">Database design from backend</h2>
          <div class="pill-list" style="margin-top: 18px;">
            ${(state.data.schema?.tables ?? []).map((table) => `<span>${escapeHtml(table)}</span>`).join("")}
          </div>
          ${!(state.data.schema?.tables ?? []).length ? renderEmptyState("Schema endpoint did not return table names.") : ""}
        </article>
      </div>

      <article class="table-card">
        <div class="section-eyebrow">Audit Trail</div>
        <h2 class="section-title">Recent audit logs</h2>
        <div class="table-wrap" style="margin-top: 18px;">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>User</th>
                <th>Metadata</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${
                state.data.auditLogs.length
                  ? state.data.auditLogs
                      .map(
                        (log) => `
                          <tr>
                            <td>${escapeHtml(log.action)}</td>
                            <td>${escapeHtml(log.entityType)}</td>
                            <td>${escapeHtml(log.entityId)}</td>
                            <td>${escapeHtml(log.user?.fullName ?? "System")}</td>
                            <td><div class="code-block">${escapeHtml(JSON.stringify(log.metadata ?? {}, null, 2))}</div></td>
                            <td>${escapeHtml(formatDate(log.createdAt))}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="6">${renderEmptyState("Audit entries will appear as users perform actions.")}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderAi() {
  const riskItems = state.data.inventoryAlerts.filter((item) => item.risk !== "BALANCED");
  const frauds = state.data.fraudDetections;
  const pricing = state.ui.productInsights.dynamicPricing;
  const recommendations = state.ui.productInsights.recommendations;
  const predictions = predictionHighlights();

  return `
    <section class="page-section">
      <div class="metric-grid">
        ${renderMetricCard("Forecast Records", String(state.data.demandForecast.length), "Products evaluated from historic sales")}
        ${renderMetricCard("Risky Inventory", String(riskItems.length), "Out-of-stock or overstock predictions")}
        ${renderMetricCard("Fraud Cases", String(frauds.length), "Transactions flagged by heuristic rules")}
        ${renderMetricCard("Selected Product", pricing ? pricing.productName : "Pick a product", "Target for pricing and recommendation calls")}
      </div>

      <article class="table-card interactive-card">
        <div class="section-eyebrow">Prediction Hub</div>
        <h2 class="section-title">AI action board</h2>
        <div class="three-column" style="margin-top: 18px;">
          ${
            predictions.length
              ? predictions
                  .map(
                    (item) => `
                      <div class="timeline-item">
                        <strong>${escapeHtml(item.title)}</strong>
                        <div class="muted">${escapeHtml(item.detail)}</div>
                        <div class="muted">${escapeHtml(item.note)}</div>
                      </div>
                    `
                  )
                  .join("")
              : renderEmptyState("Prediction cards will appear when forecast and alert data are available.")
          }
        </div>
      </article>

      <div class="two-column">
        <article class="panel">
          <div class="section-eyebrow">Product Intelligence</div>
          <h2 class="section-title">Dynamic pricing and recommendations</h2>
          <div class="input-grid single" style="margin-top: 18px;">
            <div class="field">
              <label>Select product</label>
              <select data-ai-product-select>
                ${renderOptions(state.data.products, "id", (product) => `${product.productId} - ${product.name}`, state.ui.aiProductId, "Choose product")}
              </select>
            </div>
          </div>
          <div class="button-row" style="margin-top: 18px;">
            <button class="primary-button" type="button" data-action="load-ai-product">Load Insights</button>
          </div>

          <div class="summary-grid" style="margin-top: 20px;">
            <div class="summary-tile"><span class="subdued-label">Current Price</span><strong>${escapeHtml(pricing ? formatCurrency(pricing.currentPrice) : "--")}</strong></div>
            <div class="summary-tile"><span class="subdued-label">Recommended</span><strong>${escapeHtml(pricing ? formatCurrency(pricing.recommendedPrice) : "--")}</strong></div>
            <div class="summary-tile"><span class="subdued-label">Current Stock</span><strong>${escapeHtml(pricing ? String(pricing.currentStock) : "--")}</strong></div>
            <div class="summary-tile"><span class="subdued-label">Predicted Demand</span><strong>${escapeHtml(pricing ? String(pricing.predictedDemand) : "--")}</strong></div>
          </div>

          <div class="timeline" style="margin-top: 20px;">
            ${
              pricing
                ? `
                  <div class="timeline-item">
                    <strong>${escapeHtml(pricing.strategy)}</strong>
                    <div class="muted">${escapeHtml(`Backend suggestion for ${pricing.productName} based on stock coverage and demand forecast.`)}</div>
                  </div>
                `
                : renderEmptyState("Pick a product to load dynamic pricing.")
            }

            ${
              recommendations.length
                ? recommendations
                    .map(
                      (item) => `
                        <div class="timeline-item">
                          <strong>${escapeHtml(item.name)}</strong>
                          <div class="muted">${escapeHtml(`Cross-sell score: ${item.score}`)}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("Recommendations will appear after you load a product with order history.")
            }
          </div>
        </article>

        <article class="table-card">
          <div class="section-eyebrow">Inventory Risk AI</div>
          <h2 class="section-title">Smart inventory alerts</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${
              state.data.inventoryAlerts.length
                ? state.data.inventoryAlerts
                    .slice(0, 8)
                    .map(
                      (item) => `
                        <div class="timeline-item">
                          <div class="stack-row">
                            ${renderSeverityChip(item.severity)}
                            <span class="mini-chip">${escapeHtml(item.risk)}</span>
                          </div>
                          <strong style="margin-top: 10px;">${escapeHtml(`${item.productName} · ${item.store}`)}</strong>
                          <div class="muted">${escapeHtml(`Stock ${item.currentStock} | Forecast ${item.predictedMonthlyDemand} / month | Cover ${item.daysOfCover} days`)}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("Inventory alert engine has no records yet.")
            }
          </div>
        </article>
      </div>

      <div class="two-column">
        <article class="table-card">
          <div class="section-eyebrow">Demand Forecast</div>
          <h2 class="section-title">30 vs 90 day demand view</h2>
          <div class="table-wrap" style="margin-top: 18px;">
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Name</th>
                  <th>30d Sold</th>
                  <th>90d Sold</th>
                  <th>Predicted Demand</th>
                </tr>
              </thead>
              <tbody>
                ${
                  state.data.demandForecast.length
                    ? state.data.demandForecast
                        .map(
                          (row) => `
                            <tr>
                              <td>${escapeHtml(row.productId)}</td>
                              <td>${escapeHtml(row.name)}</td>
                              <td>${escapeHtml(String(row.soldLast30Days))}</td>
                              <td>${escapeHtml(String(row.soldLast90Days))}</td>
                              <td>${escapeHtml(String(row.predictedDemand))}</td>
                            </tr>
                          `
                        )
                        .join("")
                    : `<tr><td colspan="5">${renderEmptyState("Demand forecasts require sale history.")}</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="table-card">
          <div class="section-eyebrow">Fraud Detection</div>
          <h2 class="section-title">Suspicious transactions</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${
              frauds.length
                ? frauds
                    .map(
                      (entry) => `
                        <div class="timeline-item">
                          <div class="stack-row">
                            ${renderSeverityChip(entry.riskScore >= 50 ? "CRITICAL" : "WARNING")}
                            <span class="mini-chip">${escapeHtml(entry.orderNumber)}</span>
                          </div>
                          <strong style="margin-top: 10px;">${escapeHtml(`${entry.customer} · ${formatCurrency(entry.totalAmount)}`)}</strong>
                          <div class="muted">${escapeHtml(`Cashier: ${entry.cashier} | Risk score: ${entry.riskScore}`)}</div>
                          <div class="muted">${escapeHtml(entry.flags.join(" | "))}</div>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("No suspicious POS transactions have been detected.")
            }
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderSettings() {
  const adminAccess = hasRole("ADMIN");
  return `
    <section class="page-section">
      <div class="two-column">
        <article class="panel">
          <div class="section-eyebrow">Connection</div>
          <h2 class="section-title">API base URL</h2>
          <form id="settings-form" style="margin-top: 18px;">
            <div class="field">
              <label for="apiBase">API Base</label>
              <input id="apiBase" name="apiBase" value="${escapeHtml(state.apiBase)}" />
            </div>
            <div class="button-row" style="margin-top: 18px;">
              <button class="primary-button" type="submit">Save And Refresh</button>
            </div>
          </form>
          <div class="helper-grid" style="margin-top: 18px;">
            <div class="detail-card"><span class="subdued-label">Backend Health</span><strong>${escapeHtml(state.data.health?.message ?? "Unavailable")}</strong></div>
            <div class="detail-card"><span class="subdued-label">Swagger Docs</span><strong><a href="${escapeHtml(`${getBackendBase()}/api-docs`)}" target="_blank" rel="noreferrer">Open docs</a></strong></div>
            <div class="detail-card"><span class="subdued-label">Logged In Role</span><strong>${escapeHtml(state.session?.user?.role ?? "Unknown")}</strong></div>
          </div>
        </article>

        <article class="table-card">
          <div class="section-eyebrow">Demo Access</div>
          <h2 class="section-title">Seeded credentials</h2>
          <div class="timeline" style="margin-top: 18px;">
            ${DEMO_USERS.map(
              (user) => `
                <div class="timeline-item">
                  <strong>${escapeHtml(user.label)}</strong>
                  <div class="muted">${escapeHtml(user.email)}</div>
                  <div class="code-block">${escapeHtml(user.password)}</div>
                </div>
              `
            ).join("")}
          </div>
        </article>
      </div>

      ${
        adminAccess
          ? `
            <div class="two-column">
              <article class="panel">
                <div class="section-eyebrow">User Management</div>
                <h2 class="section-title">Create users as admin</h2>
                <div class="table-subtitle">Admin-only user provisioning for real-world team onboarding.</div>
                <form id="user-form" style="margin-top: 18px;">
                  <div class="input-grid">
                    <div class="field">
                      <label for="userFullName">Full Name</label>
                      <input id="userFullName" name="fullName" required />
                    </div>
                    <div class="field">
                      <label for="userEmail">Email</label>
                      <input id="userEmail" name="email" type="email" required />
                    </div>
                    <div class="field">
                      <label for="userPassword">Password</label>
                      <input id="userPassword" name="password" type="password" required />
                    </div>
                    <div class="field">
                      <label for="userRole">Role</label>
                      <select id="userRole" name="role">
                        <option value="MANAGER">Manager</option>
                        <option value="CASHIER">Cashier</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div class="field">
                      <label for="userStore">Store</label>
                      <select id="userStore" name="storeId">
                        ${renderOptions(state.data.stores, "id", (store) => `${store.code} - ${store.name}`, "", "No store linked")}
                      </select>
                    </div>
                  </div>
                  <div class="button-row" style="margin-top: 18px;">
                    <button class="primary-button" type="submit">Create User</button>
                  </div>
                </form>
              </article>

              <article class="table-card">
                <div class="section-eyebrow">Access Directory</div>
                <h2 class="section-title">Current users</h2>
                <div class="table-wrap" style="margin-top: 18px;">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Store</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        state.data.users.length
                          ? state.data.users
                              .map(
                                (user) => `
                                  <tr>
                                    <td>${escapeHtml(user.fullName)}</td>
                                    <td>${escapeHtml(user.email)}</td>
                                    <td>${renderStatusChip(user.role, user.role === "ADMIN" ? "danger" : user.role === "MANAGER" ? "warning" : "success")}</td>
                                    <td>${escapeHtml(user.store?.name ?? "Unassigned")}</td>
                                    <td>${escapeHtml(formatDate(user.createdAt))}</td>
                                  </tr>
                                `
                              )
                              .join("")
                          : `<tr><td colspan="5">${renderEmptyState("No user records loaded.")}</td></tr>`
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          `
          : ""
      }

      <article class="table-card">
        <div class="section-eyebrow">Environment Notes</div>
        <h2 class="section-title">Frontend behavior</h2>
        <div class="timeline" style="margin-top: 18px;">
          <div class="timeline-item"><strong>JWT aware requests</strong><div class="muted">The interface stores the login token locally and attaches it to protected API calls.</div></div>
          <div class="timeline-item"><strong>Role-aware controls</strong><div class="muted">Admin sees full control, manager sees operational analytics, and cashier gets a POS-focused experience.</div></div>
          <div class="timeline-item"><strong>Live backend wiring</strong><div class="muted">Dashboards, orders, inventory, notifications, user management, and AI cards all read from existing endpoints rather than mocked data.</div></div>
        </div>
      </article>
    </section>
  `;
}

function renderLogin() {
  const isSignup = state.ui.authMode === "signup";
  return `
    <div class="auth-shell">
      <section class="auth-panel">
        <div>
          <div class="eyebrow">Retail RMS Frontend</div>
          <h1 class="auth-title">Operate stores, stock, billing, and AI insight from one console.</h1>
          <p class="auth-copy">
            This frontend is wired to the existing enterprise backend and seeded demo data. Sign in with one of the seeded users or point the UI to another API base.
          </p>
          <div class="auth-grid">
            <div class="highlight-card"><span class="subdued-label">Modules</span><strong>9</strong><div class="muted">Dashboard, master data, POS, supply, ops, and AI.</div></div>
            <div class="highlight-card"><span class="subdued-label">Entities</span><strong>10</strong><div class="muted">Mirrors the tables exposed by the backend schema endpoint.</div></div>
            <div class="highlight-card"><span class="subdued-label">Seed Store</span><strong>Bangalore Central</strong><div class="muted">Ready with demo users, products, inventory, and a walk-in customer.</div></div>
            <div class="highlight-card"><span class="subdued-label">Mode</span><strong>Live API</strong><div class="muted">The app reads reports, alerts, orders, and CRUD data from backend routes.</div></div>
          </div>
        </div>
        <div class="footer-note">Recommended backend default: <code>${escapeHtml(defaultApiBase)}</code></div>
      </section>

      <section class="auth-card">
        <div class="eyebrow">${isSignup ? "Create Account" : "Secure Sign In"}</div>
        <h2 class="section-title">${isSignup ? "Register a new user" : "Access the control center"}</h2>
        <p class="section-copy">
          ${
            isSignup
              ? "Create a new manager or cashier account, then sign in to start using the workspace."
              : "Use a seeded credential or your own backend user. The token is stored locally for authenticated actions."
          }
        </p>

        ${
          state.feedback
            ? `
              <div class="banner ${escapeHtml(state.feedback.type)}" style="margin-top: 18px;">
                <div>${escapeHtml(state.feedback.text)}</div>
                <button class="icon-button" data-action="clear-feedback">X</button>
              </div>
            `
            : ""
        }

        <div class="auth-switch-row">
          <button class="secondary-button ${isSignup ? "" : "active"}" type="button" data-action="auth-mode-login">Login</button>
          <button class="secondary-button ${isSignup ? "active" : ""}" type="button" data-action="auth-mode-signup">Signup</button>
        </div>

        ${
          isSignup
            ? `
              <form id="signup-form" style="margin-top: 18px;">
                <div class="input-grid single">
                  <div class="field">
                    <label for="signupApiBase">API Base URL</label>
                    <input id="signupApiBase" name="apiBase" value="${escapeHtml(state.apiBase)}" required />
                  </div>
                  <div class="field">
                    <label for="signupFullName">Full Name</label>
                    <input id="signupFullName" name="fullName" required />
                  </div>
                  <div class="field">
                    <label for="signupEmail">Email</label>
                    <input id="signupEmail" name="email" type="email" required />
                  </div>
                  <div class="field">
                    <label for="signupPassword">Password</label>
                    <input id="signupPassword" name="password" type="password" required />
                  </div>
                  <div class="field">
                    <label for="signupRole">Role</label>
                    <select id="signupRole" name="role">
                      <option value="MANAGER">Manager</option>
                      <option value="CASHIER">Cashier</option>
                    </select>
                  </div>
                </div>
                <div class="button-row" style="margin-top: 18px;">
                  <button class="primary-button" type="submit">Create Account</button>
                  ${state.loading ? `<div class="loading-pill"><span class="spinner"></span>${escapeHtml(state.loadingLabel)}</div>` : ""}
                </div>
              </form>
            `
            : `
              <form id="login-form" style="margin-top: 18px;">
                <div class="input-grid single">
                  <div class="field">
                    <label for="loginApiBase">API Base URL</label>
                    <input id="loginApiBase" name="apiBase" value="${escapeHtml(state.apiBase)}" required />
                  </div>
                  <div class="field">
                    <label for="loginEmail">Email</label>
                    <input id="loginEmail" name="email" type="email" required />
                  </div>
                  <div class="field">
                    <label for="loginPassword">Password</label>
                    <input id="loginPassword" name="password" type="password" required />
                  </div>
                </div>
                <div class="button-row" style="margin-top: 18px;">
                  <button class="primary-button" type="submit">Sign In</button>
                  ${state.loading ? `<div class="loading-pill"><span class="spinner"></span>${escapeHtml(state.loadingLabel)}</div>` : ""}
                </div>
              </form>

              <div class="quick-credentials">
                ${DEMO_USERS.map(
                  (user) => `
                    <button class="secondary-button" type="button" data-action="demo-login" data-email="${escapeHtml(user.email)}" data-password="${escapeHtml(user.password)}">
                      ${escapeHtml(user.label)}
                    </button>
                  `
                ).join("")}
              </div>
            `
        }
      </section>
    </div>
  `;
}

function render() {
  syncTheme();
  syncLocationWithRoute();
  const authenticated = isAuthenticated();

  if (loginPageRoot) {
    loginPageRoot.hidden = authenticated;
    loginPageRoot.innerHTML = authenticated ? "" : renderLogin();
  }

  if (dashboardPageRoot) {
    dashboardPageRoot.hidden = !authenticated;
    dashboardPageRoot.innerHTML = authenticated ? renderApp() : "";
  }
}

function formValue(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function handleDraftChange(target) {
  const draftName = target.dataset.draft;
  if (!draftName) {
    return;
  }

  const field = target.dataset.field;
  if (!field) {
    return;
  }

  const draft = draftName === "bill" ? state.ui.billingDraft : state.ui.supplyDraft;
  const collection = target.dataset.collection;

  if (collection) {
    const index = Number(target.dataset.index);
    const entry = draft[collection]?.[index];
    if (!entry) {
      return;
    }

    entry[field] = target.value;
    if (field === "productId" && entry.unitPrice === "") {
      const product = findProduct(entry.productId);
      if (product) {
        entry.unitPrice = String(product.price);
      }
    }
  } else {
    draft[field] = target.value;
    if (draftName === "bill" && field === "storeId") {
      syncBillingDraftForStore(draft.storeId);
    }
  }

  render();
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();

  if (form.id === "login-form") {
    const data = new FormData(form);
    await login(formValue(data, "email"), formValue(data, "password"), formValue(data, "apiBase"));
    return;
  }

  if (form.id === "signup-form") {
    const data = new FormData(form);
    await signup({
      apiBase: formValue(data, "apiBase"),
      fullName: formValue(data, "fullName"),
      email: formValue(data, "email"),
      password: formValue(data, "password"),
      role: formValue(data, "role") || "CASHIER"
    });
    return;
  }

  if (form.id === "settings-form") {
    const data = new FormData(form);
    state.apiBase = formValue(data, "apiBase");
    localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
    await hydrateAppData({ showSuccess: true });
    return;
  }

  try {
    if (form.id === "product-form") {
      const data = new FormData(form);
      const payload = {
        productId: formValue(data, "productId"),
        name: formValue(data, "name"),
        category: formValue(data, "category"),
        price: numberOrDefault(formValue(data, "price"), 0),
        costPrice: numberOrDefault(formValue(data, "costPrice"), 0),
        barcode: formValue(data, "barcode") || undefined,
        reorderLevel: Math.round(numberOrDefault(formValue(data, "reorderLevel"), 10)),
        description: formValue(data, "description") || undefined,
        isActive: formValue(data, "isActive") !== "false"
      };

      startLoading(state.ui.productEditId ? "Updating product" : "Creating product");
      if (state.ui.productEditId) {
        await api(`/products/${state.ui.productEditId}`, { method: "PATCH", body: payload });
        state.ui.productEditId = null;
      } else {
        await api("/products", { method: "POST", body: payload });
      }
      await hydrateAppData();
      setFeedback("success", "Product saved successfully.");
      render();
      return;
    }

    if (form.id === "store-form") {
      const data = new FormData(form);
      startLoading("Creating store");
      await api("/stores", {
        method: "POST",
        body: {
          code: formValue(data, "code"),
          name: formValue(data, "name"),
          city: formValue(data, "city"),
          isActive: formValue(data, "isActive") !== "false"
        }
      });
      await hydrateAppData();
      setFeedback("success", "Store created successfully.");
      render();
      return;
    }

    if (form.id === "inventory-form") {
      const data = new FormData(form);
      startLoading("Saving inventory");
      await api("/inventory/upsert", {
        method: "POST",
        body: {
          storeId: formValue(data, "storeId"),
          productId: formValue(data, "productId"),
          stock: Math.round(numberOrDefault(formValue(data, "stock"), 0)),
          reservedStock: Math.round(numberOrDefault(formValue(data, "reservedStock"), 0)),
          warehouseLocation: formValue(data, "warehouseLocation") || undefined
        }
      });
      await hydrateAppData();
      setFeedback("success", "Inventory saved successfully.");
      render();
      return;
    }

    if (form.id === "customer-form") {
      const data = new FormData(form);
      startLoading("Creating customer");
      await api("/customers", {
        method: "POST",
        body: {
          name: formValue(data, "name"),
          phone: formValue(data, "phone"),
          email: formValue(data, "email") || undefined,
          address: formValue(data, "address") || undefined
        }
      });
      await hydrateAppData();
      setFeedback("success", "Customer created successfully.");
      render();
      return;
    }

    if (form.id === "user-form") {
      const data = new FormData(form);
      startLoading("Creating user");
      await api("/users", {
        method: "POST",
        body: {
          fullName: formValue(data, "fullName"),
          email: formValue(data, "email"),
          password: formValue(data, "password"),
          role: formValue(data, "role"),
          storeId: formValue(data, "storeId") || undefined
        }
      });
      await hydrateAppData();
      setFeedback("success", "User created successfully.");
      render();
      return;
    }

    if (form.id === "billing-form") {
      const payload = buildDraftPayload(state.ui.billingDraft, "billing");
      if (!payload.storeId || payload.items.length === 0 || payload.payments.length === 0) {
        throw new Error("Billing requires a store, at least one item, and at least one payment.");
      }
      const billingValidationError = validateBillingDraft(state.ui.billingDraft);
      if (billingValidationError) {
        throw new Error(billingValidationError);
      }

      startLoading("Creating POS bill");
      state.ui.lastBill = await api("/billing", { method: "POST", body: payload });
      state.ui.billingDraft = createBillingDraft();
      ensureDraftDefaults();
      await hydrateAppData();
      setFeedback("success", "POS bill created successfully.");
      render();
      return;
    }

    if (form.id === "supply-form") {
      const payload = buildDraftPayload(state.ui.supplyDraft, "supply");
      if (!payload.storeId || payload.items.length === 0) {
        throw new Error("Supply orders require a store and at least one item.");
      }

      startLoading("Creating supply order");
      await api("/orders", { method: "POST", body: payload });
      state.ui.supplyDraft = createSupplyDraft();
      ensureDraftDefaults();
      await hydrateAppData();
      setFeedback("success", "Supply order created successfully.");
      render();
      return;
    }
  } catch (error) {
    setFeedback("error", summarizeError(error, "Request failed"));
    stopLoading();
  }
}

async function handleClick(event) {
  const button = event.target.closest("[data-action], [data-route]");
  if (!button) {
    return;
  }

  if (button.dataset.route) {
    if (!isAuthenticated()) {
      render();
      return;
    }
    state.route = normalizeRouteId(button.dataset.route);
    state.ui.mobileSidebarOpen = false;
    render();
    return;
  }

  const { action } = button.dataset;

  if (action === "logout") {
    logout();
    return;
  }
  if (action === "refresh") {
    await hydrateAppData({ showSuccess: true });
    return;
  }
  if (action === "toggle-theme") {
    state.ui.theme = state.ui.theme === "dark" ? "light" : "dark";
    syncTheme();
    render();
    return;
  }
  if (action === "export-csv") {
    exportRows(`retail-rms-${state.route}.csv`, currentRouteExportRows());
    return;
  }
  if (action === "export-pdf") {
    window.print();
    return;
  }
  if (action === "clear-feedback") {
    clearFeedback();
    render();
    return;
  }
  if (action === "demo-login") {
    const emailInput = document.querySelector("#loginEmail");
    const passwordInput = document.querySelector("#loginPassword");
    if (emailInput && passwordInput) {
      emailInput.value = button.dataset.email ?? "";
      passwordInput.value = button.dataset.password ?? "";
    }
    return;
  }
  if (action === "auth-mode-login") {
    state.ui.authMode = "login";
    clearFeedback();
    render();
    return;
  }
  if (action === "auth-mode-signup") {
    state.ui.authMode = "signup";
    clearFeedback();
    render();
    return;
  }
  if (action === "toggle-sidebar") {
    state.ui.mobileSidebarOpen = !state.ui.mobileSidebarOpen;
    render();
    return;
  }
  if (action === "edit-product") {
    state.ui.productEditId = button.dataset.id ?? null;
    state.route = "catalog";
    render();
    return;
  }
  if (action === "cancel-product-edit") {
    state.ui.productEditId = null;
    render();
    return;
  }
  if (action === "customer-history") {
    await refreshCustomerHistory(button.dataset.id ?? "", true);
    return;
  }
  if (action === "clear-customer-history") {
    state.ui.customerHistory = null;
    render();
    return;
  }
  if (action === "add-bill-item") {
    state.ui.billingDraft.items.push(createLineItem());
    render();
    return;
  }
  if (action === "remove-bill-item") {
    state.ui.billingDraft.items.splice(Number(button.dataset.index), 1);
    render();
    return;
  }
  if (action === "add-bill-payment") {
    state.ui.billingDraft.payments.push(createPaymentLine());
    render();
    return;
  }
  if (action === "remove-bill-payment") {
    state.ui.billingDraft.payments.splice(Number(button.dataset.index), 1);
    render();
    return;
  }
  if (action === "add-supply-item") {
    state.ui.supplyDraft.items.push(createLineItem());
    render();
    return;
  }
  if (action === "remove-supply-item") {
    state.ui.supplyDraft.items.splice(Number(button.dataset.index), 1);
    render();
    return;
  }
  if (action === "reset-bill") {
    state.ui.billingDraft = createBillingDraft();
    ensureDraftDefaults();
    render();
    return;
  }
  if (action === "reset-supply") {
    state.ui.supplyDraft = createSupplyDraft();
    ensureDraftDefaults();
    render();
    return;
  }
  if (action === "load-ai-product") {
    await refreshProductInsights(true);
    return;
  }
  if (action === "fill-barcode-product") {
    const match = state.data.products.find((product) => String(product.barcode ?? "").trim() === state.ui.barcodeQuery.trim());
    if (!match) {
      setFeedback("error", "No product found for that barcode.");
      render();
      return;
    }

    if (state.ui.billingDraft.storeId) {
      const availableStock = billingStockByProductId(state.ui.billingDraft.storeId).get(match.id) ?? 0;
      const store = findStore(state.ui.billingDraft.storeId);
      if (availableStock <= 0) {
        setFeedback("error", `${match.name} is not stocked in ${store?.name ?? "the selected store"}.`);
        render();
        return;
      }
    }

    const openLine = state.ui.billingDraft.items.find((item) => !item.productId) ?? state.ui.billingDraft.items[0];
    openLine.productId = match.id;
    openLine.unitPrice = String(match.price);
    if (!openLine.quantity) {
      openLine.quantity = "1";
    }
    state.ui.barcodeQuery = "";
    setFeedback("success", `${match.name} added to the POS draft.`);
    render();
    return;
  }
  if (action === "print-bill") {
    window.print();
    return;
  }
}

function handleChange(event) {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)
  ) {
    return;
  }

  if (target.dataset.aiProductSelect !== undefined) {
    state.ui.aiProductId = target.value;
    render();
    return;
  }

  if (target.dataset.uiField) {
    state.ui[target.dataset.uiField] = target.value;
    if (target.dataset.uiField === "dashboardRangeDays" && state.session?.token) {
      void hydrateAppData();
      return;
    }
    render();
    return;
  }

  handleDraftChange(target);
}

function bindRootEvents(root) {
  if (!root) {
    return;
  }

  root.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });

  root.addEventListener("click", (event) => {
    void handleClick(event);
  });

  root.addEventListener("change", handleChange);
}

bindRootEvents(loginPageRoot);
bindRootEvents(dashboardPageRoot);

syncTheme();
syncRouteFromLocation();
render();

if (isAuthenticated()) {
  void hydrateAppData();
}
