export const utils = {
  clamp(v,a,b){ return Math.max(a, Math.min(b, v)); },
  now(){ return performance.now(); },

  shuffle(arr, rng=Math.random){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(rng()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  },

  range(n){ return Array.from({length:n},(_,i)=>i); },

  roundRect(ctx,x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
  },

  fitCanvasToParent(canvas){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    return { w, h, dpr };
  },

  inRect(px,py,x,y,w,h){
    return px>=x && px<=x+w && py>=y && py<=y+h;
  },

  bevelPanel(ctx, x,y,w,h, r){
    this.roundRect(ctx,x,y,w,h,r);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    this.roundRect(ctx,x+1,y+1,w-2,h-2,Math.max(0,r-1));
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    this.roundRect(ctx,x,y,w,h,r);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

