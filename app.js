
function submitOrder() {
  const entries = Object.values(cart);

  if (!entries.length) {
    toast("Agrega productos antes de continuar.");
    return;
  }

  // Guardar el pedido para poder recuperarlo en el POS.
  const order = {
    customer: $("customer").value.trim(),
    phone: $("phone").value.trim(),
    type: $("orderType").value,
    address: $("address").value.trim(),
    payment: $("payment").value,
    notes: $("notes").value.trim(),
    items: entries.map(({ product, qty }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty
    })),
    total: entries.reduce(
      (sum, item) => sum + item.product.price * item.qty, 0
    ),
    date: new Date().toISOString()
  };

  if (!order.customer || !order.phone) {
    toast("Completa tu nombre y celular.");
    return;
  }

  if (order.type === "Domicilio" && !order.address) {
    toast("Escribe la dirección de entrega.");
    return;
  }

  // Guardar temporalmente el pedido en el navegador.
  localStorage.setItem("jp_burger_pending_order", JSON.stringify(order));

  // Abrir el sistema POS.
  window.location.href =
    "https://villadaa437-cmyk.github.io/jp-burger-pos/";
}

