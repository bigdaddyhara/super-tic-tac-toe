var lt=Object.defineProperty;var dt=(i,e,t)=>e in i?lt(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var r=(i,e,t)=>dt(i,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();const ct=typeof window<"u"&&window.__DISABLE_INSTRUMENTATION;function W(i,e){if(!ct)try{console.log("[instr] event",i,e??null,{ts:Date.now()})}catch{}}const q=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];function J(i){for(const[e,t,n]of q){const s=i[e];if(s&&s===i[t]&&s===i[n])return s}return null}function ht(i){const e=i.map(t=>J(t));for(const[t,n,s]of q){const o=e[t];if(o&&o===e[n]&&o===e[s])return o}return null}class I extends Error{}class z extends I{}class ut extends I{}class gt extends I{}class ft extends I{}function _(i,e){if(!i)throw new I(`Invariant failed: ${e}`)}function x(i){const e=J(i);return e?{status:"Won",winner:e}:i.every(t=>t!==null)?{status:"Draw",winner:null}:{status:"Open",winner:null}}function mt(i){return i.map(e=>e.winner)}function pt(i){const t=mt(i).map(s=>s?Array.from({length:9}).map(()=>s):Array.from({length:9}).map(()=>null)),n=ht(t);return n||(i.every(s=>s.status!=="Open")?"Draw":"Ongoing")}function vt(i,e){try{W("move.attempt",e)}catch{}const{board:t,cell:n}=e,s=[];if(i.winner)throw new ut("Game already finished");if(t<0||t>8)throw new z("smallIndex out of range");if(n<0||n>8)throw new z("cellIndex out of range");const o=i.bigBoard[t];if(!o)throw new z("small board missing");if(o[n]!==null)throw new gt("Cell already occupied");if(i.nextBoardIndex!==null){const v=i.nextBoardIndex,u=i.bigBoard[v];if(u&&x(u).status==="Open"&&v!==t)throw new ft("Move not allowed by forced-board constraint")}const a=i.currentPlayer,l=i.bigBoard.map((v,u)=>u===t?[...v]:[...v]);l[t][n]=a,s.push({type:"CellMarked",board:t,cell:n,player:a});const d=l.map(v=>{const u=x(v);return{cells:v,status:u.status,winner:u.winner}}),f=x(i.bigBoard[t]),p=d[t];f.status==="Open"&&p.status==="Won"&&p.winner&&s.push({type:"SmallBoardWon",board:t,winner:p.winner});const m=pt(d);m==="X"||m==="O"?s.push({type:"BigBoardWon",winner:m}):m==="Draw"&&s.push({type:"Draw"});const b=d[n].status==="Open"?n:null;b===null&&s.push({type:"FreeMoveActivated"}),b!==null&&(_(b>=0&&b<=8,"nextBoardIndex out of range"),_(d[b].status==="Open","nextBoard must be open"));let h=null;m==="X"||m==="O"?h=m:m==="Draw"&&(h=null);const c={bigBoard:l,currentPlayer:a==="X"?"O":"X",nextBoardIndex:b,winner:h};try{W("move.result",{move:e,nextPlayer:c.currentPlayer,events:s})}catch{}return{nextState:c,events:s}}function P(i){if(i.winner)return[];function e(s){const o=i.bigBoard[s];return x(o).status==="Open"}let t;if(i.nextBoardIndex!==null)if(e(i.nextBoardIndex))t=[i.nextBoardIndex];else{t=[];for(let s=0;s<9;++s)e(s)&&t.push(s)}else{t=[];for(let s=0;s<9;++s)e(s)&&t.push(s)}const n=[];for(const s of t){const o=i.bigBoard[s];for(let a=0;a<9;++a)o[a]===null&&n.push({board:s,cell:a})}return n}function G(i,e){return P(i).some(n=>n.board===e.board&&n.cell===e.cell)}function N(){return{bigBoard:Array.from({length:9}).map(()=>Array.from({length:9}).map(()=>null)),currentPlayer:"X",nextBoardIndex:null,winner:null}}function U(i){return{row:Math.floor(i/3),col:i%3}}function X(i,e){return i*3+e}function bt(i,e,t){if(i<t.x||e<t.y||i>t.x+t.size||e>t.y+t.size)return null;const n=i-t.x,s=e-t.y,o=t.size/9,a=Math.max(0,Math.min(8,Math.floor(n/o))),l=Math.max(0,Math.min(8,Math.floor(s/o))),d=Math.max(0,Math.min(2,Math.floor(a/3))),f=Math.max(0,Math.min(2,Math.floor(l/3))),p=Math.max(0,Math.min(2,a%3)),m=Math.max(0,Math.min(2,l%3));return{boardIndex:X(f,d),cellIndex:X(m,p)}}function E(i,e,t){const{row:n,col:s}=U(i),{row:o,col:a}=U(e),l=n*3+o,d=s*3+a,f=t.size/9,p=t.size/9;return{x:t.x+d*f,y:t.y+l*p,w:f,h:p}}function K(i,e){const{row:t,col:n}=U(i),s=e.size/3;return{x:e.x+n*s,y:e.y+t*s,w:s,h:s}}const g={colors:{background:"#0f172a",bigGridLine:"#334155",smallGridLine:"#1e293b",markX:"#f87171",markO:"#60a5fa",forcedBoardBorder:"#facc15",freeMoveAllBoardsBorder:"#a3e635",legalCellOverlay:"rgba(163,230,53,0.12)",hoverCellOverlay:"rgba(250,204,21,0.22)",illegalClickFlash:"rgba(239,68,68,0.30)",closedBoardOverlayWon:"rgba(255,255,255,0.07)",closedBoardOverlayDraw:"rgba(0,0,0,0.35)",wonBoardSymbol:{X:"rgba(248,113,113,0.25)",O:"rgba(96,165,250,0.25)"}},lineWidth:{bigGrid:3,smallGrid:1,mark:3,forcedBoardBorder:3,freeMoveAllBoardsBorder:2},markPadding:.18,fontSize:{wonBoardSymbol:.7}};class yt{constructor({canvas:e,boardRect:t}){r(this,"canvas");r(this,"ctx");r(this,"boardRect");r(this,"warnedZeroSize",!1);r(this,"illegalFlashMove",null);r(this,"wonBoardFlash",new Map);this.canvas=e,this.boardRect=t;const n=e.getContext("2d");if(!n)throw new Error("CanvasRenderer: 2D rendering context is unavailable.");this.ctx=n}render(e,t,n){const s=this.canvas.clientWidth||this.canvas.width,o=this.canvas.clientHeight||this.canvas.height;if(s===0||o===0){this.warnedZeroSize||(console.warn("CanvasRenderer: canvas width/height is 0; skipping render until canvas is sized."),this.warnedZeroSize=!0);return}this.warnedZeroSize=!1;const a=Math.max(1,globalThis.devicePixelRatio||1),l=Math.round(s*a),d=Math.round(o*a);(this.canvas.width!==l||this.canvas.height!==d)&&(this.canvas.width=l,this.canvas.height=d),this.ctx.setTransform(1,0,0,1,0,0),this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.setTransform(a,0,0,a,0,0);const{x:f,y:p,size:m}=this.boardRect;this.ctx.fillStyle=g.colors.background,this.ctx.fillRect(0,0,s,o),this.drawBigGrid(f,p,m);for(const[h,c]of this.wonBoardFlash.entries())c.untilMs<=Date.now()&&this.wonBoardFlash.delete(h);for(let h=0;h<9;h+=1){const c=h,v=e.bigBoard[c],u=K(c,this.boardRect);this.drawSmallGrid(u);for(let T=0;T<9;T+=1){const C=T,k=v[C];if(!k)continue;const rt=E(c,C,this.boardRect);this.drawMark(k,rt)}const M=x(v);if(M.status==="Won"){if(this.ctx.fillStyle=g.colors.closedBoardOverlayWon,this.ctx.fillRect(u.x,u.y,u.w,u.h),!M.winner){console.warn("CanvasRenderer: small board is Won but winner is null; skipping winner symbol.");continue}this.drawWonBoardSymbol(M.winner,{x:u.x,y:u.y,size:u.w})}else M.status==="Draw"&&(this.ctx.fillStyle=g.colors.closedBoardOverlayDraw,this.ctx.fillRect(u.x,u.y,u.w,u.h));const L=this.wonBoardFlash.get(c);if(L&&L.untilMs>Date.now()){const T=Math.max(0,L.untilMs-Date.now()),C=Math.min(.55,T/420),k=this.withAlpha(L.winner==="X"?g.colors.markX:g.colors.markO,C);this.drawBoardBorder(c,k,4)}}if(n.showLegalMoves)for(const h of t.legalMoves){const c=E(h.board,h.cell,this.boardRect);this.drawCellOverlay(c,g.colors.legalCellOverlay)}if(t.hoverMove){const h=E(t.hoverMove.board,t.hoverMove.cell,this.boardRect);this.drawCellOverlay(h,g.colors.hoverCellOverlay)}if(t.isFreeMove&&n.showForcedBoard){const h=new Set;for(const c of t.legalMoves)h.add(c.board);for(const c of h)this.drawBoardBorder(c,g.colors.freeMoveAllBoardsBorder,g.lineWidth.freeMoveAllBoardsBorder)}const b=n.showLastMoveHighlight??!0;if(t.lastMove&&b){const h=E(t.lastMove.board,t.lastMove.cell,this.boardRect),c=900,v=t.lastMoveAgeMs??0,M=.18+Math.max(0,1-v/c)*.46;this.drawCellHighlight(h,`rgba(250,204,21,${M.toFixed(3)})`,g.lineWidth.bigGrid)}if(t.forcedBoard!==null&&!t.isFreeMove&&n.showForcedBoard){const h=Math.max(.1,Math.min(1,n.forcedBoardIntensity??.6));this.drawBoardBorder(t.forcedBoard,this.withAlpha(g.colors.forcedBoardBorder,h),Math.max(1,g.lineWidth.forcedBoardBorder*h))}if(this.illegalFlashMove){const h=E(this.illegalFlashMove.board,this.illegalFlashMove.cell,this.boardRect);this.drawCellOverlay(h,g.colors.illegalClickFlash),this.drawCellHighlight(h,g.colors.illegalClickFlash,g.lineWidth.bigGrid)}e.winner!==null&&this.drawWinnerBoardsGlow(e)}flashIllegalMove(e){this.illegalFlashMove=e}clearIllegalFlash(){this.illegalFlashMove=null}flashWonBoard(e,t){this.wonBoardFlash.set(e,{winner:t,untilMs:Date.now()+420})}drawBigGrid(e,t,n){const s=n/3;this.ctx.strokeStyle=g.colors.bigGridLine,this.ctx.lineWidth=g.lineWidth.bigGrid;for(let o=1;o<3;o+=1)this.ctx.beginPath(),this.ctx.moveTo(e+s*o,t),this.ctx.lineTo(e+s*o,t+n),this.ctx.stroke(),this.ctx.beginPath(),this.ctx.moveTo(e,t+s*o),this.ctx.lineTo(e+n,t+s*o),this.ctx.stroke()}drawSmallGrid(e){const t=e.w/3,n=e.h/3;this.ctx.strokeStyle=g.colors.smallGridLine,this.ctx.lineWidth=g.lineWidth.smallGrid;for(let s=1;s<3;s+=1)this.ctx.beginPath(),this.ctx.moveTo(e.x+s*t,e.y),this.ctx.lineTo(e.x+s*t,e.y+e.h),this.ctx.stroke(),this.ctx.beginPath(),this.ctx.moveTo(e.x,e.y+s*n),this.ctx.lineTo(e.x+e.w,e.y+s*n),this.ctx.stroke()}drawMark(e,t){const n=Math.min(t.w,t.h),s=g.markPadding*n;if(this.ctx.lineWidth=g.lineWidth.mark,e==="X"){this.ctx.strokeStyle=g.colors.markX,this.ctx.beginPath(),this.ctx.moveTo(t.x+s,t.y+s),this.ctx.lineTo(t.x+t.w-s,t.y+t.h-s),this.ctx.moveTo(t.x+t.w-s,t.y+s),this.ctx.lineTo(t.x+s,t.y+t.h-s),this.ctx.stroke();return}this.ctx.strokeStyle=g.colors.markO,this.ctx.beginPath(),this.ctx.arc(t.x+t.w/2,t.y+t.h/2,n/2*(1-g.markPadding),0,Math.PI*2),this.ctx.stroke()}drawWonBoardSymbol(e,t){this.ctx.fillStyle=g.colors.wonBoardSymbol[e],this.ctx.font=`${t.size/3*g.fontSize.wonBoardSymbol}px sans-serif`,this.ctx.textAlign="center",this.ctx.textBaseline="middle",this.ctx.fillText(e,t.x+t.size/2,t.y+t.size/2)}drawCellHighlight(e,t,n){this.ctx.save(),this.ctx.strokeStyle=t,this.ctx.lineWidth=n,this.ctx.strokeRect(e.x+1,e.y+1,e.w-2,e.h-2),this.ctx.restore()}drawCellOverlay(e,t){this.ctx.save(),this.ctx.fillStyle=t,this.ctx.fillRect(e.x+1,e.y+1,e.w-2,e.h-2),this.ctx.restore()}drawBoardBorder(e,t,n){const s=K(e,this.boardRect);this.ctx.save(),this.ctx.strokeStyle=t,this.ctx.lineWidth=n,this.ctx.strokeRect(s.x+n/2,s.y+n/2,s.w-n,s.h-n),this.ctx.restore()}drawWinnerBoardsGlow(e){const t=e.winner;if(t)for(let n=0;n<9;n+=1){if(x(e.bigBoard[n]).winner!==t)continue;const o=this.withAlpha(t==="X"?g.colors.markX:g.colors.markO,.6);this.drawBoardBorder(n,o,4)}}withAlpha(e,t){if(e.startsWith("#")){const n=e.slice(1),s=n.length===3?n.split("").map(d=>d+d).join(""):n,o=Number.parseInt(s.slice(0,2),16),a=Number.parseInt(s.slice(2,4),16),l=Number.parseInt(s.slice(4,6),16);return`rgba(${o},${a},${l},${t.toFixed(3)})`}return e.startsWith("rgb(")?e.replace("rgb(","rgba(").replace(")",`,${t.toFixed(3)})`):e}}function wt({renderer:i,getPayload:e}){let t=!1;function n(){t||(t=!0,requestAnimationFrame(()=>{t=!1,i.render(e())}))}return{scheduleRender:n}}function Q(i){const e=i.nextBoardIndex;return e===null?null:x(i.bigBoard[e]).status==="Open"?e:null}function tt(i){return P(i),i.nextBoardIndex===null?!0:x(i.bigBoard[i.nextBoardIndex]).status!=="Open"}function O(i){return i.winner!==null}function R(i){return i.winner===null&&i.bigBoard.every(e=>x(e).status!=="Open")}class xt{constructor(e,t,n){r(this,"canvas");r(this,"boardRect");r(this,"controller");r(this,"attached",!1);r(this,"handlePointerDown",e=>{const t=this.mapPointerEvent(e);t&&this.controller.applyPlayerMove({board:t.boardIndex,cell:t.cellIndex})});r(this,"handlePointerMove",e=>{const t=this.mapPointerEvent(e);if(!t){this.controller.setHoverMove(null);return}this.controller.setHoverMove({board:t.boardIndex,cell:t.cellIndex})});r(this,"handlePointerLeave",()=>{this.controller.setHoverMove(null)});this.canvas=e,this.boardRect=t,this.controller=n}init(){this.attached||(this.attached=!0,this.canvas.addEventListener("pointerdown",this.handlePointerDown),this.canvas.addEventListener("pointermove",this.handlePointerMove),this.canvas.addEventListener("pointerleave",this.handlePointerLeave))}destroy(){this.attached&&(this.attached=!1,this.canvas.removeEventListener("pointerdown",this.handlePointerDown),this.canvas.removeEventListener("pointermove",this.handlePointerMove),this.canvas.removeEventListener("pointerleave",this.handlePointerLeave))}mapPointerEvent(e){const t=this.canvas.getBoundingClientRect();if(t.width===0||t.height===0)return null;const n=(e.clientX-t.left)*(this.canvas.width/t.width),s=(e.clientY-t.top)*(this.canvas.height/t.height),o=n/(this.canvas.width/t.width),a=s/(this.canvas.height/t.height);return bt(o,a,this.boardRect)}}function Mt(i,e,t={}){var n,s,o;for(const a of i)switch(a.type){case"CellMarked":break;case"SmallBoardWon":(n=t.onSmallBoardWon)==null||n.call(t,a.board,a.winner),console.log(`Board ${a.board} won by ${a.winner}`);break;case"BigBoardWon":(s=t.onBigBoardWon)==null||s.call(t,a.winner,e),console.log(`Game won by ${a.winner}`);break;case"Draw":(o=t.onDraw)==null||o.call(t,e),console.log("Game draw");break;case"FreeMoveActivated":console.log("Free move active");break}}function St(i,e,t,n){const s=P(i);if(i.winner!==null||s.length===0)return{forcedBoard:null,isFreeMove:!1,legalMoves:[],hoverMove:null,lastMove:null,lastMoveAgeMs:null};const o=e&&G(i,e)?e:null;return{forcedBoard:Q(i),isFreeMove:tt(i),legalMoves:s,hoverMove:o,lastMove:t,lastMoveAgeMs:t&&typeof n=="number"?Math.max(0,Date.now()-n):null}}const et="uttt-ui-settings",S={showLegalMoves:!0,showForcedBoard:!0,gameMode:"hvh"};function st(){return typeof globalThis<"u"&&typeof globalThis.localStorage<"u"}function Tt(){if(!st())return{...S};try{const i=globalThis.localStorage.getItem(et);if(!i)return{...S};const e=JSON.parse(i);return{showLegalMoves:typeof(e==null?void 0:e.showLegalMoves)=="boolean"?e.showLegalMoves:S.showLegalMoves,showForcedBoard:typeof(e==null?void 0:e.showForcedBoard)=="boolean"?e.showForcedBoard:S.showForcedBoard,gameMode:(e==null?void 0:e.gameMode)==="hva"?"hva":S.gameMode}}catch{return{...S}}}function Et(i){if(st())try{globalThis.localStorage.setItem(et,JSON.stringify(i))}catch{}}const y=class y{constructor(e){r(this,"history");this.history={past:[],present:this.createSnapshot(e),future:[]}}push(e){this.history.past.push(this.history.present),this.history.present=this.createSnapshot(e),this.history.future=[],this.trimPastToMax(),this.persist()}canUndo(){return this.history.past.length>0}canRedo(){return this.history.future.length>0}undo(){return this.canUndo()?(this.history.future.unshift(this.history.present),this.history.present=this.history.past.pop(),this.persist(),this.history.present.state):null}redo(){return this.canRedo()?(this.history.past.push(this.history.present),this.history.present=this.history.future.shift(),this.trimPastToMax(),this.persist(),this.history.present.state):null}getPresent(){return this.history.present.state}getAll(){return[...this.history.past,this.history.present,...this.history.future]}reset(e){this.history={past:[],present:this.createSnapshot(e),future:[]},this.persist()}getState(){return this.history}createSnapshot(e){return{version:1,timestamp:Date.now(),state:e}}trimPastToMax(){this.history.past.length>200&&this.history.past.splice(0,this.history.past.length-200)}persist(){try{if(typeof localStorage>"u")return;localStorage.setItem(y.STORAGE_KEY,JSON.stringify(this.history))}catch{}}static load(){try{if(typeof localStorage>"u")return null;const e=localStorage.getItem(y.STORAGE_KEY);if(!e)return null;const t=JSON.parse(e);if(!y.isValidHistoryState(t))return localStorage.removeItem(y.STORAGE_KEY),null;const n=new y(t.present.state);return n.history=t,n}catch{try{typeof localStorage<"u"&&localStorage.removeItem(y.STORAGE_KEY)}catch{}return null}}static isValidHistoryState(e){if(!e||typeof e!="object")return!1;const t=e;return!Array.isArray(t.past)||!Array.isArray(t.future)||!y.isValidSnapshot(t.present)?!1:t.past.every(y.isValidSnapshot)&&t.future.every(y.isValidSnapshot)}static isValidSnapshot(e){if(!e||typeof e!="object")return!1;const t=e;return!(t.version!==1||typeof t.timestamp!="number"||!Number.isFinite(t.timestamp)||!t.state||typeof t.state!="object")}};r(y,"STORAGE_KEY","uttt-history");let A=y;function j(i,e,t){!i||!e||(i.disabled=!t.canUndo(),e.disabled=!t.canRedo(),i.setAttribute("aria-disabled",String(i.disabled)),e.setAttribute("aria-disabled",String(e.disabled)))}class Bt{constructor(e){r(this,"state");r(this,"historyManager");r(this,"renderer");r(this,"scheduler");r(this,"inputController");r(this,"boardRect");r(this,"lastMove",null);r(this,"lastMoveSetAtMs",null);r(this,"hoverMove",null);r(this,"uiSettings");r(this,"hud",null);r(this,"endgameOverlay",null);r(this,"undoBtn",null);r(this,"redoBtn",null);r(this,"playerWins",{X:0,O:0});r(this,"analysisEnabled",!1);r(this,"timerConfig",{enabled:!1,secondsPerTurn:15});r(this,"aiDifficulty","medium");r(this,"visualOptions",{showLastMoveHighlight:!0,forcedBoardIntensity:.6});if(!e)throw new Error('GameController: expected a canvas element with id "game-canvas", but none was found.');(e.width===0||e.height===0)&&console.warn("GameController: canvas is 0x0 at initialization; rendering will occur once it has a size.");const t=A.load();t?(this.state=t.getPresent(),this.historyManager=t):(this.state=N(),this.historyManager=new A(this.state)),this.uiSettings=Tt(),this.boardRect=this.computeBoardRect(e),this.renderer=new yt({canvas:e,boardRect:this.boardRect}),this.scheduler=wt({renderer:{render:n=>{this.renderer.render(n.state,n.highlightState,n.uiSettings)}},getPayload:()=>{const n=St(this.state,this.hoverMove,this.lastMove,this.lastMoveSetAtMs);return{state:this.state,highlightState:n,uiSettings:this.uiSettings}}}),this.inputController=new xt(e,this.boardRect,this),this.inputController.init(),this.scheduler.scheduleRender(),this.emitHistoryChanged()}getState(){return this.state}setState(e){var t,n;this.state=e,!O(e)&&!R(e)&&((t=this.endgameOverlay)==null||t.hide()),(n=this.hud)==null||n.update(e),j(this.undoBtn,this.redoBtn,this.historyManager),this.scheduler.scheduleRender()}attachHUD(e){this.hud=e,this.hud.update(this.state)}attachEndgameOverlay(e){this.endgameOverlay=e}attachHistoryButtons(e,t){this.undoBtn=e,this.redoBtn=t,j(this.undoBtn,this.redoBtn,this.historyManager)}getLastMove(){return this.lastMove}setHoverMove(e){var s,o;const t=e&&G(this.state,e)?e:null;((s=this.hoverMove)==null?void 0:s.board)===(t==null?void 0:t.board)&&((o=this.hoverMove)==null?void 0:o.cell)===(t==null?void 0:t.cell)||(this.hoverMove=t,this.scheduler.scheduleRender())}getHoverMove(){return this.hoverMove}getUISettings(){return this.uiSettings}getMoveCount(){return this.historyManager.getState().past.length}getPlayerWins(){return{...this.playerWins}}setUISettings(e){var t;this.uiSettings={...this.uiSettings,...e},Et(this.uiSettings),(t=this.hud)==null||t.update(this.state),this.scheduler.scheduleRender()}setTimerConfig(e){this.timerConfig={enabled:!!e.enabled,secondsPerTurn:Math.max(5,Math.min(300,Math.round(e.secondsPerTurn)))},this.scheduler.scheduleRender()}setAnalysisEnabled(e){this.analysisEnabled=!!e,this.scheduler.scheduleRender()}setAIDifficulty(e){this.aiDifficulty=e}setVisualOptions(e){this.visualOptions={showLastMoveHighlight:e.showLastMoveHighlight,forcedBoardIntensity:Math.max(.1,Math.min(1,e.forcedBoardIntensity))},this.setUISettings({showLastMoveHighlight:this.visualOptions.showLastMoveHighlight,forcedBoardIntensity:this.visualOptions.forcedBoardIntensity})}applyPlayerMove(e){if(O(this.state)||P(this.state).length===0){this.emitUIEvent("uttt:move-rejected",{reason:"terminal"});return}if(!G(this.state,e)){this.onIllegalMove(e);return}try{const{nextState:t,events:n}=vt(this.state,e),s=n.find(o=>o.type==="CellMarked");s&&s.type==="CellMarked"&&(this.lastMove={board:s.board,cell:s.cell},this.lastMoveSetAtMs=Date.now(),this.scheduleLastMoveFadeRenders()),this.setState(t),this.historyManager.push(t),this.emitHistoryChanged(),Mt(n,t,{onSmallBoardWon:(o,a)=>{this.renderer.flashWonBoard(o,a),this.scheduler.scheduleRender(),this.scheduleWinnerBoardFlashRenders()},onBigBoardWon:(o,a)=>{var l,d;this.playerWins[o]+=1,(l=this.hud)==null||l.update(a),(d=this.endgameOverlay)==null||d.show(a),this.emitUIEvent("uttt:game-over",{result:"win",winner:o})},onDraw:o=>{var a,l;(a=this.hud)==null||a.update(o),(l=this.endgameOverlay)==null||l.show(o),this.emitUIEvent("uttt:game-over",{result:"draw",winner:null})}})}catch{this.onIllegalMove(e)}}undo(){const e=this.historyManager.undo();e&&(this.setState(e),this.lastMove=null,this.lastMoveSetAtMs=null,this.hoverMove=null,this.emitHistoryChanged())}redo(){const e=this.historyManager.redo();e&&(this.setState(e),this.lastMove=null,this.lastMoveSetAtMs=null,this.hoverMove=null,this.emitHistoryChanged())}resetGame(){var t;const e=N();this.historyManager.reset(e),this.setState(e),this.lastMove=null,this.lastMoveSetAtMs=null,this.hoverMove=null,(t=this.endgameOverlay)==null||t.hide(),this.emitHistoryChanged()}getHistoryManager(){return this.historyManager}canUndo(){return this.historyManager.canUndo()}canRedo(){return this.historyManager.canRedo()}destroy(){this.inputController.destroy()}onIllegalMove(e){this.emitUIEvent("uttt:move-rejected",{reason:"illegal",move:e}),this.renderer.flashIllegalMove(e),this.scheduler.scheduleRender(),globalThis.setTimeout(()=>{this.renderer.clearIllegalFlash(),this.scheduler.scheduleRender()},300)}emitHistoryChanged(){if(!(typeof window>"u"))try{window.dispatchEvent(new Event("history:changed"))}catch{}}emitUIEvent(e,t){if(!(typeof window>"u"))try{window.dispatchEvent(new CustomEvent(e,{detail:t}))}catch{}}scheduleLastMoveFadeRenders(){const e=[120,240,360,520,760];for(const t of e)globalThis.setTimeout(()=>{this.scheduler.scheduleRender()},t)}scheduleWinnerBoardFlashRenders(){const e=[90,180,270,360];for(const t of e)globalThis.setTimeout(()=>{this.scheduler.scheduleRender()},t)}computeBoardRect(e){const n=e.width,s=e.height,o=Math.max(0,Math.min(n,s)-16*2);return{x:(n-o)/2,y:(s-o)/2,size:o}}}class It{constructor(e,t){this.overlayEl=e,this.messageEl=t}show(e){if(this.messageEl.classList.remove("winner-x","winner-o"),e.winner==="X")this.messageEl.textContent="🎉 X Wins!",this.messageEl.classList.add("winner-x");else if(e.winner==="O")this.messageEl.textContent="🎉 O Wins!",this.messageEl.classList.add("winner-o");else if(R(e))this.messageEl.textContent="It's a Draw!";else return;this.overlayEl.hidden=!1,this.overlayEl.classList.remove("overlay-enter"),this.overlayEl.offsetWidth,this.overlayEl.classList.add("overlay-enter")}hide(){this.overlayEl.hidden=!0,this.overlayEl.classList.remove("overlay-enter"),this.messageEl.classList.remove("winner-x","winner-o")}}const Lt=':host,:root{--color-bg:#0b1220;--color-surface:#111a2d;--color-surface-muted:#17233b;--color-border:#32415f;--color-text:#e2e8f0;--color-text-muted:#9fb0cb;--color-accent:#60a5fa;--color-accent-strong:#3b82f6;--color-danger:#f87171;--color-overlay:rgba(2,6,23,.72);--color-input-bg:#0f172a;--space-1:.25rem;--space-2:.5rem;--space-3:.75rem;--space-4:1rem;--space-5:1.25rem;--space-6:1.5rem;--radius-1:.5rem;--radius-2:.75rem;--radius-3:1rem;--font-family-base:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--font-size-sm:.8125rem;--font-size-md:.9375rem;--font-size-lg:1.125rem;--font-size-xl:1.375rem;--control-height:2.25rem;--dialog-width:32rem}',Ct=':host,:root{--color-bg:#0b1220;--color-surface:#111a2d;--color-surface-muted:#17233b;--color-border:#32415f;--color-text:#e2e8f0;--color-text-muted:#9fb0cb;--color-accent:#60a5fa;--color-accent-strong:#3b82f6;--color-danger:#f87171;--color-overlay:rgba(2,6,23,.72);--color-input-bg:#0f172a;--space-1:.25rem;--space-2:.5rem;--space-3:.75rem;--space-4:1rem;--space-5:1.25rem;--space-6:1.5rem;--radius-1:.5rem;--radius-2:.75rem;--radius-3:1rem;--font-family-base:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--font-size-sm:.8125rem;--font-size-md:.9375rem;--font-size-lg:1.125rem;--font-size-xl:1.375rem;--control-height:2.25rem;--dialog-width:32rem}:host{color:var(--color-text);display:block;font-family:var(--font-family-base);min-height:100vh;width:100%}.shell{display:grid;gap:var(--space-4);grid-template-columns:minmax(0,1fr) 320px;grid-template-rows:auto minmax(0,1fr) auto;margin:0 auto;max-width:1280px;min-height:100vh;padding:var(--space-4)}.shell__header{grid-column:1/-1}.shell__main{display:grid;place-items:center}.shell__aside{display:flex;flex-direction:column;gap:var(--space-4)}.shell__footer{grid-column:1/-1}.canvas-stage{display:grid;margin:0 auto;max-width:880px;place-items:center;width:100%}@media (max-width:1023px){.shell{width:1024px}}',kt=':host,:root{--color-bg:#0b1220;--color-surface:#111a2d;--color-surface-muted:#17233b;--color-border:#32415f;--color-text:#e2e8f0;--color-text-muted:#9fb0cb;--color-accent:#60a5fa;--color-accent-strong:#3b82f6;--color-danger:#f87171;--color-overlay:rgba(2,6,23,.72);--color-input-bg:#0f172a;--space-1:.25rem;--space-2:.5rem;--space-3:.75rem;--space-4:1rem;--space-5:1.25rem;--space-6:1.5rem;--radius-1:.5rem;--radius-2:.75rem;--radius-3:1rem;--font-family-base:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--font-size-sm:.8125rem;--font-size-md:.9375rem;--font-size-lg:1.125rem;--font-size-xl:1.375rem;--control-height:2.25rem;--dialog-width:32rem}.panel{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-2);padding:var(--space-4)}.panel h1,.panel h2,.panel p{margin:0}.app-title{font-size:var(--font-size-xl)}.status-row{display:block;margin-top:var(--space-3)}.hud-chip{background:var(--color-surface-muted);border:1px solid var(--color-border);border-radius:var(--radius-1);font-size:var(--font-size-sm);padding:var(--space-2) var(--space-3)}#endgame-message.winner-x,#player-indicator.player-x{color:var(--color-danger)}#endgame-message.winner-o,#player-indicator.player-o{color:var(--color-accent)}.controls{display:flex;flex-wrap:wrap;gap:var(--space-2)}uttt-controls,uttt-help,uttt-hud,uttt-toast{display:block;width:100%}#controls-host{display:grid;gap:var(--space-3)}#settings-host>h2{margin-bottom:var(--space-2)}#open-help-btn,#open-settings-btn{width:100%}.button{background:var(--color-surface-muted);border:1px solid var(--color-border);border-radius:var(--radius-1);color:var(--color-text);cursor:pointer;padding:var(--space-2) var(--space-3)}.button:hover{background:var(--color-accent-strong)}.button:disabled{cursor:not-allowed;filter:grayscale(.12);opacity:.55}.button:disabled:hover{background:var(--color-surface-muted)}.canvas-host{position:relative;width:min(900px,100%)}.canvas{background:#020617;border:1px solid var(--color-border);border-radius:var(--radius-3);display:block;height:min(860px,96vw);width:min(860px,96vw)}.footer-help{color:var(--color-text-muted);font-size:var(--font-size-sm)}#endgame-overlay{align-items:center;background:color-mix(in srgb,var(--color-bg) 72%,transparent);display:flex;top:0;right:0;bottom:0;left:0;justify-content:center;position:absolute}#settings-panel{display:grid;gap:var(--space-3);margin-top:var(--space-4)}#settings-panel label{display:grid;font-size:var(--font-size-sm);gap:var(--space-2)}uttt-settings{display:contents}.ai-indicator{background:var(--color-surface-muted);border:1px dashed var(--color-border);border-radius:var(--radius-1);color:var(--color-text-muted);font-size:var(--font-size-sm);padding:var(--space-2) var(--space-3)}.settings-dialog{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-2);color:var(--color-text);padding:0;width:min(var(--dialog-width),calc(100vw - 2rem))}.settings-dialog::backdrop{-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);background:var(--color-overlay)}.settings-form{display:grid;gap:var(--space-4);padding:var(--space-4)}.settings-form .settings-footer,.settings-form .settings-header{align-items:center;display:flex;gap:var(--space-3);justify-content:space-between}.settings-form .field{display:grid;font-size:var(--font-size-sm);gap:var(--space-2)}:is(.settings-form .field) input[type=number],:is(.settings-form .field) input[type=range],:is(.settings-form .field) select{background:var(--color-input-bg);border:1px solid var(--color-border);border-radius:var(--radius-1);color:var(--color-text);height:var(--control-height);padding:0 var(--space-3)}:is(.settings-form .field) small{color:var(--color-text-muted)}.settings-form .field--checkbox{align-items:center;display:flex;gap:var(--space-2)}.toast-stack{bottom:var(--space-4);display:grid;gap:var(--space-2);position:fixed;right:var(--space-4);width:min(24rem,calc(100vw - 2rem));z-index:30}.toast{animation:toast-in .16s ease-out;background:var(--color-surface);border:1px solid var(--color-border);border-left-width:4px;border-radius:var(--radius-1);box-shadow:0 8px 24px color-mix(in srgb,var(--color-bg) 62%,transparent);color:var(--color-text);font-size:var(--font-size-sm);padding:var(--space-2) var(--space-3)}.toast.toast--success{border-left-color:var(--color-accent)}.toast.toast--error,.toast.toast--warning{border-left-color:var(--color-danger)}.help-dialog{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-2);color:var(--color-text);padding:0;width:min(var(--dialog-width),calc(100vw - 2rem))}.help-dialog::backdrop{background:var(--color-overlay)}.help-content{display:grid;gap:var(--space-4);padding:var(--space-4)}.help-header{align-items:center;display:flex;gap:var(--space-3);justify-content:space-between}.help-header h3{margin:0}.help-section{display:grid;gap:var(--space-2)}.help-section h4{font-size:var(--font-size-md);margin:0}.help-section ul{display:grid;font-size:var(--font-size-sm);gap:var(--space-1);margin:0;padding-left:1.25rem}@keyframes toast-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@media (prefers-reduced-motion:reduce){.toast{animation:none}}';function Ot(i){const e=i;if(!e)return!1;const t=e.tagName.toLowerCase();return t==="input"||t==="textarea"||t==="select"||e.isContentEditable}function At(i){const{controller:e,hud:t,controls:n,onToggleAnalysis:s}=i,o=i.eventTarget,a=()=>{const c=e.getState();t.setState(c),n.setState(c),n.setHistoryAvailability(e.canUndo(),e.canRedo())},l=()=>{a()},d=()=>{e.resetGame(),a()},f=()=>{e.resetGame(),a()},p=()=>{e.undo(),a()},m=()=>{e.redo(),a()},b=c=>{var u;const v=c;s==null||s(!!((u=v.detail)!=null&&u.enabled))},h=c=>{if(Ot(c.target))return;const v=c.key.toLowerCase(),u=c.metaKey||c.ctrlKey;if(u&&v==="z"&&c.shiftKey){c.preventDefault(),e.redo(),a();return}if(u&&v==="z"&&!c.shiftKey){c.preventDefault(),e.undo(),a();return}!u&&!c.shiftKey&&v==="n"&&(c.preventDefault(),e.resetGame(),a())};return window.addEventListener("history:changed",l),window.addEventListener("keydown",h),o.addEventListener("uttt:new-game",d),o.addEventListener("uttt:reset",f),o.addEventListener("uttt:undo",p),o.addEventListener("uttt:redo",m),o.addEventListener("uttt:toggle-analysis",b),a(),()=>{window.removeEventListener("history:changed",l),window.removeEventListener("keydown",h),o.removeEventListener("uttt:new-game",d),o.removeEventListener("uttt:reset",f),o.removeEventListener("uttt:undo",p),o.removeEventListener("uttt:redo",m),o.removeEventListener("uttt:toggle-analysis",b)}}const w={analysisModeDefault:!1,timerPerTurnEnabled:!1,secondsPerTurn:15,aiDifficulty:"medium",showLastMove:!0,highlightIntensity:.6},nt="uttt:settings:v1";function Y(i,e,t){return Math.max(e,Math.min(t,i))}function Pt(i){return i==="easy"||i==="medium"||i==="hard"||i==="insane"}function it(){return typeof globalThis<"u"&&typeof globalThis.localStorage<"u"}function ot(i){return{analysisModeDefault:typeof i.analysisModeDefault=="boolean"?i.analysisModeDefault:w.analysisModeDefault,timerPerTurnEnabled:typeof i.timerPerTurnEnabled=="boolean"?i.timerPerTurnEnabled:w.timerPerTurnEnabled,secondsPerTurn:typeof i.secondsPerTurn=="number"?Math.round(Y(i.secondsPerTurn,5,300)):w.secondsPerTurn,aiDifficulty:Pt(i.aiDifficulty)?i.aiDifficulty:w.aiDifficulty,showLastMove:typeof i.showLastMove=="boolean"?i.showLastMove:w.showLastMove,highlightIntensity:typeof i.highlightIntensity=="number"?Y(i.highlightIntensity,.1,1):w.highlightIntensity}}function Rt(){if(!it())return{...w};try{const i=globalThis.localStorage.getItem(nt);if(!i)return{...w};const e=JSON.parse(i);return ot(e)}catch{return{...w}}}function at(i){if(it())try{const e=ot(i);globalThis.localStorage.setItem(nt,JSON.stringify(e))}catch{}}function Ht(){const i={...w};return at(i),i}const Dt=`${Lt}
${Ct}
${kt}`;class zt extends HTMLElement{constructor(){super(...arguments);r(this,"cleanupBindings",null);r(this,"controller",null);r(this,"settings",Rt());r(this,"lastAnnouncedStatus","");r(this,"settingsSavedToastTimer",null);r(this,"boundOpenHelp",()=>{const t=this.getMountPoints().help;t==null||t.open()});r(this,"boundOpenSettings",()=>{const t=this.getMountPoints().settings;t==null||t.open()});r(this,"boundHistoryChanged",()=>{this.updateLiveStatus()});r(this,"boundMoveRejected",t=>{var a;const o=((a=t.detail)==null?void 0:a.reason)==="terminal"?"Game already finished. Start a new game to continue.":"Illegal move. Choose a highlighted legal cell.";this.notify(o,"warning")});r(this,"boundGameOver",t=>{var l,d;const n=t,s=(l=n.detail)==null?void 0:l.result,o=(d=n.detail)==null?void 0:d.winner,a=s==="draw"?"Game over: Draw.":`Game over: ${o??"Unknown"} wins.`;this.notify(a,"success",4200),this.updateLiveStatus(a)});r(this,"onSettingsChanged",t=>{const s=t.detail;this.applySettings(s),this.settingsSavedToastTimer!==null&&globalThis.clearTimeout(this.settingsSavedToastTimer),this.settingsSavedToastTimer=globalThis.setTimeout(()=>{this.notify("Settings saved.","success"),this.settingsSavedToastTimer=null},220)});r(this,"onSettingsReset",()=>{const t=Ht();this.applySettings(t)})}connectedCallback(){this.shadowRoot||this.attachShadow({mode:"open"}),!(!this.shadowRoot||this.shadowRoot.childElementCount>0)&&(this.shadowRoot.innerHTML=`
      <style>${Dt}</style>
      <div class="shell">
        <header class="shell__header panel" aria-label="Application header">
          <h1 class="app-title">Super Ultimate Tic-Tac-Toe</h1>
          <p>DOM UI wired to existing controller APIs</p>
          <div class="status-row" data-testid="hud-host" aria-label="HUD host">
            <uttt-hud id="hud"></uttt-hud>
          </div>
        </header>

        <main class="shell__main" aria-label="Board area">
          <section class="panel canvas-stage">
            <div class="canvas-host" data-testid="canvas-host">
              <canvas
                id="game-canvas"
                class="canvas"
                width="720"
                height="800"
                tabindex="0"
                role="application"
                aria-label="Super Tic-Tac-Toe board"
              ></canvas>
              <div id="endgame-overlay" hidden aria-live="polite" aria-label="Game result overlay">
                <div id="endgame-message">Game Over</div>
                <button id="play-again-btn" class="button" type="button" aria-label="Play game again">Play Again</button>
              </div>
            </div>
          </section>
        </main>

        <aside class="shell__aside" aria-label="Controls panel">
          <section class="panel" id="controls-host" data-testid="controls-host">
            <uttt-controls id="controls"></uttt-controls>
          </section>

          <section class="panel" id="settings-host" data-testid="settings-host" aria-label="Settings host">
            <h2>Settings</h2>
            <button
              id="open-settings-btn"
              class="button"
              type="button"
              aria-label="Open settings"
              title="Open settings"
            >Open Settings</button>

            <button
              id="open-help-btn"
              class="button"
              type="button"
              aria-label="Open help"
              title="Open help and shortcuts"
            >Help</button>

            <div class="ai-indicator" id="ai-indicator" role="status" aria-live="polite">
              AI: idle (thinking indicator placeholder)
            </div>

            <uttt-settings id="settings"></uttt-settings>
            <uttt-help id="help"></uttt-help>
          </section>
        </aside>

        <footer class="shell__footer panel">
          <p class="footer-help">Keyboard shortcuts: ⌘/Ctrl+Z undo, ⇧+⌘/Ctrl+Z redo, N new game.</p>
        </footer>

        <div id="status-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>
        <uttt-toast id="toast"></uttt-toast>
      </div>
    `)}disconnectedCallback(){var n,s,o;if((n=this.cleanupBindings)==null||n.call(this),this.cleanupBindings=null,this.settingsSavedToastTimer!==null&&(globalThis.clearTimeout(this.settingsSavedToastTimer),this.settingsSavedToastTimer=null),this.removeEventListener("uttt:settings-changed",this.onSettingsChanged),this.removeEventListener("uttt:settings-reset",this.onSettingsReset),window.removeEventListener("history:changed",this.boundHistoryChanged),window.removeEventListener("uttt:move-rejected",this.boundMoveRejected),window.removeEventListener("uttt:game-over",this.boundGameOver),!this.shadowRoot)return;const t=this.getMountPoints();(s=t.openSettingsBtn)==null||s.removeEventListener("click",this.boundOpenSettings),(o=t.openHelpBtn)==null||o.removeEventListener("click",this.boundOpenHelp)}bindController(t){var p;this.controller=t;const n=this.getMountPoints(),s=n.hud,o=n.controls,a=n.settings,l=n.help,d=n.openSettingsBtn,f=n.openHelpBtn;if(!s||!o||!a||!l)throw new Error("UTTTAppElement: expected uttt-hud, uttt-controls, uttt-settings, and uttt-help elements.");(p=this.cleanupBindings)==null||p.call(this),this.cleanupBindings=At({controller:t,hud:s,controls:o,eventTarget:this,onToggleAnalysis:m=>{this.applySettings({...this.settings,analysisModeDefault:m})}}),o.setAnalysisAvailable(!0),a.setAIAvailable(!0),a.setSettings(this.settings),l.close(),d==null||d.removeEventListener("click",this.boundOpenSettings),f==null||f.removeEventListener("click",this.boundOpenHelp),d==null||d.addEventListener("click",this.boundOpenSettings),f==null||f.addEventListener("click",this.boundOpenHelp),this.addEventListener("uttt:settings-changed",this.onSettingsChanged),this.addEventListener("uttt:settings-reset",this.onSettingsReset),window.addEventListener("history:changed",this.boundHistoryChanged),window.addEventListener("uttt:move-rejected",this.boundMoveRejected),window.addEventListener("uttt:game-over",this.boundGameOver),this.applySettings(this.settings),this.updateLiveStatus()}applySettings(t){var o,a,l,d,f,p,m,b;this.settings={...t},at(this.settings);const n=this.getMountPoints().settings,s=this.getMountPoints().controls;if(n==null||n.setSettings(this.settings),s==null||s.setAnalysisEnabled(this.settings.analysisModeDefault),!!this.controller){try{(a=(o=this.controller).setTimerConfig)==null||a.call(o,{enabled:this.settings.timerPerTurnEnabled,secondsPerTurn:this.settings.secondsPerTurn})}catch{this.notify("Timer settings are unavailable in this build.","info")}try{(d=(l=this.controller).setAnalysisEnabled)==null||d.call(l,this.settings.analysisModeDefault)}catch{this.notify("Analysis toggle is unavailable in this build.","info")}try{(p=(f=this.controller).setAIDifficulty)==null||p.call(f,this.settings.aiDifficulty)}catch{this.notify("AI difficulty is unavailable in this build.","info")}try{(b=(m=this.controller).setVisualOptions)==null||b.call(m,{showLastMoveHighlight:this.settings.showLastMove,forcedBoardIntensity:this.settings.highlightIntensity})}catch{this.notify("Visual options are unavailable in this build.","info")}}}notify(t,n="info",s){const o=this.getMountPoints().toast;o==null||o.notify(t,n,s)}updateLiveStatus(t){const n=this.getMountPoints().statusAnnouncer;if(!n)return;const s=t??this.computeStatusText();!s||s===this.lastAnnouncedStatus||(this.lastAnnouncedStatus=s,n.textContent=s)}computeStatusText(){if(!this.controller)return"Game ready.";const t=this.controller.getState();return O(t)?`Game over. ${t.winner} wins.`:R(t)?"Game over. Draw.":`${t.currentPlayer} to play.`}getMountPoints(){const t=this.shadowRoot;if(!t)throw new Error("UTTTAppElement: shadow root is not initialized.");return{canvas:t.getElementById("game-canvas"),hud:t.getElementById("hud"),controls:t.getElementById("controls"),settings:t.getElementById("settings"),help:t.getElementById("help"),toast:t.getElementById("toast"),openSettingsBtn:t.getElementById("open-settings-btn"),openHelpBtn:t.getElementById("open-help-btn"),statusAnnouncer:t.getElementById("status-announcer"),aiIndicator:t.getElementById("ai-indicator"),endgameOverlay:t.getElementById("endgame-overlay"),endgameMessage:t.getElementById("endgame-message"),playAgainBtn:t.getElementById("play-again-btn")}}}function Ft(){customElements.get("uttt-app")||customElements.define("uttt-app",zt)}const Gt=`
  :host {
    display: block;
    color: var(--color-text, #e2e8f0);
    font-family: var(--font-family-base, Inter, sans-serif);
  }

  .hud {
    display: grid;
    gap: 0.5rem;
  }

  .hud__title {
    margin: 0;
    font-size: var(--font-size-lg, 1.125rem);
    font-weight: 600;
  }

  .hud__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    border: 1px solid var(--color-border, #32415f);
    border-radius: var(--radius-1, 0.5rem);
    background: var(--color-surface-muted, #17233b);
    padding: 0.375rem 0.625rem;
    font-size: var(--font-size-sm, 0.8125rem);
  }

  .chip--x {
    color: var(--color-danger, #f87171);
  }

  .chip--o {
    color: var(--color-accent, #60a5fa);
  }
`;function Ut(i){return{row:Math.floor(i/3),col:i%3}}class $t extends HTMLElement{constructor(){super(...arguments);r(this,"state",null)}connectedCallback(){this.shadowRoot||this.attachShadow({mode:"open"}),this.render()}setState(t){this.state=t,this.render()}render(){if(!this.shadowRoot)return;const t=this.state;let n="Ongoing",s="Current player: X",o="Free move";if(t)if(O(t)?n=`Winner: ${t.winner}`:R(t)&&(n="Draw"),s=`Current player: ${t.currentPlayer}`,tt(t))o="Free move";else{const l=Q(t);if(l!==null){const{row:d,col:f}=Ut(l);o=`Forced board: (${d},${f}) / ${l}`}else o="Free move"}const a=(t==null?void 0:t.currentPlayer)==="O"?"chip chip--o":"chip chip--x";this.shadowRoot.innerHTML=`
      <style>${Gt}</style>
      <section class="hud" aria-label="Game HUD">
        <h2 class="hud__title">Game HUD</h2>
        <div class="hud__chips">
          <div class="chip" aria-live="polite" aria-label="Game status">${n}</div>
          <div class="${a}" aria-live="polite" aria-label="Current player">${s}</div>
          <div class="chip" aria-live="polite" aria-label="Constraint indicator">${o}</div>
        </div>
      </section>
    `}}function Wt(){customElements.get("uttt-hud")||customElements.define("uttt-hud",$t)}const _t=`
  :host {
    display: block;
    color: var(--color-text, #e2e8f0);
    font-family: var(--font-family-base, Inter, sans-serif);
  }

  .controls {
    display: grid;
    gap: 0.625rem;
  }

  .controls__title {
    margin: 0;
    font-size: var(--font-size-lg, 1.125rem);
    font-weight: 600;
  }

  .controls__row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .button {
    border: 1px solid var(--color-border, #32415f);
    border-radius: var(--radius-1, 0.5rem);
    padding: 0.5rem 0.75rem;
    background: var(--color-surface-muted, #17233b);
    color: var(--color-text, #e2e8f0);
    cursor: pointer;
  }

  .button:hover {
    background: var(--color-accent-strong, #3b82f6);
  }

  .button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .toggle[aria-pressed='true'] {
    background: var(--color-accent, #60a5fa);
    color: #0b1220;
  }
`;class Nt extends HTMLElement{constructor(){super(...arguments);r(this,"state",null);r(this,"canUndo",!1);r(this,"canRedo",!1);r(this,"analysisEnabled",!1);r(this,"analysisAvailable",!1)}connectedCallback(){this.shadowRoot||this.attachShadow({mode:"open"}),this.render(),this.bindEvents()}setState(t){this.state=t,this.render()}setHistoryAvailability(t,n){this.canUndo=t,this.canRedo=n,this.render()}setAnalysisAvailable(t){this.analysisAvailable=t,t||(this.analysisEnabled=!1),this.render()}setAnalysisEnabled(t){this.analysisEnabled=t,this.render()}emit(t,n){this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0,detail:n}))}bindEvents(){this.shadowRoot&&this.shadowRoot.addEventListener("click",t=>{const n=t.target;if(!n)return;const s=n.closest("button[data-action]");if(!s)return;const o=s.dataset.action;if(o){if(o==="new-game"){this.emit("uttt:new-game");return}if(o==="reset"){this.emit("uttt:reset");return}if(o==="undo"){this.emit("uttt:undo");return}if(o==="redo"){this.emit("uttt:redo");return}if(o==="toggle-analysis"){if(!this.analysisAvailable)return;this.analysisEnabled=!this.analysisEnabled,this.emit("uttt:toggle-analysis",{enabled:this.analysisEnabled}),this.render()}}})}render(){var a;if(!this.shadowRoot)return;const t=((a=this.state)==null?void 0:a.currentPlayer)??"X",n=this.canUndo?"Undo last move (Cmd/Ctrl+Z)":"Undo unavailable: no moves to undo",s=this.canRedo?"Redo move (Cmd/Ctrl+Shift+Z)":"Redo unavailable: no moves to redo",o=this.analysisAvailable?"Toggle analysis":"Analysis unavailable: AI integration not enabled in this build";this.shadowRoot.innerHTML=`
      <style>${_t}</style>
      <section class="controls" aria-label="Game controls">
        <h2 class="controls__title">Controls</h2>
        <div class="controls__row">
          <button
            class="button"
            type="button"
            data-action="new-game"
            title="Start a new game"
            aria-label="Start a new game"
          >New Game</button>
          <button
            class="button"
            type="button"
            data-action="reset"
            title="Reset current game"
            aria-label="Reset current game"
          >Reset</button>
          <button
            class="button"
            type="button"
            data-action="undo"
            title="${n}"
            aria-label="Undo last move"
            ${this.canUndo?"":"disabled"}
          >Undo</button>
          <button
            class="button"
            type="button"
            data-action="redo"
            title="${s}"
            aria-label="Redo move"
            ${this.canRedo?"":"disabled"}
          >Redo</button>
          <button
            class="button toggle"
            type="button"
            data-action="toggle-analysis"
            title="${o}"
            aria-label="Toggle analysis"
            aria-pressed="${this.analysisEnabled?"true":"false"}"
            ${this.analysisAvailable?"":"disabled"}
          >Analysis</button>
        </div>
        <div class="controls__row" aria-live="polite">
          <span class="button" aria-label="Current turn" title="Current turn">Turn: ${t}</span>
        </div>
      </section>
    `}}function Xt(){customElements.get("uttt-controls")||customElements.define("uttt-controls",Nt)}class Kt extends HTMLElement{constructor(){super(...arguments);r(this,"settings",{...w});r(this,"aiAvailable",!1)}connectedCallback(){this.render(),this.attachHandlers()}setSettings(t){this.settings={...t},this.render()}setAIAvailable(t){this.aiAvailable=t,this.render()}open(){const t=this.querySelector("dialog");t&&(t.open||t.showModal())}close(){const t=this.querySelector("dialog");t&&t.open&&t.close()}attachHandlers(){this.addEventListener("click",n=>{const s=n.target;if(!s)return;const o=s.closest("[data-action]");if(!o)return;const a=o.dataset.action;a==="close-settings"&&this.close(),a==="reset-settings"&&(this.settings={...w},this.render(),this.emitSettingsChanged(),this.dispatchEvent(new CustomEvent("uttt:settings-reset",{bubbles:!0,composed:!0})))}),this.addEventListener("input",n=>{const s=n.target;if(!s)return;const o=s.getAttribute("name");if(o){if(o==="analysisModeDefault"&&s instanceof HTMLInputElement&&(this.settings.analysisModeDefault=s.checked),o==="timerPerTurnEnabled"&&s instanceof HTMLInputElement&&(this.settings.timerPerTurnEnabled=s.checked),o==="secondsPerTurn"&&s instanceof HTMLInputElement){const a=Number.parseInt(s.value,10);Number.isFinite(a)&&(this.settings.secondsPerTurn=Math.max(5,Math.min(300,a)))}if(o==="aiDifficulty"&&s instanceof HTMLSelectElement){const a=s.value;(a==="easy"||a==="medium"||a==="hard"||a==="insane")&&(this.settings.aiDifficulty=a)}if(o==="showLastMove"&&s instanceof HTMLInputElement&&(this.settings.showLastMove=s.checked),o==="highlightIntensity"&&s instanceof HTMLInputElement){const a=Number.parseFloat(s.value);Number.isFinite(a)&&(this.settings.highlightIntensity=Math.max(.1,Math.min(1,a)))}this.emitSettingsChanged(),this.render()}});const t=this.querySelector("dialog");t==null||t.addEventListener("cancel",n=>{n.preventDefault(),this.close()})}emitSettingsChanged(){this.dispatchEvent(new CustomEvent("uttt:settings-changed",{bubbles:!0,composed:!0,detail:{...this.settings}}))}render(){this.innerHTML=`
      <dialog class="settings-dialog" aria-label="Settings dialog">
        <form class="settings-form" method="dialog">
          <header class="settings-header">
            <h3>Settings</h3>
            <button
              type="button"
              class="button settings-close"
              data-action="close-settings"
              aria-label="Close settings"
              title="Close settings"
            >Close</button>
          </header>

          <label class="field field--checkbox">
            <input name="analysisModeDefault" type="checkbox" ${this.settings.analysisModeDefault?"checked":""} />
            Analysis mode default
          </label>

          <label class="field field--checkbox">
            <input name="timerPerTurnEnabled" type="checkbox" ${this.settings.timerPerTurnEnabled?"checked":""} />
            Enable timer per turn
          </label>

          <label class="field">
            <span>Seconds per turn</span>
            <input
              name="secondsPerTurn"
              type="number"
              min="5"
              max="300"
              step="1"
              value="${this.settings.secondsPerTurn}"
            />
          </label>

          <label class="field">
            <span>AI difficulty</span>
            <select name="aiDifficulty" ${this.aiAvailable?"":"disabled"}>
              <option value="easy" ${this.settings.aiDifficulty==="easy"?"selected":""}>Easy</option>
              <option value="medium" ${this.settings.aiDifficulty==="medium"?"selected":""}>Medium</option>
              <option value="hard" ${this.settings.aiDifficulty==="hard"?"selected":""}>Hard</option>
              <option value="insane" ${this.settings.aiDifficulty==="insane"?"selected":""}>Insane</option>
            </select>
            ${this.aiAvailable?"":"<small>AI difficulty coming soon</small>"}
          </label>

          <label class="field field--checkbox">
            <input name="showLastMove" type="checkbox" ${this.settings.showLastMove?"checked":""} />
            Show last move
          </label>

          <label class="field">
            <span>Highlight intensity</span>
            <input
              name="highlightIntensity"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value="${this.settings.highlightIntensity.toFixed(2)}"
            />
          </label>

          <footer class="settings-footer">
            <button
              type="button"
              class="button"
              data-action="reset-settings"
              aria-label="Reset settings"
              title="Reset settings"
            >Reset settings</button>
          </footer>
        </form>
      </dialog>
    `}}function jt(){customElements.get("uttt-settings")||customElements.define("uttt-settings",Kt)}class Yt extends HTMLElement{constructor(){super(...arguments);r(this,"items",[]);r(this,"nextId",1)}connectedCallback(){this.render()}notify(t,n="info",s=2400){const o=String(t||"").trim();if(!o)return;const a={id:this.nextId,message:o,kind:n};this.nextId+=1,this.items=[...this.items,a],this.render(),globalThis.setTimeout(()=>{this.items=this.items.filter(l=>l.id!==a.id),this.render()},Math.max(800,s))}render(){this.innerHTML=`
      <section class="toast-stack" aria-label="Notifications" role="status" aria-live="polite" aria-atomic="false">
        ${this.items.map(t=>`<div class="toast toast--${t.kind}" data-kind="${t.kind}" role="status">${t.message}</div>`).join("")}
      </section>
    `}}function Vt(){customElements.get("uttt-toast")||customElements.define("uttt-toast",Yt)}class Zt extends HTMLElement{connectedCallback(){this.render(),this.attachHandlers()}open(){const e=this.querySelector("dialog");e&&!e.open&&e.showModal()}close(){const e=this.querySelector("dialog");e&&e.open&&e.close()}attachHandlers(){this.addEventListener("click",t=>{const n=t.target,s=n==null?void 0:n.closest("[data-action]");s&&s.dataset.action==="close-help"&&this.close()});const e=this.querySelector("dialog");e==null||e.addEventListener("cancel",t=>{t.preventDefault(),this.close()})}render(){this.innerHTML=`
      <dialog class="help-dialog" aria-label="Help and shortcuts">
        <div class="help-content">
          <header class="help-header">
            <h3>How to Play</h3>
            <button
              type="button"
              class="button"
              data-action="close-help"
              aria-label="Close help"
              title="Close help"
            >Close</button>
          </header>

          <section class="help-section" aria-label="Rules summary">
            <h4>Rules summary</h4>
            <ul>
              <li>Play in any cell for the first move.</li>
              <li>Your move sends the opponent to the matching small board.</li>
              <li>If that board is closed, the opponent gets a free move.</li>
              <li>Win three small boards in a line to win the game.</li>
            </ul>
          </section>

          <section class="help-section" aria-label="Keyboard shortcuts">
            <h4>Keyboard shortcuts</h4>
            <ul>
              <li><strong>⌘/Ctrl + Z</strong>: Undo</li>
              <li><strong>⌘/Ctrl + Shift + Z</strong>: Redo</li>
              <li><strong>N</strong>: New game</li>
            </ul>
          </section>
        </div>
      </dialog>
    `}}function qt(){customElements.get("uttt-help")||customElements.define("uttt-help",Zt)}Ft();Wt();Xt();jt();Vt();qt();const $=document.querySelector("uttt-app");if(!$)throw new Error("Bootstrap: expected <uttt-app> root element, but none was found.");const H=$.getMountPoints(),D=new Bt(H.canvas),V=H.endgameOverlay,Z=H.endgameMessage,F=H.playAgainBtn;$.bindController(D);let B=null;V&&Z&&(B=new It(V,Z),D.attachEndgameOverlay(B));F==null||F.addEventListener("click",()=>{D.resetGame(),B==null||B.hide()});window.controller=D;
