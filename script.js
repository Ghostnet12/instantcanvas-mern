/* UX sprinkles + Markdown blog loader (no bundler needed) */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Current year on all pages
  $$("#year").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Mobile nav toggle
  const toggle = $(".nav-toggle");
  const list = $("#nav-list");
  if (toggle && list) {
    toggle.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close on link click (mobile)
    $$("#nav-list a").forEach((a) =>
      a.addEventListener("click", () => list.classList.remove("open"))
    );
  }

  // Scroll entrance animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("anim-in");
          observer.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );
  $$("[data-animate]").forEach((el) => observer.observe(el));

  // Contact form — upgraded validator (works with simple or pro fields)
  (function contactFormEnhancements() {
    const form = $("#contact-form");
    if (!form) return;

    function setError(input, msg) {
      const wrap =
        input?.closest?.(".field") ||
        input?.closest?.(".checkbox") ||
        form.querySelector(`.error[data-for="${input?.name}"]`)?.parentElement ||
        form;
      const errFromWrap = wrap.querySelector?.(".error");
      const errByFor = form.querySelector?.(`.error[data-for="${input?.name}"]`);
      const target = errFromWrap || errByFor;
      if (target) target.textContent = msg || "";
    }

    function radioChecked(radioNodeList) {
      if (!radioNodeList) return true;
      const nodes = Array.isArray(radioNodeList)
        ? radioNodeList
        : radioNodeList.length !== undefined
        ? Array.from(radioNodeList)
        : [radioNodeList];
      if (nodes.length === 0) return true;
      return nodes.some((r) => r.checked);
    }

    function validate() {
      let ok = true;
      const required = ["name", "email", "message"];
      ["budget", "timeline", "consent"].forEach((name) => {
        if (form.elements.namedItem(name)) required.push(name);
      });
      const typeNode = form.elements.namedItem("type");

      for (const key of required) {
        const el = form.elements.namedItem(key);
        if (!el) continue;
        if (el.type === "checkbox") {
          if (!el.checked) {
            ok = false;
            setError(el, "Please confirm consent.");
          } else setError(el, "");
          continue;
        }
        const value = (el.value || "").trim();
        if (!value) {
          ok = false;
          setError(el, "This field is required.");
        } else if (
          el.name === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          ok = false;
          setError(el, "Please enter a valid email.");
        } else setError(el, "");
      }
      if (typeNode && !radioChecked(typeNode)) {
        const firstRadio =
          (Array.isArray(typeNode) ? typeNode[0] : typeNode[0]) ||
          form.querySelector('input[name="type"]');
        ok = false;
        setError(firstRadio, "Please choose a project type.");
      } else if (typeNode) {
        const firstRadio =
          (Array.isArray(typeNode) ? typeNode[0] : typeNode[0]) ||
          form.querySelector('input[name="type"]');
        if (firstRadio) setError(firstRadio, "");
      }
      const links = form.elements.namedItem("links");
      if (links) {
        const v = links.value.trim();
        if (v && !/^https?:\/\/.+/i.test(v)) {
          ok = false;
          setError(links, "Please use a full URL (https://…)");
        } else {
          setError(links, "");
        }
      }
      return ok;
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate()) return;
      const btn = form.querySelector("button[type=submit]");
      const original = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }
      const payload = {};
      const fd = new FormData(form);
      fd.forEach((val, key) => {
        payload[key] = val;
      });
      // Send to API if /api/contact is available, else fallback
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then((response) => {
        if (!response.ok) throw new Error("Server error");
        return response.json();
      }).then((json) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = original;
        }
        const success = form.querySelector(".form-success");
        if (success) {
          success.hidden = false;
        } else {
          form.reset();
          alert("Thanks! We’ll get back to you with a plan and quote.");
        }
      }).catch((err) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = original;
        }
        alert("Oops, something went wrong. Please try again later.");
        console.error(err);
      });
    });
    const newBtn = $("#new-request");
    if (newBtn) {
      newBtn.addEventListener("click", () => {
        form.reset();
        form.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
        const success = form.querySelector(".form-success");
        if (success) success.hidden = true;
      });
    }
  })();

  // BLOG: list page (blog.html) — simple manifest you can edit
  async function loadMarkdownList() {
    const container = document.getElementById("post-list");
    if (!container) return;
    const manifest = [
      {
        slug: "first-post",
        title: "One-Week Launch Playbook",
        date: "2025-09-18",
        description: "How we go from kickoff to live site in 5–10 days.",
      },
    ];
    for (const item of manifest) {
      const card = document.createElement("article");
      card.className = "card service";
      card.innerHTML = `
        <h3><a href="./post.html?slug=${item.slug}">${item.title}</a></h3>
        <p class="muted">${item.description}</p>
        <p class="muted">${new Date(item.date).toLocaleDateString()}</p>
      `;
      container.appendChild(card);
    }
  }
  loadMarkdownList();
  // BLOG: single post renderer (post.html?slug=*)
  async function renderPost() {
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");
    const content = document.getElementById("content");
    if (!slug || !content) return;
    try {
      const res = await fetch(`./content-${slug}.md`);
      if (!res.ok) throw new Error("not found");
      const md = await res.text();
      const html = markdownToHtml(md);
      content.innerHTML = html;
      const h1 = content.querySelector("h1, h2, h3");
      if (h1) {
        $("#title").textContent = h1.textContent;
        document.title = `${h1.textContent} — InstantCanvas`;
      }
      const firstP = content.querySelector("p");
      if (firstP) {
        const desc = firstP.textContent.slice(0, 160);
        const meta = $("#meta");
        if (meta) meta.textContent = desc;
        const metaDesc = $("#post-description");
        if (metaDesc) metaDesc.setAttribute("content", desc);
      }
    } catch (e) {
      content.textContent = "Sorry, post not found.";
    }
  }
  renderPost();
  // Tiny Markdown → HTML (headings, lists, code, emphasis, links)
  function markdownToHtml(md) {
    const esc = (s) =>
      s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
    const lines = md.split("\n");
    let html = "", inCode = false;
    for (let line of lines) {
      if (line.startsWith("```")) {
        inCode = !inCode;
        html += inCode ? "<pre><code>" : "</code></pre>";
        continue;
      }
      if (inCode) {
        html += esc(line) + "\n";
        continue;
      }
      if (/^#\s+/.test(line)) html += "<h1>"+esc(line.replace(/^#\s+/,""))+"</h1>";
      else if (/^##\s+/.test(line)) html += "<h2>"+esc(line.replace(/^##\s+/,""))+"</h2>";
      else if (/^###\s+/.test(line)) html += "<h3>"+esc(line.replace(/^###\s+/,""))+"</h3>";
      else if (/^\s*-\s+/.test(line)) html += "<ul><li>"+esc(line.replace(/^\s*-\s+/,""))+"</li></ul>";
      else if (line.trim()==="") html += "";
      else {
        let p = esc(line)
          .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
          .replace(/\*(.+?)\*/g,"<em>$1</em>")
          .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2">$1</a>');
        html += "<p>"+p+"</p>";
      }
    }
    html = html.replace(/<\/ul>\s*<ul>/g,"");
    return html;
  }

  // --- Services Pro: tabs + "What you get" toggles
  (function(){
    const tabs = $$(".service-tabs .tab");
    const cards = $$(".service-pro");
    tabs.forEach(tab=>{
      tab.addEventListener("click", ()=>{
        tabs.forEach(t=> t.classList.remove("is-active"));
        tab.classList.add("is-active");
        const seg = tab.dataset.seg;
        cards.forEach(card=>{
          const has = (card.dataset.seg || "").includes(seg) || seg === "all";
          card.style.display = has ? "" : "none";
        });
      });
    });
    $$(".service-more").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("aria-controls");
        const panel = document.getElementById(id);
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        if (panel) panel.hidden = open;
      });
    });
  })();

  // --- Services → Contact: prefill project type + smooth scroll
  (function(){
    function prefillProjectType(typeLabel){
      const form = $("#contact-form");
      if (!form || !typeLabel) return;
      const radios = form.querySelectorAll('input[name="type"]');
      if (radios.length){
        let matched = false;
        radios.forEach(r=>{
          if (r.value.trim().toLowerCase() === typeLabel.trim().toLowerCase()){
            r.checked = true; matched = true;
          }
        });
        const seg = form.querySelector(".segmented");
        if (seg){ seg.classList.add("flash"); setTimeout(()=> seg.classList.remove("flash"), 1200); }
        if (matched) return;
      }
      const typeSelect = form.elements.namedItem("type");
      if (typeSelect && typeSelect.tagName === "SELECT"){
        const options = [...typeSelect.options];
        const hit = options.find(o => o.value.trim().toLowerCase() === typeLabel.trim().toLowerCase());
        if (hit) typeSelect.value = hit.value;
      }
    }
    function smoothScrollTo(el){ if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    $$(".go-contact").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const type = btn.getAttribute("data-type");
        const target = document.getElementById("contact") || document.querySelector('section#contact');
        smoothScrollTo(target);
        setTimeout(()=>{
          prefillProjectType(type);
          const firstField = document.querySelector('#contact-form [name="name"]') || document.querySelector('#contact-form input, #contact-form textarea');
          if (firstField) firstField.focus({ preventScroll: true });
        }, 300);
      });
    });
    (function prefillFromURL(){
      const params = new URLSearchParams(location.search);
      const t = params.get("type");
      if (!t) return;
      const target = document.getElementById("contact");
      if (target){
        smoothScrollTo(target);
        setTimeout(()=> prefillProjectType(t), 250);
      }
    })();
  })();
})();