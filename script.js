const PRODUCT = {
  name: "Ceinture correctrice de posture",
  stock: 33,
  deliveryFee: 0,
  offers: [
    { qty: 1, price: 20900, label: "1 pièce" },
    { qty: 2, price: 29900, label: "2 pièces" },
    { qty: 3, price: 36900, label: "3 pièces" }
  ]
};

// Ton endpoint Apps Script déjà déployé.
const SHOP = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw6_938nDaTTBXPLAjWIEuEGPYP6QYaRPTTNkZe05lT_sWxXKrHjuRNX0pQ1R4y4Z9Z/exec"
};

let selected = PRODUCT.offers[0];
let sending = false;

const $ = id => document.getElementById(id);
const money = n => `${Number(n).toLocaleString("fr-FR")} FCFA`;

function updateUI() {
  $("heroPrice").textContent = money(selected.price);
  $("selectedOffer").textContent = `${selected.label} — ${money(selected.price)}`;
  $("summaryQty").textContent = selected.label;
  $("totalPrice").textContent = money(selected.price + PRODUCT.deliveryFee);
  $("submitPrice").textContent = money(selected.price + PRODUCT.deliveryFee).replace(" FCFA", " F");
  $("stickyPrice").textContent = money(selected.price + PRODUCT.deliveryFee).replace(" FCFA", " F");

  document.querySelectorAll(".plan").forEach(btn => {
    btn.classList.toggle("selected", Number(btn.dataset.qty) === selected.qty);
  });
}

document.querySelectorAll(".plan").forEach(btn => {
  btn.addEventListener("click", () => {
    selected = PRODUCT.offers.find(o => o.qty === Number(btn.dataset.qty));
    updateUI();
    $("commande").scrollIntoView({ behavior: "smooth" });
  });
});

function setError(input, message) {
  input.closest("label").querySelector(".error").textContent = message;
}

function validate() {
  let ok = true;
  document.querySelectorAll(".error").forEach(el => el.textContent = "");

  const name = $("name");
  const phone = $("phone");
  const city = $("city");
  const address = $("address");

  if (name.value.trim().length < 2) {
    setError(name, "Veuillez renseigner votre nom.");
    ok = false;
  }

  const digits = phone.value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    setError(phone, "Veuillez vérifier votre numéro.");
    ok = false;
  }

  if (city.value.trim().length < 2) {
    setError(city, "Veuillez renseigner votre ville.");
    ok = false;
  }

  if (address.value.trim().length < 3) {
    setError(address, "Veuillez renseigner votre adresse.");
    ok = false;
  }

  return ok;
}

async function submitOrder(order) {
  if (!SHOP.APPS_SCRIPT_URL || SHOP.APPS_SCRIPT_URL.includes("COLLE_")) {
    throw new Error("URL Apps Script non configurée.");
  }

  // Iframe invisible pour envoyer le POST sans quitter la landing
  let iframe = document.getElementById("appsScriptTarget");

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "appsScriptTarget";
    iframe.name = "appsScriptTarget";
    iframe.style.display = "none";

    document.body.appendChild(iframe);
  }

  const form = document.createElement("form");

  form.method = "POST";
  form.action = SHOP.APPS_SCRIPT_URL;
  form.target = "appsScriptTarget";
  form.style.display = "none";

  const fields = {
    name: order.customer.name,
    phone: order.customer.phone,
    city: order.customer.city,
    address: order.customer.address,
    note: order.customer.note || "",

    offer: order.items[0].offer,
    quantity: String(order.items[0].quantity),

    subtotal: String(order.subtotal),
    deliveryFee: String(order.deliveryFee),
    total: String(order.total),

    website: ""
  };

  Object.entries(fields).forEach(([name, value]) => {

    const input = document.createElement("input");

    input.type = "hidden";
    input.name = name;
    input.value = value;

    form.appendChild(input);
  });

  document.body.appendChild(form);

  // Envoi réel vers Apps Script
  form.submit();

  // Sauvegarde locale de secours
  localStorage.setItem(
    "lastOrder",
    JSON.stringify(order)
  );

  setTimeout(() => {
    form.remove();
  }, 1500);
}

$("orderForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (sending) return;

  if ($("website").value.trim()) return;

  if (!validate()) return;

  sending = true;

  const button = document.querySelector(".submit");
  const status = $("sendStatus");
  const original = button.innerHTML;

  button.disabled = true;
  button.innerHTML = "ENVOI DE LA COMMANDE...";
  status.textContent = "Enregistrement de votre commande…";

  const order = {
    customer: {
      name: $("name").value.trim(),
      phone: $("phone").value.trim(),
      city: $("city").value.trim(),
      address: $("address").value.trim(),
      note: $("note").value.trim()
    },
    items: [{
      product: PRODUCT.name,
      offer: selected.label,
      quantity: selected.qty
    }],
    subtotal: selected.price,
    deliveryFee: PRODUCT.deliveryFee,
    total: selected.price + PRODUCT.deliveryFee,
    paymentMethod: "Paiement à la livraison",
    date: new Date().toISOString()
  };

  try {
    await submitOrder(order);

    $("customerName").textContent = order.customer.name;
    $("confirmedTotal").textContent = money(order.total);

    // La référence définitive est créée côté Apps Script.
    // On indique ici que la commande a été transmise.
    $("orderId").textContent = "ENREGISTREMENT EN COURS";

    status.textContent = "";
    $("successModal").classList.add("show");

    button.innerHTML = "COMMANDE ENVOYÉE ✓";
  } catch (error) {
    console.error(error);
    status.textContent = "Échec de l'envoi. Vérifiez votre connexion puis réessayez.";
    button.disabled = false;
    button.innerHTML = original;
    sending = false;
    return;
  }

  // Empêche un deuxième envoi après succès.
  button.disabled = true;
});

$("closeModal").addEventListener("click", () => {
  $("successModal").classList.remove("show");
});

$("successModal").addEventListener("click", event => {
  if (event.target === $("successModal")) {
    $("successModal").classList.remove("show");
  }
});

updateUI();
