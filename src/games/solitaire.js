export const Solitaire = {
  id: "solitaire",
  name: "经典纸牌（Solitaire / Klondike）",
  description: "标准 Klondike：拖拽移动、合法性判断、手机支持点一下自动上基础堆。",
  create({ ctx, ui, utils }){
    let w=0,h=0;

    let cardW=72, cardH=100;
    let pad=16, gap=12, stackGap=22;
    let topY=18, tableY=0;

    const stock = { type:"stock", x:0,y:0, cards:[] };
    const waste = { type:"waste", x:0,y:0, cards:[] };
    const foundations = utils.range(4).map(i=>({ type:"foundation", idx:i, x:0,y:0, cards:[] }));
    const tableaus = utils.range(7).map(i=>({ type:"tableau", idx:i, x:0,y:0, cards:[] }));

    let dragging=null; // { fromPile, cards, offsetX, offsetY }
    let animCards=new Set();

    let moves=0;
    let win=false;

    // tap helper (for mobile)
    let lastTapTime=0;
    let lastTapKey="";

    function makeDeck(){
      const suits=["♠","♥","♦","♣"];
      const colors={ "♠":"black", "♣":"black", "♥":"red", "♦":"red" };
      const deck=[];
      for(const s of suits){
        for(let r=1;r<=13;r++){
          deck.push({ suit:s, rank:r, color:colors[s], faceUp:false, x:0,y:0, tx:0,ty:0 });
        }
      }
      return deck;
    }

    function rankText(r){
      if(r===1) return "A";
      if(r===11) return "J";
      if(r===12) return "Q";
      if(r===13) return "K";
      return String(r);
    }

    function layoutCalc(){
      pad = Math.max(10, Math.min(18, Math.floor(Math.min(w,h)*0.03)));
      gap = Math.max(8, Math.min(14, Math.floor(w*0.015)));

      const maxW = w - pad*2;
      cardW = Math.floor((maxW - gap*6) / 7);
      cardW = utils.clamp(cardW, 44, 92);
      cardH = Math.floor(cardW * 1.38);

      topY = pad;
      tableY = topY + cardH + Math.max(12, Math.floor(cardH*0.20));
      stackGap = Math.max(14, Math.floor(cardH*0.22));

      stock.x = pad; stock.y = topY;
      waste.x = pad + cardW + gap; waste.y = topY;

      const rightStartX = w - pad - (cardW*4 + gap*3);
      for(let i=0;i<4;i++){
        foundations[i].x = rightStartX + i*(cardW+gap);
        foundations[i].y = topY;
      }

      for(let i=0;i<7;i++){
        tableaus[i].x = pad + i*(cardW+gap);
        tableaus[i].y = tableY;
      }

      snapAllCards(false);
    }

    function tableauCardPos(pile, index){
      let y = pile.y;
      for(let i=0;i<index;i++){
        const pc = pile.cards[i];
        y += (pc.faceUp ? stackGap : Math.floor(stackGap*0.55));
      }
      return { x: pile.x, y };
    }

    function snapCard(card,x,y,animate=true){
      if(!animate){
        card.x=x; card.y=y; card.tx=x; card.ty=y;
        return;
      }
      card.tx=x; card.ty=y;
      animCards.add(card);
    }

    function snapAllCards(animate=false){
      for(const c of stock.cards) snapCard(c, stock.x, stock.y, animate);
      for(let i=0;i<waste.cards.length;i++){
        const c=waste.cards[i];
        snapCard(c, waste.x + Math.min(i,2)*Math.floor(cardW*0.12), waste.y, animate);
      }
      for(const f of foundations){
        for(const c of f.cards) snapCard(c, f.x, f.y, animate);
      }
      for(const t of tableaus){
        for(let i=0;i<t.cards.length;i++){
          const p = tableauCardPos(t,i);
          snapCard(t.cards[i], p.x, p.y, animate);
        }
      }
    }

    function deal(){
      stock.cards.length=0;
      waste.cards.length=0;
      foundations.forEach(f=>f.cards.length=0);
      tableaus.forEach(t=>t.cards.length=0);
      dragging=null;
      animCards.clear();
      moves=0;
      win=false;

      let deck = makeDeck();
      utils.shuffle(deck);

      for(let i=0;i<7;i++){
        for(let j=0;j<=i;j++){
          const c=deck.pop();
          tableaus[i].cards.push(c);
          c.faceUp = (j===i);
        }
      }
      while(deck.length){
        const c=deck.pop();
        c.faceUp=false;
        stock.cards.push(c);
      }

      layoutCalc();
      updateHud();
    }

    function updateHud(){
      ui.setHud(`🃏 Moves：${moves}`, win ? "✅ 完成！" : `Stock：${stock.cards.length}  Waste：${waste.cards.length}`);
    }

    function isRed(card){ return card.color==="red"; }

    function canMoveToFoundation(card, foundation){
      if(!card.faceUp) return false;
      if(foundation.cards.length===0) return card.rank===1;
      const top = foundation.cards[foundation.cards.length-1];
      return top.suit===card.suit && card.rank===top.rank+1;
    }

    function canMoveToTableau(card, tableau){
      if(!card.faceUp) return false;
      if(tableau.cards.length===0) return card.rank===13;
      const top = tableau.cards[tableau.cards.length-1];
      if(!top.faceUp) return false;
      return (isRed(top)!==isRed(card)) && card.rank===top.rank-1;
    }

    function checkWin(){
      const total = foundations.reduce((s,f)=>s+f.cards.length,0);
      if(total===52) win=true;
    }

    function flipTopIfNeeded(tableau){
      if(tableau.cards.length===0) return;
      const top = tableau.cards[tableau.cards.length-1];
      if(!top.faceUp){
        top.faceUp=true;
        moves++;
      }
    }

    function drawFromStock(){
      if(stock.cards.length>0){
        const c=stock.cards.pop();
        c.faceUp=true;
        waste.cards.push(c);
        moves++;
        snapAllCards(true);
      }else{
        if(waste.cards.length===0) return;
        while(waste.cards.length){
          const c=waste.cards.pop();
          c.faceUp=false;
          stock.cards.push(c);
        }
        moves++;
        snapAllCards(true);
      }
      updateHud();
    }

    function tryAutoToFoundation(card, fromPile){
      for(const f of foundations){
        if(canMoveToFoundation(card, f)){
          // remove card from fromPile (assume top)
          fromPile.cards.pop();
          f.cards.push(card);
          moves++;
          snapAllCards(true);
          if(fromPile.type==="tableau") flipTopIfNeeded(fromPile);
          checkWin();
          updateHud();
          return true;
        }
      }
      return false;
    }

    function pickAt(x,y){
      // stock
      if(utils.inRect(x,y, stock.x, stock.y, cardW, cardH)) return { action:"stock" };

      // waste top
      const wt = waste.cards[waste.cards.length-1];
      if(wt && utils.inRect(x,y, wt.x, wt.y, cardW, cardH)) return { pile:waste, index:waste.cards.length-1, count:1 };

      // foundation top
      for(const f of foundations){
        const ft=f.cards[f.cards.length-1];
        if(ft && utils.inRect(x,y, ft.x, ft.y, cardW, cardH)) return { pile:f, index:f.cards.length-1, count:1 };
      }

      // tableau
      for(const t of tableaus){
        for(let i=t.cards.length-1;i>=0;i--){
          const c=t.cards[i];
          if(!c.faceUp) break;
          const rh = (i===t.cards.length-1) ? cardH : stackGap;
          if(utils.inRect(x,y, c.x, c.y, cardW, rh+6)){
            return { pile:t, index:i, count:t.cards.length-i };
          }
        }
        if(t.cards.length===0 && utils.inRect(x,y, t.x, t.y, cardW, cardH)){
          return { action:"emptyTableau", pile:t };
        }
      }

      return null;
    }

    function findDropTarget(x,y, movingCards){
      const single = (movingCards.length===1) ? movingCards[0] : null;

      if(single){
        for(const f of foundations){
          if(utils.inRect(x,y, f.x, f.y, cardW, cardH)){
            if(canMoveToFoundation(single, f)) return f;
          }
        }
      }

      for(const t of tableaus){
        if(t.cards.length===0){
          if(utils.inRect(x,y, t.x, t.y, cardW, cardH)){
            return canMoveToTableau(movingCards[0], t) ? t : null;
          }
        }else{
          const last=t.cards[t.cards.length-1];
          const rh = cardH + Math.floor(stackGap*0.6);
          if(utils.inRect(x,y, last.x, last.y, cardW, rh)){
            return canMoveToTableau(movingCards[0], t) ? t : null;
          }
        }
      }

      return null;
    }

    // render helpers
    function drawSlot(x,y){
      ctx.save();
      utils.roundRect(ctx,x,y,cardW,cardH,14);
      ctx.fillStyle="rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.14)";
      ctx.lineWidth=2;
      ctx.stroke();
      ctx.restore();
    }

    function drawCardFaceDown(card){
      ctx.save();
      utils.roundRect(ctx, card.x, card.y, cardW, cardH, 14);
      ctx.fillStyle="rgba(106,169,255,0.18)";
      ctx.fill();

      ctx.globalAlpha=0.85;
      ctx.strokeStyle="rgba(255,255,255,0.14)";
      ctx.lineWidth=1;
      const step=10;
      for(let i=0;i<cardW+cardH;i+=step){
        ctx.beginPath();
        ctx.moveTo(card.x+i, card.y);
        ctx.lineTo(card.x, card.y+i);
        ctx.stroke();
      }
      ctx.globalAlpha=1;

      ctx.strokeStyle="rgba(0,0,0,0.35)";
      ctx.lineWidth=2;
      ctx.stroke();
      ctx.restore();
    }

    function drawCardFaceUp(card){
      ctx.save();
      utils.roundRect(ctx, card.x, card.y, cardW, cardH, 14);
      ctx.fillStyle="rgba(255,255,255,0.92)";
      ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,0.22)";
      ctx.lineWidth=2;
      ctx.stroke();

      ctx.fillStyle = card.color==="red" ? "rgba(255,95,109,0.92)" : "rgba(20,26,38,0.90)";
      ctx.font = `800 ${Math.floor(cardW*0.22)}px ui-sans-serif, system-ui`;
      ctx.textAlign="left";
      ctx.textBaseline="top";
      ctx.fillText(`${rankText(card.rank)}${card.suit}`, card.x+10, card.y+8);

      ctx.globalAlpha=0.9;
      ctx.font = `900 ${Math.floor(cardW*0.52)}px ui-sans-serif, system-ui`;
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(card.suit, card.x+cardW/2, card.y+cardH/2+4);
      ctx.globalAlpha=1;

      ctx.restore();
    }

    function drawCard(card){
      if(card.faceUp) drawCardFaceUp(card);
      else drawCardFaceDown(card);
    }

    function render(){
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,0.18)";
      ctx.fillRect(0,0,w,h);

      utils.bevelPanel(ctx, 12,12, w-24, h-24, 20);

      drawSlot(stock.x, stock.y);
      drawSlot(waste.x, waste.y);
      for(const f of foundations) drawSlot(f.x, f.y);
      for(const t of tableaus) drawSlot(t.x, t.y);

      const st = stock.cards[stock.cards.length-1];
      if(st) drawCard(st);

      for(const c of waste.cards) drawCard(c);
      for(const f of foundations) for(const c of f.cards) drawCard(c);
      for(const t of tableaus) for(const c of t.cards) drawCard(c);

      if(dragging){
        for(const c of dragging.cards) drawCard(c);
      }

      if(win){
        ctx.fillStyle="rgba(0,0,0,0.30)";
        ctx.fillRect(0,0,w,h);
        ctx.fillStyle="rgba(255,255,255,0.92)";
        ctx.font = `900 ${Math.floor(Math.min(w,h)*0.06)}px ui-sans-serif, system-ui`;
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText("完成！", w/2, h/2 - 8);
      }

      ctx.restore();
    }

    function update(dt){
      if(animCards.size){
        for(const c of Array.from(animCards)){
          const dx=c.tx-c.x, dy=c.ty-c.y;
          const k = 1 - Math.pow(0.0008, dt*60);
          c.x += dx*k; c.y += dy*k;
          if(Math.abs(dx)<0.5 && Math.abs(dy)<0.5){
            c.x=c.tx; c.y=c.ty;
            animCards.delete(c);
          }
        }
      }
    }

    // pointer
    function pointerDown(e){
      if(win) return;

      const pick = pickAt(e.x,e.y);
      if(!pick) return;

      if(pick.action==="stock"){
        drawFromStock();
        return;
      }
      if(pick.action==="emptyTableau") return;

      const { pile, index, count } = pick;
      const moving = pile.cards.slice(index, index+count);
      if(moving.length===0) return;

      if((pile.type==="foundation" || pile.type==="waste") && moving.length!==1) return;
      if(pile.type!=="tableau" && index !== pile.cards.length-1) return;

      // Mobile: 单击（不拖）也能自动上基础堆（可行时）
      // 做法：记录“按下的卡”，如果很快抬起且移动距离小，就当 tap
      const topCard = moving[0];
      dragging = {
        fromPile: pile,
        cards: moving,
        offsetX: e.x - topCard.x,
        offsetY: e.y - topCard.y,
        startX: e.x,
        startY: e.y,
        startedAt: performance.now(),
        moved: false
      };

      pile.cards.splice(index, count);

      for(let i=0;i<dragging.cards.length;i++){
        const c=dragging.cards[i];
        c.x = e.x - dragging.offsetX;
        c.y = e.y - dragging.offsetY + i*stackGap;
      }
    }

    function pointerMove(e){
      if(!dragging) return;
      const dx = e.x - dragging.startX;
      const dy = e.y - dragging.startY;
      if(Math.hypot(dx,dy) > 6) dragging.moved = true;

      const baseX = e.x - dragging.offsetX;
      const baseY = e.y - dragging.offsetY;
      for(let i=0;i<dragging.cards.length;i++){
        const c=dragging.cards[i];
        c.x=baseX;
        c.y=baseY + i*stackGap;
      }
    }

    function pointerUp(e){
      if(!dragging) return;

      const movingCards = dragging.cards;
      const fromPile = dragging.fromPile;

      const isTap = !dragging.moved && (performance.now() - dragging.startedAt < 220) && movingCards.length===1;
      if(isTap){
        const card = movingCards[0];

        // 先把卡临时放回 fromPile，方便 auto move 逻辑
        fromPile.cards.push(card);

        // 双击也支持（桌面）
        const key = `${card.suit}-${card.rank}-${fromPile.type}-${fromPile.idx ?? ""}`;
        const now = performance.now();
        const isDouble = (key===lastTapKey && (now - lastTapTime) < 350);
        lastTapKey = key; lastTapTime = now;

        // 单击/双击都尝试自动上基础堆（能上就上）
        const top = fromPile.cards[fromPile.cards.length-1];
        if(top === card){
          const moved = tryAutoToFoundation(card, fromPile);
          if(moved) { dragging=null; return; }
          // 不可移动：还原并退出
          snapAllCards(true);
          dragging=null;
          return;
        }
      }

      const target = findDropTarget(e.x, e.y, movingCards);
      if(target){
        target.cards.push(...movingCards);
        moves++;
        snapAllCards(true);
        if(fromPile.type==="tableau") flipTopIfNeeded(fromPile);
        checkWin();
        updateHud();
      }else{
        fromPile.cards.push(...movingCards);
        snapAllCards(true);
      }

      dragging=null;
    }

    function resize(_w,_h){
      w=_w; h=_h;
      layoutCalc();
    }

    function start(){ deal(); }

    function getRulesHtml(){
      return `
        <p><b>目标：</b>把所有牌按花色移到右上角的 4 个基础堆（A → K）。</p>
        <p><b>操作：</b></p>
        <ul>
          <li>牌库（Stock）：点击翻一张到弃牌（Waste）；牌库空时点击可回收。</li>
          <li>列堆（Tableau）：红黑交替递减，空列只能放 K。</li>
          <li>基础堆（Foundation）：同花色递增 A→K。</li>
          <li><b>手机技巧：</b>点一下某张可移动的牌，会尝试自动上基础堆。</li>
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
      pointerMove,
      pointerUp,
      contextMenu(){},
      getRulesHtml
    };
  }
};


