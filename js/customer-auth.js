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

    let finalProfile = profile;

    // First real login after a signup that couldn't save the profile yet
    // (no session existed at that moment) — create it now, using the
    // name/phone that were safely tucked into the account's own metadata.
    if (!profile) {
      const meta = session.user.user_metadata || {};
      const { data: created } = await supabaseClient
        .from("customers")
        .insert({ id: session.user.id, full_name: meta.full_name || "", phone: meta.phone || "" })
        .select()
        .single();
      finalProfile = created;
    }

    window.currentCustomer = {
      id: session.user.id,
      email: session.user.email,
      full_name: (finalProfile && finalProfile.full_name) || "",
      phone: (finalProfile && finalProfile.phone) || "",
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
