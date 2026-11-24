// ============================================
// ADMIN AUTH GUARD
// Include this on every admin page EXCEPT admin-login.html.
// Checks: is someone actually logged in, AND are they actually listed
// as an admin? If either check fails, they're redirected out immediately,
// before the page's real content is ever shown.
// ============================================

(async function () {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "admin-login.html";
    return;
  }

  const { data: adminRow } = await supabaseClient
    .from("admin_users")
    .select("id, full_name, role, can_edit_pricing")
    .eq("id", session.user.id)
    .single();

  if (!adminRow) {
    await supabaseClient.auth.signOut();
    window.location.href = "admin-login.html";
    return;
  }

  // Make the current admin's info available to the rest of the page —
  // e.g. showing their name, or hiding pricing controls if can_edit_pricing is false.
  window.currentAdmin = adminRow;
  document.dispatchEvent(new CustomEvent("adminReady", { detail: adminRow }));
})();

// ---------- Real logout, wired to every "Log Out" link ----------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href="admin-login.html"].admin-nav').forEach((link) => {
    if (link.textContent.trim().includes("Log Out")) {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = "admin-login.html";
      });
    }
  });
});

// ---------- Bridal Challenge links in the admin sidebar (added here so every admin page gets them) ----------
document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector(".admin-nav-list");
  if (!list) return;
  const settings = list.querySelector('a[href="admin-settings.html"]');
  const icon = '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="14" r="5" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="14" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M12 3l1.2 2.4L12 8l-1.2-2.6L12 3z" fill="currentColor"/></svg>';
  [["admin-challenge.html", "Bridal Challenge"], ["admin-challenge-votes.html", "Challenge Votes"]].forEach(([href, label]) => {
    if (list.querySelector('a[href="' + href + '"]')) return;
    const a = document.createElement("a");
    a.href = href; a.className = "admin-nav"; a.innerHTML = icon + label;
    list.insertBefore(a, settings || null);
  });
});
