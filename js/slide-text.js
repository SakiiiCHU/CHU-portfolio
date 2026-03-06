// js/slide-text.js
// Stable slide text animation with IntersectionObserver

document.addEventListener("DOMContentLoaded", () => {
  const headers = document.querySelectorAll(".concept__headline--slide");
  console.log("Found slide text elements:", headers.length);

  if (!headers.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        console.log("Slide text intersection:", entry.isIntersecting, entry.intersectionRatio, el);

        if (entry.isIntersecting) {
          el.classList.add("is-in");
          el.classList.remove("is-out", "leaving");
          console.log("Added is-in class to:", el);
        } else {
          el.classList.remove("is-in");
          el.classList.add("is-out");
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  headers.forEach((h) => {
    console.log("Observing slide text element:", h);
    io.observe(h);

    // Initial safety check:
    // if element is already in viewport on load, show it immediately
    requestAnimationFrame(() => {
      const rect = h.getBoundingClientRect();
      const vh = window.innerHeight;

      const visibleEnough = rect.top < vh * 0.88 && rect.bottom > vh * 0.18;
      if (visibleEnough) {
        h.classList.add("is-in");
        h.classList.remove("is-out", "leaving");
        console.log("Initial in-view fallback applied to:", h);
      }
    });
  });

  // Exit animation when leaving page
  const leaveAll = () => {
    headers.forEach((h) => h.classList.add("leaving"));
  };

  window.addEventListener("pagehide", leaveAll);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leaveAll();
    }
  });
});