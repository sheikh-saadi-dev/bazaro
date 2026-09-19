// import { db, collection, getDocs, query, where, orderBy } from "./firebase.js";
import { db, collection, getDocs, query, where } from "./firebase.js";
import { escapeHtml } from "./utils.js";

const FALLBACK_SLIDES = [
  { title: "Everyday goods, fair prices", description: "Discover essentials across electronics, fashion, home and beauty — delivered nationwide.", buttonText: "Shop now", buttonUrl: "products.html", imageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1400&q=70" },
  { title: "New season, new picks", description: "Fresh arrivals added weekly across every category.", buttonText: "Browse new arrivals", buttonUrl: "products.html?sort=newest", imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=70" },
  { title: "Home essentials, sorted", description: "Upgrade your space without upgrading your budget.", buttonText: "Shop home", buttonUrl: "products.html", imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1400&q=70" },
  { title: "Cash on delivery, everywhere", description: "Order with confidence — pay when it arrives at your door.", buttonText: "Start shopping", buttonUrl: "products.html", imageUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1400&q=70" },
  { title: "Deals worth waiting for", description: "Check top sale picks handpicked by our team this week.", buttonText: "See top sales", buttonUrl: "products.html?filter=topsale", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=70" }
];

export async function mountHero(hostId = "hero-root") {
  const host = document.getElementById(hostId);
  if (!host) return;
  let slides = [];
  try {
    // const snap = await getDocs(query(collection(db, "sliders"), where("active", "==", true), orderBy("order", "asc")));
    // slides = snap.docs.map(d => d.data());
    const snap = await getDocs(query(collection(db, "sliders"), where("active", "==", true)));
    slides = snap.docs.map(d => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (e) { /* fall through to defaults */ }
  if (!slides.length) slides = FALLBACK_SLIDES;

  host.innerHTML = `
    <div class="hero-track">
      ${slides.map(s => `
        <div class="hero-slide" style="background-image:url('${s.imageUrl}')">
          <div class="hero-copy">
            <h2>${escapeHtml(s.title || "")}</h2>
            <p>${escapeHtml(s.description || "")}</p>
            ${s.buttonText ? `<a class="btn btn-primary" href="${s.buttonUrl || "#"}">${escapeHtml(s.buttonText)}</a>` : ""}
          </div>
        </div>`).join("")}
    </div>
    ${slides.length > 1 ? `
    <button class="hero-nav prev" aria-label="Previous slide">‹</button>
    <button class="hero-nav next" aria-label="Next slide">›</button>
    <div class="hero-dots">${slides.map((_, i) => `<button data-i="${i}" class="${i === 0 ? "active" : ""}" aria-label="Go to slide ${i + 1}"></button>`).join("")}</div>
    ` : ""}
  `;
  if (slides.length <= 1) return;

  const track = host.querySelector(".hero-track");
  const dots = [...host.querySelectorAll(".hero-dots button")];
  let index = 0;
  let timer;

  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle("active", di === index));
  }
  function restart() { clearInterval(timer); timer = setInterval(() => go(index + 1), 5500); }

  host.querySelector(".prev").addEventListener("click", () => { go(index - 1); restart(); });
  host.querySelector(".next").addEventListener("click", () => { go(index + 1); restart(); });
  dots.forEach(d => d.addEventListener("click", () => { go(+d.dataset.i); restart(); }));
  host.addEventListener("mouseenter", () => clearInterval(timer));
  host.addEventListener("mouseleave", restart);
  restart();
}
