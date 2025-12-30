import { createUI } from "./ui.js";
import { GameManager } from "./gameManager.js";
import { Minesweeper } from "./games/minesweeper.js";
import { Solitaire } from "./games/solitaire.js";

const ui = createUI();
const gm = new GameManager(ui.el.canvas, ui);

gm.register(Minesweeper);
gm.register(Solitaire);

ui.maybeShowInAppHint();

function showLobby(){
  gm.stop();
  ui.showLobby(gm.listGames());
}

function currentId(){
  return (location.hash || "#lobby").replace("#","");
}

function route(){
  const id = currentId();
  if(id === "lobby"){
    showLobby();
    return;
  }
  if(gm.registry.has(id)){
    const options = {};
    if(id === "minesweeper"){
      options.level = ui.el.difficultySelect.value || "easy";
    }
    gm.start(id, options);
    return;
  }
  location.hash = "#lobby";
}

ui.onSelectGame((id)=>{ location.hash = `#${id}`; });
ui.onBack(()=>{ location.hash = "#lobby"; });

ui.onRestart(()=>{
  const id = currentId();
  if(id === "minesweeper"){
    gm.restart({ level: ui.el.difficultySelect.value });
  }else{
    gm.restart();
  }
});

ui.onDifficulty((level)=>{
  if(currentId() === "minesweeper"){
    gm.restart({ level });
  }
});

ui.onToggleFlagMode(()=>{
  const g = gm.current;
  if(g?.toggleFlagMode){
    const on = g.toggleFlagMode();
    ui.setFlagMode(on);
  }
});

window.addEventListener("hashchange", route);
route();

