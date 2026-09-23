// ============================================
// CUSTOMER AUTH GUARD
// Include on any page that requires a real logged-in customer.
// Redirects to login.html if nobody's signed in.
// ============================================

(async function () {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "login.html";
      return;
    }

    const { data: profile } = await supabaseClient
      .from("customers")
      .select("*")
      .eq("id", session.user.id)
      .single();

    window.currentCustomer = {
      id: session.user.id,
      email: session.user.email,
      full_name: (profile && profile.full_name) || "",
      phone: (profile && profile.phone) || "",
    };

    document.dispatchEvent(new CustomEvent("customerReady", { detail: window.currentCustomer }));
  } catch (e) {
    // Something genuinely went wrong (e.g. Supabase keys not set correctly) —
    // never leave the page silently invisible. Show it and log the real reason.
    console.error("Customer auth guard failed:", e);
    document.body.style.visibility = "visible";
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".customer-logout").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  });
});
