export const Minesweeper = {
  id: "minesweeper",
  name: "扫雷（Minesweeper）",
  description: "经典 Windows 扫雷：左键翻开，右键/长按插旗，支持手机插旗模式。",
  create({ ctx, ui, utils }){
    const LEVELS = {
      easy:   { cols: 9,  rows: 9,  mines: 10 },
      medium: { cols: 16, rows: 16, mines: 40 },
      hard:   { cols: 30, rows: 16, mines: 99 },
    };

    let w=0,h=0;
    let levelKey="easy";
    let cols=9, rows=9, mines=10;

    let cell=24, boardX=0, boardY=0;

    let firstClick=true;
    let gameOver=false;
    let win=false;

    let revealedCount=0;
    let flags=0;

    let time=0, timerRunning=false, timerAcc=0;

    let mineArr=[], revArr=[], flagArr=[], numArr=[];

    // Mobile helpers
    let flagMode = false; // tap = flag (when on)
    let lpTimer=null, lpFired=false;
    const LONG_PRESS_MS = 420;

    function idx(x,y){ return y*cols+x; }
    function inBounds(x,y){ return x>=0&&x<cols&&y>=0&&y<rows; }

    function reset(level="easy"){
      levelKey = level in LEVELS ? level : "easy";
      ({cols, rows, mines} = LEVELS[levelKey]);

      mineArr = new Array(cols*rows).fill(false);
      revArr  = new Array(cols*rows).fill(false);
      flagArr = new Array(cols*rows).fill(false);
      numArr  = new Array(cols*rows).fill(0);

      firstClick = true;
      gameOver = false;
      win = false;
      revealedCount = 0;
      flags = 0;

      time = 0; timerRunning = false; timerAcc = 0;

      // 默认手机开启插旗按钮但不强制开
      flagMode = false;
      ui.setFlagMode(flagMode);

      layout();
      updateHud();
    }

    function layout(){
      const pad = 16;
      const maxCellByW = Math.floor((w - pad*2) / cols);
      const maxCellByH = Math.floor((h - pad*2) / rows);
      cell = Math.max(14, Math.min(44, Math.min(maxCellByW, maxCellByH)));

      const boardW = cols*cell;
      const boardH = rows*cell;
      boardX = Math.floor((w - boardW)/2);
      boardY = Math.floor((h - boardH)/2);
    }

    function placeMinesAvoid(safeX, safeY){
      const banned = new Set();
      for(let dy=-1;dy<=1;dy++){
        for(let dx=-1;dx<=1;dx++){
          const nx=safeX+dx, ny=safeY+dy;
          if(inBounds(nx,ny)) banned.add(idx(nx,ny));
        }
      }

      let placed=0;
      while(placed < mines){
        const r = Math.floor(Math.random() * cols*rows);
        if(mineArr[r]) continue;
        if(banned.has(r)) continue;
        mineArr[r]=true;
        placed++;
      }

      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          const i=idx(x,y);
          if(mineArr[i]){ numArr[i] = -1; continue; }
          let c=0;
          for(let dy=-1;dy<=1;dy++){
            for(let dx=-1;dx<=1;dx++){
              if(dx===0&&dy===0) continue;
              const nx=x+dx, ny=y+dy;
              if(inBounds(nx,ny) && mineArr[idx(nx,ny)]) c++;
            }
          }
          numArr[i]=c;
        }
      }
    }

    function reveal(x,y){
      if(!inBounds(x,y)) return;
      const i=idx(x,y);
      if(revArr[i] || flagArr[i]) return;

      if(firstClick){
        firstClick=false;
        placeMinesAvoid(x,y);
        timerRunning=true;
      }

      if(mineArr[i]){
        revArr[i]=true;
        gameOver=true;
        win=false;
        timerRunning=false;
        revealAllMines();
        updateHud(true);
        return;
      }

      const stack=[[x,y]];
      while(stack.length){
        const [cx,cy]=stack.pop();
        const ci=idx(cx,cy);
        if(revArr[ci] || flagArr[ci]) continue;

        revArr[ci]=true;
        revealedCount++;

        if(numArr[ci]===0){
          for(let dy=-1;dy<=1;dy++){
            for(let dx=-1;dx<=1;dx++){
              const nx=cx+dx, ny=cy+dy;
              if(!inBounds(nx,ny)) continue;
              const ni=idx(nx,ny);
              if(!revArr[ni] && !flagArr[ni] && !mineArr[ni]){
                stack.push([nx,ny]);
              }
            }
          }
        }
      }

      checkWin();
      updateHud();
    }

    function toggleFlag(x,y){
      if(!inBounds(x,y)) return;
      const i=idx(x,y);
      if(revArr[i]) return;
      flagArr[i] = !flagArr[i];
      flags += flagArr[i] ? 1 : -1;
      updateHud();
    }

    function revealAllMines(){
      for(let i=0;i<mineArr.length;i++){
        if(mineArr[i]) revArr[i]=true;
      }
    }

    function checkWin(){
      const safe = cols*rows - mines;
      if(!gameOver && revealedCount >= safe){
        gameOver=true;
        win=true;
        timerRunning=false;
        for(let i=0;i<mineArr.length;i++){
          if(mineArr[i] && !flagArr[i]){ flagArr[i]=true; flags++; }
        }
      }
    }

    function cellFromXY(px,py){
      const gx = Math.floor((px - boardX)/cell);
      const gy = Math.floor((py - boardY)/cell);
      if(gx<0||gx>=cols||gy<0||gy>=rows) return null;
      return {x:gx,y:gy};
    }

    function updateHud(forceEnd=false){
      const minesLeft = Math.max(0, mines - flags);
      const left = `💣 雷：${minesLeft}   🚩 旗：${flags}${ui.isTouchLike() ? `   模式：${flagMode ? "插旗" : "翻开"}` : ""}`;
      let right = `⏱️ ${Math.floor(time)}s`;
      if(gameOver || forceEnd) right += win ? "   ✅ 胜利" : "   💥 失败";
      else if(firstClick) right += "   点击开始";
      ui.setHud(left, right);
    }

    function render(){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0,0,w,h);

      const boardW=cols*cell, boardH=rows*cell;
      utils.bevelPanel(ctx, boardX-10, boardY-10, boardW+20, boardH+20, 18);

      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          const i=idx(x,y);
          const px=boardX+x*cell, py=boardY+y*cell;

          if(revArr[i]){
            ctx.fillStyle="rgba(255,255,255,0.10)";
            ctx.fillRect(px,py,cell,cell);

            if(mineArr[i]){
              ctx.fillStyle="rgba(255,95,109,0.85)";
              ctx.beginPath();
              ctx.arc(px+cell/2, py+cell/2, cell*0.22, 0, Math.PI*2);
              ctx.fill();

              ctx.strokeStyle="rgba(0,0,0,0.45)";
              ctx.lineWidth=2;
              ctx.beginPath();
              ctx.moveTo(px+cell*0.2, py+cell/2);
              ctx.lineTo(px+cell*0.8, py+cell/2);
              ctx.moveTo(px+cell/2, py+cell*0.2);
              ctx.lineTo(px+cell/2, py+cell*0.8);
              ctx.stroke();
            }else{
              const n=numArr[i];
              if(n>0){
                ctx.font = `${Math.floor(cell*0.55)}px ui-sans-serif, system-ui`;
                ctx.textAlign="center";
                ctx.textBaseline="middle";
                ctx.fillStyle = `rgba(106,169,255,${0.35 + n*0.08})`;
                ctx.fillText(String(n), px+cell/2, py+cell/2+1);
              }
            }
          }else{
            ctx.fillStyle="rgba(255,255,255,0.10)";
            ctx.fillRect(px,py,cell,cell);

            ctx.strokeStyle="rgba(255,255,255,0.16)";
            ctx.lineWidth=2;
            ctx.strokeRect(px+1,py+1,cell-2,cell-2);

            ctx.strokeStyle="rgba(0,0,0,0.45)";
            ctx.lineWidth=2;
            ctx.strokeRect(px,py,cell,cell);

            if(flagArr[i]){
              ctx.fillStyle="rgba(79,227,138,0.85)";
              ctx.beginPath();
              ctx.moveTo(px+cell*0.35, py+cell*0.25);
              ctx.lineTo(px+cell*0.65, py+cell*0.38);
              ctx.lineTo(px+cell*0.35, py+cell*0.50);
              ctx.closePath();
              ctx.fill();

              ctx.strokeStyle="rgba(0,0,0,0.45)";
              ctx.lineWidth=2;
              ctx.beginPath();
              ctx.moveTo(px+cell*0.35, py+cell*0.25);
              ctx.lineTo(px+cell*0.35, py+cell*0.78);
              ctx.stroke();
            }
          }

          ctx.strokeStyle="rgba(0,0,0,0.22)";
          ctx.lineWidth=1;
          ctx.strokeRect(px,py,cell,cell);
        }
      }

      ctx.restore();
    }

    // Input
    function pointerDown(e){
      if(gameOver) return;

      lpFired=false;
      if(e.pointerType !== "mouse"){
        clearTimeout(lpTimer);
        lpTimer = setTimeout(()=>{
          lpFired=true;
          const c = cellFromXY(e.x,e.y);
          if(c) toggleFlag(c.x,c.y);
        }, LONG_PRESS_MS);
      }
    }

    function pointerUp(e){
      clearTimeout(lpTimer);
      if(gameOver) return;

      const c = cellFromXY(e.x,e.y);
      if(!c) return;

      if(e.pointerType === "mouse"){
        if(e.button === 2) toggleFlag(c.x,c.y);
        else reveal(c.x,c.y);
        return;
      }

      // touch:
      if(lpFired) return;
      if(flagMode) toggleFlag(c.x,c.y);
      else reveal(c.x,c.y);
    }

    function contextMenu(e){
      if(gameOver) return;
      const c = cellFromXY(e.x,e.y);
      if(c) toggleFlag(c.x,c.y);
    }

    function update(dt){
      if(timerRunning){
        timerAcc += dt;
        if(timerAcc >= 0.2){
          time += timerAcc;
          timerAcc = 0;
          updateHud();
        }
      }
    }

    function start(options={}){
      reset(options.level || levelKey);
    }

    function resize(_w,_h){
      w=_w; h=_h;
      layout();
    }

    function toggleFlagMode(){
      flagMode = !flagMode;
      updateHud();
      return flagMode;
    }

    function getRulesHtml(){
      return `
        <p><b>目标：</b>找出所有非地雷格子且不踩雷。</p>
        <p><b>操作：</b></p>
        <ul>
          <li>桌面端：<code>左键</code>翻开，<code>右键</code>插旗/取消。</li>
          <li>移动端：<code>点击</code>翻开；<code>长按</code>插旗（${LONG_PRESS_MS}ms）。</li>
          <li>移动端也可用：底部 <code>🚩插旗模式</code>（开：点击=插旗；关：点击=翻开）。</li>
        </ul>
        <p><b>规则：</b></p>
        <ul>
          <li>数字表示周围 8 格中的地雷数量。</li>
          <li>翻开空白（0）会自动展开相邻区域。</li>
          <li>首次点击保证安全，并尽量避免周围 8 格出现地雷。</li>
          <li>翻开所有安全格即胜利。</li>
        </ul>
      `;
    }

    return {
      start,
      stop(){},
      resize,
      update,
      render,
      pointerDown,
      pointerMove(){},
      pointerUp,
      contextMenu,
      getRulesHtml,
      toggleFlagMode
    };
  }
};

