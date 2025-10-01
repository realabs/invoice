const STORAGE_KEY = "invoice-builder-state-v1";

const defaultState = {
  sellerName: "Acme Consulting Group",
  sellerAddress: "123 Market Street\nSan Francisco, CA 94105\nUnited States",
  sellerPhone: "+1 (555) 010-7788",
  sellerEmail: "billing@acme.co",
  clientName: "Globex Corporation",
  clientContact:
    "Attn: Accounts Payable\n987 Industry Way\nNew York, NY 10001\nUnited States",
  invoiceNumber: "INV-2023-001",
  issueDate: "2023-09-01",
  dueDate: "2023-09-15",
  currency: "USD",
  paymentTerms: "Net 14",
  balanceDue: "4000",
  notes:
    "Thank you for your business. Please submit payment by the due date listed above. If you have any questions, contact billing@acme.co.",
  items: [
    {
      description: "Consulting services",
      type: "Service",
      quantity: "1",
      unitPrice: "4000",
      taxRate: "0",
    },
  ],
};

let state = loadState();

const form = document.getElementById("invoiceForm");
const itemsContainer = document.getElementById("itemsContainer");
const preview = document.getElementById("invoicePreview");

populateForm();
renderItemsForm();
renderPreview();

bindFormFields();

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...cloneValue(defaultState), ...parsed };
    }
  } catch (error) {
    console.warn("Unable to load saved invoice data", error);
  }
  return cloneValue(defaultState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cloneValue(value) {
  if (typeof window.structuredClone === "function") {
    return window.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function populateForm() {
  for (const [name, value] of Object.entries(state)) {
    if (name === "items") continue;
    const input = form.elements.namedItem(name);
    if (input) {
      input.value = value ?? "";
    }
  }
}

function bindFormFields() {
  const fields = form.querySelectorAll("input, textarea");
  fields.forEach((field) => {
    if (field.name === "") return;
    field.addEventListener("input", () => {
      if (field.name === "balanceDue") {
        state[field.name] = field.value.trim();
      } else {
        state[field.name] = field.value;
      }
      renderPreview();
      saveState();
    });
  });

  document
    .getElementById("addItem")
    .addEventListener("click", () => addItemRow());

  document
    .getElementById("downloadPdf")
    .addEventListener("click", handleDownloadPdf);

  document.getElementById("resetState").addEventListener("click", () => {
    if (confirm("Reset all invoice data and restore the default values?")) {
      state = cloneValue(defaultState);
      saveState();
      populateForm();
      renderItemsForm();
      renderPreview();
    }
  });
}

function renderItemsForm() {
  itemsContainer.innerHTML = "";
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-row__field">
        <label class="field__label">Description</label>
        <input class="field__input" name="description" value="${escapeHtml(
          item.description || ""
        )}" />
      </div>
      <div class="item-row__field">
        <label class="field__label">Type</label>
        <input class="field__input" name="type" value="${escapeHtml(
          item.type || ""
        )}" />
      </div>
      <div class="item-row__field">
        <label class="field__label">Quantity</label>
        <input class="field__input" name="quantity" type="number" min="0" step="0.01" value="${
          item.quantity || ""
        }" />
      </div>
      <div class="item-row__field">
        <label class="field__label">Price</label>
        <input class="field__input" name="unitPrice" type="number" min="0" step="0.01" value="${
          item.unitPrice || ""
        }" />
      </div>
      <div class="item-row__field">
        <label class="field__label">Tax %</label>
        <input class="field__input" name="taxRate" type="number" min="0" step="0.1" value="${
          item.taxRate || ""
        }" />
      </div>
      <button type="button" class="item-row__remove" aria-label="Remove line item">✕</button>
    `;

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (event) => {
        const target = event.currentTarget;
        state.items[index][target.name] = target.value;
        renderPreview();
        saveState();
      });
    });

    row.querySelector(".item-row__remove").addEventListener("click", () => {
      if (state.items.length === 1) {
        state.items[0] = cloneValue(defaultState.items[0]);
      } else {
        state.items.splice(index, 1);
      }
      renderItemsForm();
      renderPreview();
      saveState();
    });

    itemsContainer.appendChild(row);
  });
}

function addItemRow() {
  state.items.push({
    description: "",
    type: "",
    quantity: "1",
    unitPrice: "0",
    taxRate: "0",
  });
  renderItemsForm();
  renderPreview();
  saveState();
}

function renderPreview() {
  const fieldNodes = preview.querySelectorAll("[data-field]");
  fieldNodes.forEach((node) => {
    const key = node.getAttribute("data-field");
    let value = state[key] ?? "";

    if (key === "balanceDue") {
      value = formatCurrency(value);
    }

    if (key === "issueDate" || key === "dueDate") {
      value = formatDate(value);
    }

    node.textContent = value;
  });

  const tbody = preview.querySelector("[data-items]");
  tbody.innerHTML = "";

  let subtotal = 0;
  let taxTotal = 0;

  state.items.forEach((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    const lineTotal = quantity * unitPrice;
    const lineTax = lineTotal * (taxRate / 100);

    subtotal += lineTotal;
    taxTotal += lineTax;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.description || "")}</td>
      <td>${escapeHtml(item.type || "")}</td>
      <td>${formatNumber(quantity)}</td>
      <td>${formatCurrency(unitPrice)}</td>
      <td>${formatCurrency(lineTotal)}</td>
    `;

    tbody.appendChild(row);
  });

  const summaryNodes = preview.querySelectorAll("[data-summary]");
  summaryNodes.forEach((node) => {
    const key = node.getAttribute("data-summary");
    if (key === "subtotal") {
      node.textContent = formatCurrency(subtotal);
    }
    if (key === "tax") {
      node.textContent = formatCurrency(taxTotal);
    }
    if (key === "total") {
      node.textContent = formatCurrency(subtotal + taxTotal);
    }
  });
}

function formatCurrency(value) {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(amount) || amount === null) {
    return "";
  }
  const currency = state.currency || "USD";
  try {
    const locale =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatNumber(value) {
  const locale =
    (typeof navigator !== "undefined" && navigator.language) || "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const locale =
    (typeof navigator !== "undefined" && navigator.language) || "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function handleDownloadPdf() {
  const element = document.getElementById("invoicePreview");
  const trigger = document.getElementById("downloadPdf");
  const filename = `${state.invoiceNumber || "invoice"}.pdf`;

  if (typeof window.html2pdf !== "function") {
    alert(
      "The PDF export library failed to load. Please check your internet connection and reload the page."
    );
    return;
  }

  const options = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  try {
    document.body.classList.add("is-exporting");
    if (trigger) {
      trigger.disabled = true;
      trigger.setAttribute("aria-busy", "true");
    }
    await window.html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error("Failed to export invoice PDF", error);
    alert("Something went wrong while creating the PDF. Please try again.");
  } finally {
    document.body.classList.remove("is-exporting");
    if (trigger) {
      trigger.disabled = false;
      trigger.removeAttribute("aria-busy");
    }
  }
}
