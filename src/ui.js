export function createUI(){
  const el = {
    title: document.getElementById("uiTitle"),
    subtitle: document.getElementById("uiSubtitle"),
    lobby: document.getElementById("lobby"),
    lobbyGrid: document.getElementById("lobbyGrid"),
    stage: document.getElementById("stage"),
    canvas: document.getElementById("gameCanvas"),

    btnRules: document.getElementById("btnRules"),
    btnRestart: document.getElementById("btnRestart"),
    btnBack: document.getElementById("btnBack"),
    btnFlagMode: document.getElementById("btnFlagMode"),

    rulesPanel: document.getElementById("rulesPanel"),
    rulesBody: document.getElementById("rulesBody"),
    btnCloseRules: document.getElementById("btnCloseRules"),

    hudLeft: document.getElementById("hudLeft"),
    hudRight: document.getElementById("hudRight"),

    difficultyGroup: document.getElementById("difficultyGroup"),
    difficultySelect: document.getElementById("difficultySelect"),

    inappHint: document.getElementById("inappHint"),
    btnCloseHint: document.getElementById("btnCloseHint"),
  };

  const handlers = {
    onSelectGame: null,
    onRestart: null,
    onBack: null,
    onDifficulty: null,
    onToggleFlagMode: null
  };

  function isTouchLike(){
    return matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  }

  function setTitle(title, subtitle=""){
    el.title.textContent = title;
    el.subtitle.textContent = subtitle;
  }

  function showLobby(games){
    el.lobby.hidden = false;
    el.stage.hidden = true;
    el.rulesPanel.hidden = true;

    el.difficultyGroup.hidden = true;
    el.btnFlagMode.hidden = true;

    el.lobbyGrid.innerHTML = "";
    for(const g of games){
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card__badge">Classic</div>
        <div class="card__title">${g.name}</div>
        <div class="card__desc">${g.description}</div>
        <div class="card__hint">点击进入 · 支持触控</div>
      `;
      card.addEventListener("click", ()=>handlers.onSelectGame?.(g.id));
      el.lobbyGrid.appendChild(card);
    }

    setTitle("Windows 小游戏合集", "Canvas 复刻 · 扫雷 & 纸牌");
    setHud("—", "—");
  }

  function showGame(meta){
    el.lobby.hidden = true;
    el.stage.hidden = false;
    setTitle(meta.name, meta.description);
  }

  function setRulesHtml(html){
    el.rulesBody.innerHTML = html;
  }

  function toggleRules(force){
    const next = (typeof force === "boolean") ? force : el.rulesPanel.hidden;
    el.rulesPanel.hidden = !next;
  }

  function setHud(left, right){
    el.hudLeft.textContent = left;
    el.hudRight.textContent = right;
  }

  function setDifficultyVisible(visible){
    el.difficultyGroup.hidden = !visible;
  }

  function setFlagModeVisible(visible){
    // 只在触控设备上显示
    el.btnFlagMode.hidden = !(visible && isTouchLike());
  }

  function setFlagMode(isOn){
    el.btnFlagMode.textContent = `🚩 插旗模式：${isOn ? "开" : "关"}`;
  }

  function maybeShowInAppHint(){
    const ua = navigator.userAgent.toLowerCase();
    const isWeChat = ua.includes("micromessenger");
    const isQQ = ua.includes(" qq/") || ua.includes("mqqbrowser");
    if(isWeChat || isQQ){
      el.inappHint.hidden = false;
    }
  }

  // events
  el.btnRules.addEventListener("click", ()=>toggleRules());
  el.btnCloseRules.addEventListener("click", ()=>toggleRules(false));
  el.btnRestart.addEventListener("click", ()=>handlers.onRestart?.());
  el.btnBack.addEventListener("click", ()=>handlers.onBack?.());

  el.difficultySelect.addEventListener("change", ()=>{
    handlers.onDifficulty?.(el.difficultySelect.value);
  });

  el.btnFlagMode.addEventListener("click", ()=>{
    handlers.onToggleFlagMode?.();
  });

  el.btnCloseHint.addEventListener("click", ()=>{
    el.inappHint.hidden = true;
  });

  return {
    el,
    isTouchLike,
    setTitle,
    showLobby,
    showGame,
    setRulesHtml,
    toggleRules,
    setHud,
    setDifficultyVisible,
    setFlagModeVisible,
    setFlagMode,
    maybeShowInAppHint,
    onSelectGame(fn){ handlers.onSelectGame = fn; },
    onRestart(fn){ handlers.onRestart = fn; },
    onBack(fn){ handlers.onBack = fn; },
    onDifficulty(fn){ handlers.onDifficulty = fn; },
    onToggleFlagMode(fn){ handlers.onToggleFlagMode = fn; }
  };
}


