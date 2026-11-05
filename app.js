const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
}).format(n);

const categories = ["Todos", ...new Set(JP_PRODUCTS.map(p => p.category))];
let activeCategory = "Todos";
let cart = {};

function renderCategories() {
  $("categories").innerHTML = categories.map(c =>
    `<button class="category ${c === activeCategory ? "active" : ""}" data-category="${c}">${c}</button>`
  ).join("");
}

function renderProducts() {
  const q = $("search").value.trim().toLocaleLowerCase("es");

  const items = JP_PRODUCTS.filter(p =>
    (activeCategory === "Todos" || p.category === activeCategory) &&
    (`${p.name} ${p.description} ${p.category}`).toLocaleLowerCase("es").includes(q)
  );

  $("products").innerHTML = items.length
    ? items.map(p => `
      <article class="product">
        <div class="product-icon">${p.emoji}</div>
        <div class="product-category">${p.category}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="product-bottom">
          <b class="product-price">${money(p.price)}</b>
          <button class="add-button" data-add="${p.id}">+ AGREGAR</button>
        </div>
      </article>
    `).join("")
    : `<div class="no-results">No encontramos productos con esa búsqueda.</div>`;
}

function renderCart() {
  const entries = Object.values(cart);
  const count = entries.reduce((s, x) => s + x.qty, 0);
  const total = entries.reduce((s, x) => s + x.qty * x.product.price, 0);

  $("headerCount").textContent = count;
  $("total").textContent = money(total);

  $("cartItems").innerHTML = entries.length
    ? entries.map(({ product: p, qty }) => `
      <div class="cart-row">
        <div>
          <b>${p.name}</b>
          <small>${money(p.price)} · Subtotal ${money(p.price * qty)}</small>
        </div>
        <div class="qty">
          <button data-dec="${p.id}" aria-label="Quitar uno">−</button>
          <span>${qty}</span>
          <button data-inc="${p.id}" aria-label="Agregar uno">+</button>
        </div>
      </div>
    `).join("")
    : `<div class="cart-empty">Tu carrito está esperando algo delicioso.</div>`;
}

function add(id) {
  const p = JP_PRODUCTS.find(x => x.id === Number(id));
  if (!cart[id]) cart[id] = { product: p, qty: 0 };
  cart[id].qty++;
  renderCart();
  toast(`${p.name} agregado al pedido`);
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  renderCart();
}

function showCart(show) {
  $("cartDrawer").classList.toggle("show", show);
  $("cartOverlay").classList.toggle("show", show);
  $("cartDrawer").setAttribute("aria-hidden", String(!show));
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

function submitOrder() {
  const entries = Object.values(cart);

  if (!entries.length) {
    toast("Agrega productos antes de confirmar.");
    return;
  }

  const name = $("customer").value.trim();
  const phone = $("phone").value.trim();
  const type = $("orderType").value;
  const address = $("address").value.trim();

  if (!name || !phone) {
    toast("Escribe tu nombre y celular para continuar.");
    return;
  }

  if (type === "Domicilio" && !address) {
    toast("Escribe la dirección de entrega.");
    return;
  }

  const total = entries.reduce((s, x) => s + x.qty * x.product.price, 0);

  const lines = [
    "🍔 *NUEVO PEDIDO - JP BURGER*",
    "",
    `👤 Cliente: ${name}`,
    `📞 Teléfono: ${phone}`,
    `🛵 Tipo: ${type}`,
    `💳 Pago: ${$("payment").value}`
  ];

  if (type === "Domicilio") {
    lines.push(`📍 Dirección: ${address}`);
  }

  lines.push("", "*PRODUCTOS*");

  entries.forEach(({ product: p, qty }) => {
    lines.push(`• ${qty} x ${p.name} — ${money(p.price * qty)}`);
  });

  lines.push("", `💰 *TOTAL: ${money(total)}*`);

  if ($("notes").value.trim()) {
    lines.push("", `📝 Observaciones: ${$("notes").value.trim()}`);
  }

  lines.push("", "Gracias por elegir JP Burger.");

  // Integración futura: configurar API_ENDPOINT en config.js
  // y crear el backend receptor.
  // Mientras tanto, el pedido se entrega por WhatsApp.
  const api = window.JP_CONFIG?.API_ENDPOINT;

  const payload = {
    customer: name,
    phone,
    type,
    address,
    payment: $("payment").value,
    notes: $("notes").value.trim(),
    items: entries.map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: qty
    })),
    total,
    currency: "COP",
    source: "web"
  };

  if (api) {
    fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(r => {
        if (!r.ok) throw new Error("No se pudo registrar");
        return r.json();
      })
      .then(() => {
        toast("Pedido recibido. ¡Gracias!");
        cart = {};
        renderCart();
        showCart(false);
      })
      .catch(() => {
        toast("No se pudo conectar. Abriremos WhatsApp.");
        window.open(
          `https://wa.me/573103114145?text=${encodeURIComponent(lines.join("\n"))}`,
          "_blank",
          "noopener"
        );
      });
  } else {
    window.open(
      `https://wa.me/573103114145?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener"
    );
  }
}

$("categories").addEventListener("click", e => {
  const b = e.target.closest("[data-category]");
  if (!b) return;
  activeCategory = b.dataset.category;
  renderCategories();
  renderProducts();
});

$("products").addEventListener("click", e => {
  const b = e.target.closest("[data-add]");
  if (b) add(b.dataset.add);
});

$("cartItems").addEventListener("click", e => {
  const i = e.target.closest("[data-inc]");
  const d = e.target.closest("[data-dec]");
  if (i) changeQty(i.dataset.inc, 1);
  if (d) changeQty(d.dataset.dec, -1);
});

$("search").addEventListener("input", renderProducts);
$("openCart").addEventListener("click", () => showCart(true));
$("closeCart").addEventListener("click", () => showCart(false));
$("cartOverlay").addEventListener("click", () => showCart(false));
$("checkoutButton").addEventListener("click", submitOrder);

$("orderType").addEventListener("change", () => {
  $("addressField").style.display =
    $("orderType").value === "Domicilio" ? "grid" : "none";
});

renderCategories();
renderProducts();
renderCart();
