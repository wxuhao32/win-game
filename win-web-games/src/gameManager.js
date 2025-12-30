import { utils } from "./utils.js";

export class GameManager{
  constructor(canvas, ui){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;

    this.registry = new Map();
    this.current = null;     // current game instance
    this.currentMeta = null; // game meta
    this.running = false;

    this.w = 0; this.h = 0; this.dpr = 1;
    this.lastT = 0;

    // Pointer capture state
    this.pointer = {
      id: null,
      x: 0, y: 0,
      down: false,
      type: "mouse",
      button: 0
    };

    this._bindEvents();
  }

  register(gameMeta){
    this.registry.set(gameMeta.id, gameMeta);
  }

  listGames(){
    return Array.from(this.registry.values()).map(g=>({
      id: g.id, name: g.name, description: g.description
    }));
  }

  start(gameId, options={}){
    const meta = this.registry.get(gameId);
    if(!meta) throw new Error(`Game not found: ${gameId}`);

    this.stop();

    this.currentMeta = meta;
    this.current = meta.create({ canvas: this.canvas, ctx: this.ctx, ui: this.ui, utils });
    this.ui.showGame(meta);
    this.ui.setRulesHtml(this.current.getRulesHtml?.() ?? "");
    this.ui.toggleRules(false);

    // Minesweeper needs difficulty UI
    this.ui.setDifficultyVisible(gameId === "minesweeper");

    this.resize();
    this.current.start?.(options);

    this.running = true;
    this.lastT = utils.now();
    requestAnimationFrame(this._tick);
  }

  restart(options={}){
    if(!this.current) return;
    this.current.start?.(options);
    this.ui.setRulesHtml(this.current.getRulesHtml?.() ?? "");
    this.ui.toggleRules(false);
  }

  stop(){
    if(this.current){
      this.current.stop?.();
      this.current = null;
      this.currentMeta = null;
    }
    this.running = false;
  }

  resize(){
    const fit = utils.fitCanvasToParent(this.canvas);
    this.w = fit.w;
    this.h = fit.h;
    this.dpr = fit.dpr;

    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0); // 统一用 CSS 像素坐标绘制
    this.current?.resize?.(this.w, this.h, this.dpr);
  }

  // --- RAF loop ---
  _tick = (t)=>{
    if(!this.running) return;

    const now = t;
    const dt = Math.min(0.033, Math.max(0.0, (now - this.lastT)/1000));
    this.lastT = now;

    // clear
    this.ctx.clearRect(0,0,this.w,this.h);

    // update & render
    this.current?.update?.(dt);
    this.current?.render?.();

    requestAnimationFrame(this._tick);
  };

  _toCanvasXY(ev){
    const rect = this.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left);
    const y = (ev.clientY - rect.top);
    return { x, y };
  }

  _bindEvents(){
    // Resize
    const ro = new ResizeObserver(()=>this.resize());
    ro.observe(this.canvas);

    // Prevent default context menu on canvas
    this.canvas.addEventListener("contextmenu", (e)=>{
      e.preventDefault();
      this.current?.contextMenu?.(this._normalizePointerEvent(e));
    });

    // Pointer events
    this.canvas.addEventListener("pointerdown", (e)=>{
      this.canvas.setPointerCapture(e.pointerId);
      const pe = this._normalizePointerEvent(e);
      this.pointer.id = e.pointerId;
      this.pointer.down = true;
      this.pointer.type = pe.pointerType;
      this.pointer.button = pe.button;
      this.current?.pointerDown?.(pe);
    });

    this.canvas.addEventListener("pointermove", (e)=>{
      const pe = this._normalizePointerEvent(e);
      this.current?.pointerMove?.(pe);
    });

    this.canvas.addEventListener("pointerup", (e)=>{
      const pe = this._normalizePointerEvent(e);
      this.pointer.down = false;
      this.current?.pointerUp?.(pe);
    });

    this.canvas.addEventListener("pointercancel", (e)=>{
      const pe = this._normalizePointerEvent(e);
      this.pointer.down = false;
      this.current?.pointerUp?.(pe);
    });

    // Keyboard (Solitaire 可拓展快捷键)
    window.addEventListener("keydown", (e)=>{
      this.current?.keyDown?.(e);
    });
  }

  _normalizePointerEvent(e){
    const {x,y} = this._toCanvasXY(e);
    return {
      x, y,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
      pointerType: e.pointerType || "mouse",
      button: e.button ?? 0,
      buttons: e.buttons ?? 0,
      altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey,
      original: e
    };
  }
}
