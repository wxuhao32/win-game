export const utils = {
  clamp(v, a, b){ return Math.max(a, Math.min(b, v)); },
  lerp(a,b,t){ return a + (b-a)*t; },
  now(){ return performance.now(); },

  // Fisher–Yates
  shuffle(arr, rng=Math.random){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(rng()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // 生成 [0, n)
  range(n){ return Array.from({length:n}, (_,i)=>i); },

  // 圆角矩形
  roundRect(ctx, x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  },

  // DPR 适配：返回 {w,h,dpr}
  fitCanvasToParent(canvas){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    return { w, h, dpr };
  },

  // 命中测试
  inRect(px,py, x,y,w,h){
    return px>=x && px<=x+w && py>=y && py<=y+h;
  },

  // 颜色小工具：在暗背景上画出复古按钮高光/阴影感
  bevelFill(ctx, x,y,w,h, r){
    // 背板
    this.roundRect(ctx, x,y,w,h,r);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    // 内高光
    this.roundRect(ctx, x+1,y+1,w-2,h-2,r-1);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // 外暗边
    this.roundRect(ctx, x,y,w,h,r);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};
