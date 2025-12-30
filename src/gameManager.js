import { utils } from "./utils.js";

export class GameManager{
  constructor(canvas, ui){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;

    this.registry = new Map();
    this.current = null;
    this.currentMeta = null;

    this.running = false;
    this.w = 0; this.h = 0; this.dpr = 1;
    this.lastT = 0;

    this._bindEvents();
  }

  register(meta){ this.registry.set(meta.id, meta); }
  listGames(){
    return Array.from(this.registry.values()).map(g=>({ id:g.id, name:g.name, description:g.description }));
  }

  start(gameId, options={}){
    const meta = this.registry.get(gameId);
    if(!meta) throw new Error(`Game not found: ${gameId}`);

    this.stop();

    this.currentMeta = meta;
    this.current = meta.create({ canvas:this.canvas, ctx:this.ctx, ui:this.ui, utils });

    this.ui.showGame(meta);
    this.ui.setRulesHtml(this.current.getRulesHtml?.() ?? "");
    this.ui.toggleRules(false);

    // UI toggles
    this.ui.setDifficultyVisible(gameId === "minesweeper");
    this.ui.setFlagModeVisible(gameId === "minesweeper");

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

    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.current?.resize?.(this.w, this.h, this.dpr);
  }

  _tick = (t)=>{
    if(!this.running) return;

    const dt = Math.min(0.033, Math.max(0, (t - this.lastT)/1000));
    this.lastT = t;

    this.ctx.clearRect(0,0,this.w,this.h);
    this.current?.update?.(dt);
    this.current?.render?.();

    requestAnimationFrame(this._tick);
  };

  _toCanvasXY(ev){
    const rect = this.canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  _normalizePointerEvent(e){
    const {x,y} = this._toCanvasXY(e);
    return {
      x, y,
      clientX: e.clientX, clientY: e.clientY,
      pointerId: e.pointerId,
      pointerType: e.pointerType || "mouse",
      button: e.button ?? 0,
      buttons: e.buttons ?? 0,
      altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey,
      original: e
    };
  }

  _bindEvents(){
    // resize observers
    const ro = new ResizeObserver(()=>this.resize());
    ro.observe(this.canvas);

    // 手机地址栏/旋转更稳
    window.addEventListener("orientationchange", ()=>setTimeout(()=>this.resize(), 250));
    window.addEventListener("resize", ()=>this.resize());

    this.canvas.addEventListener("contextmenu", (e)=>{
      e.preventDefault();
      this.current?.contextMenu?.(this._normalizePointerEvent(e));
    });

    this.canvas.addEventListener("pointerdown", (e)=>{
      this.canvas.setPointerCapture(e.pointerId);
      this.current?.pointerDown?.(this._normalizePointerEvent(e));
    });

    this.canvas.addEventListener("pointermove", (e)=>{
      this.current?.pointerMove?.(this._normalizePointerEvent(e));
    });

    this.canvas.addEventListener("pointerup", (e)=>{
      this.current?.pointerUp?.(this._normalizePointerEvent(e));
    });

    this.canvas.addEventListener("pointercancel", (e)=>{
      this.current?.pointerUp?.(this._normalizePointerEvent(e));
    });

    window.addEventListener("keydown", (e)=>{
      this.current?.keyDown?.(e);
    });
  }
}

