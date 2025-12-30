import { createUI } from "./ui.js";
import { GameManager } from "./gameManager.js";
import { Minesweeper } from "./games/minesweeper.js";
import { Solitaire } from "./games/solitaire.js";

const ui = createUI();
const gm = new GameManager(ui.el.canvas, ui);

gm.register(Minesweeper);
gm.register(Solitaire);

function showLobby(){
  gm.stop();
  ui.showLobby(gm.listGames());
}

function route(){
  const hash = (location.hash || "#lobby").replace("#","");
  if(hash === "lobby"){
    showLobby();
    return;
  }
  if(gm.registry.has(hash)){
    // start selected game
    const options = {};
    if(hash === "minesweeper"){
      options.level = ui.el.difficultySelect.value || "easy";
    }
    gm.start(hash, options);
    return;
  }
  // fallback
  location.hash = "#lobby";
}

ui.onSelectGame((id)=>{
  location.hash = `#${id}`;
});

ui.onBack(()=>{
  location.hash = "#lobby";
});

ui.onRestart(()=>{
  const id = (location.hash || "#lobby").replace("#","");
  if(id === "minesweeper"){
    gm.restart({ level: ui.el.difficultySelect.value });
  }else{
    gm.restart();
  }
});

ui.onDifficulty((level)=>{
  const id = (location.hash || "#lobby").replace("#","");
  if(id === "minesweeper"){
    gm.restart({ level });
  }
});

window.addEventListener("hashchange", route);
route();
