const works = [
  {
    title: "AI Travel Website",
    student: "Leo Y.",
    className: "2026 Term 2 Holiday Camp",
    type: "web",
    label: "Websites",
    image: "assets/project-travel-nz.png",
    description: "一个介绍新西兰旅行路线的网页项目，包含目的地、活动和视觉版式设计。",
    tools: "AI 工具、HTML、CSS、网页结构设计",
    note: "Leo 把旅行兴趣转化成清晰的网站结构，能够说明每个页面区块的目的。"
  },
  {
    title: "Story Generator",
    student: "Mia C.",
    className: "Creative AI Project",
    type: "ai",
    label: "AI Art",
    image: "assets/project-story-generator.png",
    description: "一个结合 AI 创意写作与图像生成的故事项目，从角色设定到故事场景都有完整构思。",
    tools: "ChatGPT、AI 图像、提示词设计、故事结构",
    note: "Mia 的项目体现了很好的想象力，也开始理解如何用提示词控制输出方向。"
  },
  {
    title: "Mini Platform Game",
    student: "Noah L.",
    className: "Code Playground",
    type: "game",
    label: "Games",
    image: "assets/project-mini-game.png",
    description: "一个横版小游戏原型，包含角色移动、收集金币和基础关卡设计。",
    tools: "编程逻辑、游戏规则、调试与迭代",
    note: "Noah 在这个项目里练习了条件判断和反馈机制，能主动发现并修正问题。"
  },
  {
    title: "Sustainable City",
    student: "Ava T.",
    className: "Future Ideas Showcase",
    type: "presentation",
    label: "Presentations",
    image: "assets/project-sustainable-city.png",
    description: "一个关于未来可持续城市的展示项目，结合环保主题、视觉表达和数据图表。",
    tools: "AI 调研、演示设计、信息组织、项目表达",
    note: "Ava 能把抽象主题拆成几个清晰观点，并用视觉方式帮助观众理解。"
  }
];

const grid = document.querySelector("#workGrid");
const filters = document.querySelectorAll(".filter");
const dialog = document.querySelector("#workDialog");
const dialogImage = document.querySelector("#dialogImage");
const dialogMeta = document.querySelector("#dialogMeta");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogDescription = document.querySelector("#dialogDescription");
const dialogTools = document.querySelector("#dialogTools");
const dialogNote = document.querySelector("#dialogNote");
const closeDialog = document.querySelector(".dialog-close");
const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector(".main-nav");
const navLinks = document.querySelectorAll(".main-nav a");

function renderWorks() {
  grid.innerHTML = works
    .map(
      (work, index) => `
        <article class="work-card" data-type="${work.type}" data-index="${index}" tabindex="0">
          <img src="${work.image}" alt="${work.title} 作品封面" />
          <div class="work-body">
            <div class="work-meta">
              <span>${work.student}</span>
              <span class="badge">${work.label}</span>
            </div>
            <h3>${work.title}</h3>
            <p>${work.className}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function applyFilter(type) {
  document.querySelectorAll(".work-card").forEach((card) => {
    card.hidden = type !== "all" && card.dataset.type !== type;
  });
}

function openWork(index) {
  const work = works[index];
  dialogImage.src = work.image;
  dialogImage.alt = `${work.title} 作品封面`;
  dialogImage.style.objectFit = "cover";
  dialogImage.style.backgroundColor = "";
  dialogMeta.textContent = `${work.className} · ${work.student}`;
  dialogTitle.textContent = work.title;
  dialogDescription.textContent = work.description;
  dialogTools.textContent = work.tools;
  dialogNote.textContent = work.note;
  dialog.showModal();
}

renderWorks();

// 渲染作品素材
const materialsGrid = document.querySelector("#materialsGrid");

function renderMaterials() {
  if (!materialsGrid) return;
  if (!window.materialsData || window.materialsData.length === 0) {
    materialsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px 0;">暂无作品素材，请在 Materials/ 目录下放置图片并运行扫描脚本。</p>`;
    return;
  }

  // 每次进入页面时随机打乱素材
  const indices = Array.from({ length: window.materialsData.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // 首页单行展示，这里限制最多展示 4 个随机素材
  const countToShow = Math.min(4, window.materialsData.length);
  const randomIndices = indices.slice(0, countToShow);

  materialsGrid.innerHTML = randomIndices
    .map(
      (idx) => {
        const item = window.materialsData[idx];
        const displayName = item.name.replace(/\.[^/.]+$/, "");
        return `
          <article class="material-card">
            <div class="material-media" onclick="previewMaterial(${idx})">
              <img src="${item.url}" alt="${item.name}" />
            </div>
            <div class="material-body">
              <h3 class="material-name" title="${displayName}">${displayName}</h3>
            </div>
          </article>
        `;
      }
    )
    .join("");
}

window.previewMaterial = function(index) {
  const item = window.materialsData[index];
  const displayName = item.name.replace(/\.[^/.]+$/, "");
  dialogImage.src = item.url;
  dialogImage.alt = `${displayName} 预览`;
  dialogImage.style.objectFit = "contain";
  dialogImage.style.backgroundColor = "#ffffff";
  dialogMeta.textContent = `作品素材 · ${item.size}`;
  dialogTitle.textContent = displayName;
  dialogDescription.textContent = "课程和项目所需要用到的素材图片，你可以右键或点击“查看原图”进行下载使用。";
  dialogTools.textContent = "图片素材";
  dialogNote.textContent = "可以在项目中作为精灵图（Sprite sheet）、背景或装饰元素。";
  dialog.showModal();
};

renderMaterials();

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    applyFilter(button.dataset.filter);
  });
});

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".work-card");
  if (card) openWork(Number(card.dataset.index));
});

grid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".work-card");
  if (!card) return;
  event.preventDefault();
  openWork(Number(card.dataset.index));
});

closeDialog.addEventListener("click", () => dialog.close());

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

const sections = [...document.querySelectorAll("main section[id], #top")];

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id || "top";
      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
          const target = href.replace("#", "") || "top";
          link.classList.toggle("active", target === id);
        }
      });
    });
  },
  { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
);

sections.forEach((section) => observer.observe(section));
