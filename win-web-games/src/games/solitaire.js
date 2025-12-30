export const Solitaire = {
  id: "solitaire",
  name: "经典纸牌（Solitaire / Klondike）",
  description: "标准 Klondike：拖拽移动、合法性判断、完成四组同花顺到 A→K。",
  create({ canvas, ctx, ui, utils }){
    let w=0,h=0,dpr=1;

    // layout
    let cardW=72, cardH=100;
    let pad=16, gap=12, stackGap=22;
    let topY=18, tableY=0;

    // piles
    const stock = { type:"stock", x:0,y:0, cards:[] };
    const waste = { type:"waste", x:0,y:0, cards:[] };
    const foundations = utils.range(4).map(i=>({ type:"foundation", idx:i, x:0,y:0, cards:[] }));
    const tableaus = utils.range(7).map(i=>({ type:"tableau", idx:i, x:0,y:0, cards:[] }));

    // drag state
    let dragging = null; // { fromPile, cards:[...], offsetX, offsetY, startX,startY }
    let animCards = new Set(); // cards currently animating

    let moves = 0;
    let win = false;

    function makeDeck(){
      const suits = ["♠","♥","♦","♣"];
      const colors = { "♠":"black", "♣":"black", "♥":"red", "♦":"red" };
      const deck = [];
      for(const s of suits){
        for(let r=1;r<=13;r++){
          deck.push({
            suit: s, rank: r, color: colors[s],
            faceUp: false,
            x: 0, y: 0, tx: 0, ty: 0,
          });
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
      pad = Math.max(12, Math.min(20, Math.floor(Math.min(w,h)*0.03)));
      gap = Math.max(10, Math.min(16, Math.floor(w*0.015)));
      // 7 列 tableau，需要在宽度内放下
      const maxW = w - pad*2;
      cardW = Math.floor((maxW - gap*6) / 7);
      cardW = utils.clamp(cardW, 46, 92);
      cardH = Math.floor(cardW * 1.38);

      topY = pad;
      tableY = topY + cardH + Math.max(16, Math.floor(cardH*0.22));
      stackGap = Math.max(16, Math.floor(cardH*0.22));

      // positions
      stock.x = pad; stock.y = topY;
      waste.x = pad + cardW + gap; waste.y = topY;

      // foundations align right
      const rightStartX = w - pad - (cardW*4 + gap*3);
      for(let i=0;i<4;i++){
        foundations[i].x = rightStartX + i*(cardW+gap);
        foundations[i].y = topY;
      }

      // tableaus
      for(let i=0;i<7;i++){
        tableaus[i].x = pad + i*(cardW+gap);
        tableaus[i].y = tableY;
      }

      // snap all cards to pile positions (keeping stack offsets)
      snapAllCards(false);
    }

    function pileTopPos(pile){
      return { x: pile.x, y: pile.y };
    }

    function tableauCardPos(pile, index){
      // index in pile.cards
      const c = pile.cards[index];
      const dy = c.faceUp ? stackGap : Math.floor(stackGap*0.55);
      let y = pile.y;
      for(let i=0;i<index;i++){
        const pc = pile.cards[i];
        y += (pc.faceUp ? stackGap : Math.floor(stackGap*0.55));
      }
      return { x: pile.x, y };
    }

    function snapCard(card, x,y, animate=true){
      if(!animate){
        card.x = x; card.y = y;
        card.tx = x; card.ty = y;
        return;
      }
      card.tx = x; card.ty = y;
      animCards.add(card);
    }

    function snapAllCards(animate=false){
      // stock: only top shows, but we position all same
      for(const c of stock.cards){
        snapCard(c, stock.x, stock.y, animate);
      }
      for(let i=0;i<waste.cards.length;i++){
        const c = waste.cards[i];
        // slight fan
        snapCard(c, waste.x + Math.min(i,2)*Math.floor(cardW*0.12), waste.y, animate);
      }
      for(const f of foundations){
        for(const c of f.cards){
          snapCard(c, f.x, f.y, animate);
        }
      }
      for(const t of tableaus){
        for(let i=0;i<t.cards.length;i++){
          const {x,y} = tableauCardPos(t,i);
          snapCard(t.cards[i], x,y, animate);
        }
      }
    }

    function deal(){
      // clear
      stock.cards.length = 0;
      waste.cards.length = 0;
      foundations.forEach(f=>f.cards.length=0);
      tableaus.forEach(t=>t.cards.length=0);
      dragging = null;
      animCards.clear();
      moves = 0;
      win = false;

      let deck = makeDeck();
      utils.shuffle(deck);

      // deal tableau 1..7, last face up
      for(let i=0;i<7;i++){
        for(let j=0;j<=i;j++){
          const c = deck.pop();
          tableaus[i].cards.push(c);
          c.faceUp = (j===i);
        }
      }
      // rest to stock face down
      while(deck.length){
        const c = deck.pop();
        c.faceUp = false;
        stock.cards.push(c);
      }

      layoutCalc();
      updateHud();
    }

    function updateHud(){
      const left = `🃏 Moves：${moves}`;
      const right = win ? "✅ 完成！" : `Stock：${stock.cards.length}   Waste：${waste.cards.length}`;
      ui.setHud(left, right);
    }

    function isRed(card){ return card.color === "red"; }

    function canMoveToFoundation(card, foundation){
      if(!card.faceUp) return false;
      if(foundation.cards.length === 0) return card.rank === 1; // A
      const top = foundation.cards[foundation.cards.length-1];
      return top.suit === card.suit && card.rank === top.rank + 1;
    }

    function canMoveToTableau(card, tableau){
      if(!card.faceUp) return false;
      if(tableau.cards.length === 0) return card.rank === 13; // K
      const top = tableau.cards[tableau.cards.length-1];
      if(!top.faceUp) return false;
      // alternate color, descending by 1
      return isRed(top) !== isRed(card) && card.rank === top.rank - 1;
    }

    function findDropTarget(x,y, movingCards){
      // Prefer foundation when single card and fits
      const single = movingCards.length === 1 ? movingCards[0] : null;

      if(single){
        for(const f of foundations){
          if(utils.inRect(x,y, f.x, f.y, cardW, cardH)){
            if(canMoveToFoundation(single, f)) return f;
          }
        }
      }

      // Tableaus: allow dropping onto top card area, or empty slot area
      for(const t of tableaus){
        // compute drop rect: if has cards, use last card rect expanded downward slightly
        if(t.cards.length === 0){
          if(utils.inRect(x,y, t.x, t.y, cardW, cardH)) return canMoveToTableau(movingCards[0], t) ? t : null;
        }else{
          const last = t.cards[t.cards.length-1];
          const rx = last.x, ry = last.y;
          const rh = cardH + Math.floor(stackGap*0.6);
          if(utils.inRect(x,y, rx, ry, cardW, rh)){
            return canMoveToTableau(movingCards[0], t) ? t : null;
          }
        }
      }

      return null;
    }

    function flipTopIfNeeded(tableau){
      if(tableau.cards.length === 0) return;
      const top = tableau.cards[tableau.cards.length-1];
      if(!top.faceUp){
        top.faceUp = true;
        moves++;
      }
    }

    function checkWin(){
      const total = foundations.reduce((s,f)=>s+f.cards.length,0);
      if(total === 52){
        win = true;
      }
    }

    // --- Input hit test ---
    function pickCardsAt(x,y){
      // If clicking stock: draw
      if(utils.inRect(x,y, stock.x, stock.y, cardW, cardH)){
        return { action:"stock" };
      }

      // If clicking waste top
      const wt = waste.cards[waste.cards.length-1];
      if(wt && utils.inRect(x,y, wt.x, wt.y, cardW, cardH)){
        return { pile: waste, index: waste.cards.length-1, count: 1 };
      }

      // Foundation top (single card only)
      for(const f of foundations){
        const ft = f.cards[f.cards.length-1];
        if(ft && utils.inRect(x,y, ft.x, ft.y, cardW, cardH)){
          return { pile: f, index: f.cards.length-1, count: 1 };
        }
      }

      // Tableaus: pick highest card under pointer (walk from top to bottom)
      for(const t of tableaus){
        // check from top down
        for(let i=t.cards.length-1;i>=0;i--){
          const c = t.cards[i];
          // only faceUp stack can be dragged
          if(!c.faceUp) break;
          const ry = c.y;
          const rh = (i === t.cards.length-1) ? cardH : stackGap;
          if(utils.inRect(x,y, c.x, ry, cardW, rh + 6)){
            return { pile: t, index: i, count: t.cards.length - i };
          }
        }
        // also allow click empty tableau slot
        if(t.cards.length===0 && utils.inRect(x,y, t.x, t.y, cardW, cardH)){
          return { action:"emptyTableau", pile: t };
        }
      }

      return null;
    }

    function drawFromStock(){
      if(stock.cards.length > 0){
        const c = stock.cards.pop();
        c.faceUp = true;
        waste.cards.push(c);
        moves++;
        snapAllCards(true);
      }else{
        // reset: waste -> stock (face down)
        if(waste.cards.length === 0) return;
        while(waste.cards.length){
          const c = waste.cards.pop();
          c.faceUp = false;
          stock.cards.push(c);
        }
        moves++;
        snapAllCards(true);
      }
      updateHud();
    }

    function moveCards(fromPile, toPile, cards){
      // remove from fromPile
      fromPile.cards.splice(fromPile.cards.length - cards.length, cards.length);
      // add to toPile
      toPile.cards.push(...cards);

      moves++;
      snapAllCards(true);

      // tableau uncover
      if(fromPile.type === "tableau") flipTopIfNeeded(fromPile);

      checkWin();
      updateHud();
    }

    function cancelDrag(){
      dragging = null;
      snapAllCards(true);
    }

    // --- Render helpers ---
    function drawSlot(x,y){
      ctx.save();
      utils.roundRect(ctx, x, y, cardW, cardH, 14);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function drawCardFaceDown(card){
      ctx.save();
      utils.roundRect(ctx, card.x, card.y, cardW, cardH, 14);
      ctx.fillStyle = "rgba(106,169,255,0.18)";
      ctx.fill();
      // pattern
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      const step = 10;
      for(let i=0;i<cardW+cardH;i+=step){
        ctx.beginPath();
        ctx.moveTo(card.x + i, card.y);
        ctx.lineTo(card.x, card.y + i);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function drawCardFaceUp(card){
      ctx.save();
      utils.roundRect(ctx, card.x, card.y, cardW, cardH, 14);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // corner text
      ctx.fillStyle = card.color === "red" ? "rgba(255,95,109,0.92)" : "rgba(20,26,38,0.90)";
      ctx.font = `700 ${Math.floor(cardW*0.22)}px ui-sans-serif, system-ui`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${rankText(card.rank)}${card.suit}`, card.x + 10, card.y + 8);

      // center suit
      ctx.globalAlpha = 0.9;
      ctx.font = `800 ${Math.floor(cardW*0.52)}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(card.suit, card.x + cardW/2, card.y + cardH/2 + 4);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawCard(card){
      if(card.faceUp) drawCardFaceUp(card);
      else drawCardFaceDown(card);
    }

    function render(){
      // background felt
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0,0,w,h);

      // panel
      utils.bevelFill(ctx, 12, 12, w-24, h-24, 20);

      // slots
      drawSlot(stock.x, stock.y);
      drawSlot(waste.x, waste.y);
      for(const f of foundations) drawSlot(f.x, f.y);
      for(const t of tableaus) drawSlot(t.x, t.y);

      // draw piles (non-drag first)
      // stock: only draw top card
      const st = stock.cards[stock.cards.length-1];
      if(st) drawCard(st);

      // waste: top 3 fanned (draw all but will overlap)
      for(const c of waste.cards) drawCard(c);

      // foundations: top only is enough but draw all ok
      for(const f of foundations){
        for(const c of f.cards) drawCard(c);
      }

      // tableaus: draw all in order
      for(const t of tableaus){
        for(const c of t.cards) drawCard(c);
      }

      // dragging on top
      if(dragging){
        for(const c of dragging.cards) drawCard(c);
      }

      // win overlay
      if(win){
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.30)";
        ctx.fillRect(0,0,w,h);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `800 ${Math.floor(Math.min(w,h)*0.06)}px ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("完成！", w/2, h/2 - 8);
        ctx.font = `500 ${Math.floor(Math.min(w,h)*0.028)}px ui-sans-serif, system-ui`;
        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.fillText("恭喜，你完成了 Klondike。", w/2, h/2 + 36);
        ctx.restore();
      }

      ctx.restore();
    }

    function update(dt){
      // animate cards to target positions
      if(animCards.size){
        for(const c of Array.from(animCards)){
          const dx = c.tx - c.x;
          const dy = c.ty - c.y;
          const k = 1 - Math.pow(0.0008, dt*60); // smooth
          c.x += dx * k;
          c.y += dy * k;
          if(Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5){
            c.x = c.tx; c.y = c.ty;
            animCards.delete(c);
          }
        }
      }
    }

    // --- Pointer ---
    function pointerDown(e){
      if(win) return;

      const pick = pickCardsAt(e.x,e.y);
      if(!pick) return;

      if(pick.action === "stock"){
        drawFromStock();
        return;
      }

      if(pick.action === "emptyTableau"){
        // nothing
        return;
      }

      const { pile, index, count } = pick;

      // only allow dragging legal exposed cards
      const moving = pile.cards.slice(index, index+count);
      if(moving.length===0) return;

      // from foundation/waste must be single
      if((pile.type==="foundation" || pile.type==="waste") && moving.length!==1) return;

      // ensure top cards selected correctly for foundation/waste
      if(pile.type!=="tableau" && index !== pile.cards.length-1) return;

      // attach drag
      const topCard = moving[0];
      dragging = {
        fromPile: pile,
        cards: moving,
        offsetX: e.x - topCard.x,
        offsetY: e.y - topCard.y
      };

      // bring to top by removing from pile temporarily
      pile.cards.splice(index, count);

      // keep relative offsets for stacked drag (tableau multiple)
      for(let i=0;i<dragging.cards.length;i++){
        const c = dragging.cards[i];
        c.x = e.x - dragging.offsetX;
        c.y = e.y - dragging.offsetY + i*stackGap;
      }
    }

    function pointerMove(e){
      if(!dragging) return;
      const baseX = e.x - dragging.offsetX;
      const baseY = e.y - dragging.offsetY;
      for(let i=0;i<dragging.cards.length;i++){
        const c = dragging.cards[i];
        c.x = baseX;
        c.y = baseY + i*stackGap;
      }
    }

    function pointerUp(e){
      if(!dragging) return;

      const movingCards = dragging.cards;
      const fromPile = dragging.fromPile;

      const target = findDropTarget(e.x, e.y, movingCards);

      if(target){
        // place to target
        target.cards.push(...movingCards);
        moves++;
        snapAllCards(true);

        // tableau uncover if needed
        if(fromPile.type === "tableau"){
          flipTopIfNeeded(fromPile);
        }

        checkWin();
        updateHud();
      }else{
        // revert
        fromPile.cards.push(...movingCards);
        snapAllCards(true);
      }

      dragging = null;
    }

    function resize(_w,_h,_dpr){
      w=_w; h=_h; dpr=_dpr;
      layoutCalc();
    }

    function start(){
      deal();
    }

    function getRulesHtml(){
      return `
        <p><b>目标：</b>把所有牌按花色移到右上角的 4 个基础堆（A → K）。</p>
        <p><b>牌堆：</b></p>
        <ul>
          <li><b>Stock（牌库）</b>：点击翻一张到 Waste；若牌库空，点击可把 Waste 重新回收。</li>
          <li><b>Waste（弃牌）</b>：只能移动最上面一张。</li>
          <li><b>Foundations（基础堆）</b>：同花色递增 A→K。</li>
          <li><b>Tableau（列堆）</b>：红黑交替递减（如 K♠ 接 Q♥），空列只能放 K。</li>
        </ul>
        <p><b>操作：</b></p>
        <ul>
          <li>桌面端：<code>鼠标拖拽</code>移动牌。</li>
          <li>移动端：<code>手指拖拽</code>移动牌（Canvas 已开启触控拖拽）。</li>
        </ul>
        <p><b>胜利：</b>当 4 个基础堆总计 52 张牌时完成。</p>
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
