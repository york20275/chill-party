(() => {
  'use strict';
  const DATA = window.CHILL_PARTY_DATA;
  const app = document.getElementById('app');

  const YT = {
    sdk: window.ytgame || window.youtube?.playables || null,
    firstFrameReady(){ try { this.sdk?.firstFrameReady?.(); } catch(e){} },
    gameReady(){ try { this.sdk?.gameReady?.(); } catch(e){} },
    sendScore(score){ try { this.sdk?.sendScore?.({value:score}); } catch(e){} },
    pauseHandlers(){
      try { this.sdk?.onPause?.(()=> { document.body.classList.add('paused'); AUDIO.pause(); }); } catch(e){}
      try { this.sdk?.onResume?.(()=> { document.body.classList.remove('paused'); AUDIO.resume(); }); } catch(e){}
    }
  };

  const AUDIO = {
    ctx:null, master:null, bgmGain:null, sfxGain:null,
    enabled:true, started:false, timer:null, step:0, nextTime:0,
    init(){
      if(this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.master.gain.value = 0.72;
      this.bgmGain.gain.value = 0.51;
      this.sfxGain.gain.value = 0.55;
      this.bgmGain.connect(this.master); this.sfxGain.connect(this.master); this.master.connect(this.ctx.destination);
      return true;
    },
    async ensureStarted(){
      if(!this.enabled || !this.init()) return;
      try { if(this.ctx.state !== 'running') await this.ctx.resume(); } catch(e){}
      if(!this.started){ this.started=true; this.startBgm(); }
    },
    tone(freq=440,dur=.08,type='sine',gain=.12,when=0,target='sfx',detune=0){
      if(!this.ctx || !this.enabled) return;
      const now=this.ctx.currentTime+when, osc=this.ctx.createOscillator(), g=this.ctx.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,now); osc.detune.value=detune;
      g.gain.setValueAtTime(0.0001,now); g.gain.exponentialRampToValueAtTime(gain,now+.008); g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
      osc.connect(g); g.connect(target==='bgm'?this.bgmGain:this.sfxGain); osc.start(now); osc.stop(now+dur+.03);
    },
    click(){ this.tone(620,.055,'triangle',.11); this.tone(920,.045,'sine',.045,.018); },
    ready(){ this.tone(520,.08,'triangle',.12); this.tone(780,.10,'triangle',.10,.07); },
    correct(){ this.tone(660,.12,'triangle',.14); this.tone(880,.14,'triangle',.12,.09); this.tone(1100,.18,'sine',.10,.18); },
    wrong(){ this.tone(190,.16,'sawtooth',.08); this.tone(150,.20,'sawtooth',.06,.10); },
    reveal(){ this.tone(440,.08,'triangle',.09); this.tone(554,.08,'triangle',.09,.07); this.tone(659,.14,'triangle',.11,.14); },
    victory(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,.24,'triangle',.12,i*.10)); },
    startBgm(){
      if(!this.ctx || this.timer) return;
      this.step=0; this.nextTime=this.ctx.currentTime+.05;
      const tick=()=>{
        if(!this.enabled || !this.ctx){ this.stopBgm(); return; }
        while(this.nextTime < this.ctx.currentTime+.35){ this.scheduleStep(this.step++,this.nextTime); this.nextTime += .25; }
      };
      tick(); this.timer=setInterval(tick,120);
    },
    scheduleStep(step,t){
      // Original light party loop: C major pentatonic, 120 BPM eighth-notes.
      const bass=[130.81,130.81,174.61,174.61,146.83,146.83,196.00,196.00];
      const lead=[523.25,659.25,783.99,659.25,587.33,659.25,880.00,783.99,659.25,523.25,587.33,659.25,783.99,880.00,783.99,659.25];
      const i=step%16;
      if(i%2===0) this.bgmTone(bass[(step>>1)%bass.length],t,.20,'triangle',.045);
      if([0,3,6,8,11,14].includes(i)) this.bgmTone(lead[i],t,.12,'sine',.025);
      if(i%4===2) this.noiseHat(t,.018);
    },
    bgmTone(freq,t,dur,type,gain){
      if(!this.ctx || !this.enabled) return;
      const osc=this.ctx.createOscillator(), g=this.ctx.createGain(); osc.type=type; osc.frequency.value=freq;
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      osc.connect(g); g.connect(this.bgmGain); osc.start(t); osc.stop(t+dur+.03);
    },
    noiseHat(t,gain=.015){
      if(!this.ctx || !this.enabled) return;
      const len=Math.max(1,Math.floor(this.ctx.sampleRate*.04)), b=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=b.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      const src=this.ctx.createBufferSource(), hp=this.ctx.createBiquadFilter(), g=this.ctx.createGain(); src.buffer=b; hp.type='highpass'; hp.frequency.value=6000;
      g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+.04); src.connect(hp); hp.connect(g); g.connect(this.bgmGain); src.start(t); src.stop(t+.05);
    },
    stopBgm(){ if(this.timer){ clearInterval(this.timer); this.timer=null; } },
    async toggle(){
      this.enabled=!this.enabled;
      if(this.enabled){ await this.ensureStarted(); this.startBgm(); if(this.master) this.master.gain.setTargetAtTime(.72,this.ctx.currentTime,.02); }
      else { this.stopBgm(); if(this.master && this.ctx) this.master.gain.setTargetAtTime(.0001,this.ctx.currentTime,.02); }
      render();
    },
    pause(){ if(this.ctx?.state==='running') this.ctx.suspend().catch(()=>{}); },
    resume(){ if(this.enabled && this.ctx?.state==='suspended') this.ctx.resume().catch(()=>{}); }
  };

  const I18N = {
    en:{tag:'EN',subtitle:'Different languages. Same game.',players:'Players',start:'Start Party',back:'Back',continue:'Continue',pass:'Pass the device to',ready:'I’m ready',round:'Round',score:'Score',drawTitle:'Draw & Guess',quizTitle:'Quick Quiz',matchTitle:'Match Me',mixTitle:'Mix Party',drawHint:'Draw the word. Others call out the answer.',award:'Who guessed it?',nobody:'Nobody / Skip',clear:'Clear',undo:'Undo',done:'Finish round',pick:'Choose your answer',locked:'Answer locked',reveal:'Reveal results',correct:'Correct answer',matchResult:'Match results',next:'Next round',results:'Party Results',playAgain:'Play Again',home:'Home',mode:'Mode',chooseMode:'Choose a game',setup:'Party setup',language:'Language',rounds:'Rounds',roundsHint:'Choose 1–100 rounds',hideWord:'Hide word',showWord:'Show word'},
    zh:{tag:'中',subtitle:'不同語言，也能一起玩。',players:'玩家人數',start:'開始 Party',back:'返回',continue:'繼續',pass:'把裝置交給',ready:'我準備好了',round:'回合',score:'分數',drawTitle:'你畫我猜',quizTitle:'知識快問快答',matchTitle:'默契挑戰',mixTitle:'混合 Party',drawHint:'畫出題目，其他人直接喊答案。',award:'誰猜對了？',nobody:'沒人猜中／跳過',clear:'清除',undo:'復原',done:'結束本回合',pick:'選擇你的答案',locked:'答案已鎖定',reveal:'揭曉結果',correct:'正確答案',matchResult:'默契結果',next:'下一回合',results:'Party 結果',playAgain:'再玩一次',home:'首頁',mode:'模式',chooseMode:'選擇遊戲',setup:'Party 設定',language:'語言',rounds:'回合數',roundsHint:'可設定 1–100 回合',hideWord:'隱藏題目',showWord:'顯示題目'}
  };

  const state = {
    screen:'home', uiLang:'zh', playerCount:4,
    players:[], mode:null, round:0, totalRounds:0, currentPlayer:0,
    scores:[], answers:{}, used:{draw:[],quiz:[],match:[]}, currentQuestion:null,
    phase:null, mixPlan:['draw','quiz','match'],
    roundSettings:{draw:4,quiz:3,match:3,mix:6},
    awarded:new Set(), history:[], drawWordHidden:false, _showLangHint:true
  };

  function t(k){ return I18N[state.uiLang][k] || k; }
  function initPlayers(){
    state.players = Array.from({length:state.playerCount},(_,i)=>({id:i,lang:i%2===0?'en':'zh'}));
    state.scores = Array(state.playerCount).fill(0);
  }
  initPlayers();

  const esc = s => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function randQuestion(mode){
    const pool = DATA[mode];
    const unused = pool.filter(q=>!state.used[mode].includes(q.id));
    const src = unused.length?unused:pool;
    if(!unused.length) state.used[mode]=[];
    const q = src[Math.floor(Math.random()*src.length)];
    state.used[mode].push(q.id); return q;
  }
  function playerLabel(i,lang=state.uiLang){ return lang==='zh'?`玩家 ${i+1}`:`Player ${i+1}`; }
  function header(){
    const homeButton = state.screen==='home' ? '' : `<button class="pill home-pill" data-global-home aria-label="${t('home')}">⌂ ${t('home')}</button>`;
    return `<div class="topbar"><div class="brand">CHILL PARTY<small>V0.2.4 · HIDE WORD · BGM 150%</small></div><div class="top-actions">${homeButton}<button class="pill" data-audio-toggle aria-label="${AUDIO.enabled?'Sound on':'Sound off'}">${AUDIO.enabled?'🔊':'🔇'}</button><div class="lang-hint-wrap"><button class="pill" data-ui-lang>${state.uiLang==='en'?'中文':'EN'}</button>${state.screen==='home'&&state._showLangHint!==false?'<div class="lang-hint" data-lang-hint>可更換語言<br><span>Change Language</span></div>':''}</div></div></div>`;
  }
  function modeLabel(m,lang=state.uiLang){ const map={draw:lang==='zh'?'你畫我猜':'Draw & Guess',quiz:lang==='zh'?'知識快問快答':'Quick Quiz',match:lang==='zh'?'默契挑戰':'Match Me',mix:lang==='zh'?'混合 Party':'Mix Party'};return map[m]; }
  function scores(){return `<div class="score-strip">${state.players.map((p,i)=>`<div class="score-chip ${i===state.currentPlayer?'active':''}">${playerLabel(i)} · ${state.scores[i]}</div>`).join('')}</div>`}
  function render(){
    if(state.screen==='home') renderHome();
    else if(state.screen==='setup') renderSetup();
    else if(state.screen==='pass') renderPass();
    else if(state.screen==='draw') renderDraw();
    else if(state.screen==='drawResult') renderDrawResult();
    else if(state.screen==='quiz') renderQuiz();
    else if(state.screen==='quizReveal') renderQuizReveal();
    else if(state.screen==='match') renderMatch();
    else if(state.screen==='matchReveal') renderMatchReveal();
    else if(state.screen==='results') renderResults();
  }

  function renderHome(){
    app.innerHTML=`<main class="screen">${header()}<section class="hero"><div class="hero-copy"><div class="eyebrow">GLOBAL PARTY · 2–6 PLAYERS</div><h1>PLAY<br>TOGETHER.</h1><p>${t('subtitle')}</p><div class="hero-tags"><span>🌐 EN / 中文</span><span>⚡ Quick rounds</span><span>🎉 Same-room fun</span></div></div><div class="hero-orb" aria-hidden="true"><span>✦</span><b>CP</b><i>●</i></div></section><section class="card"><h2 class="section-title">${t('chooseMode')}</h2><div class="grid">
      ${modeCard('draw','🎨',t('drawTitle'),state.uiLang==='en'?'Draw it. Guess it.':'畫出來、猜出來。')}
      ${modeCard('quiz','🧠',t('quizTitle'),state.uiLang==='en'?'Fast questions, same topic.':'快問快答，同題競賽。')}
      ${modeCard('match','🤝',t('matchTitle'),state.uiLang==='en'?'See who thinks alike.':'看看誰跟你最有默契。')}
      ${modeCard('mix','🔥',t('mixTitle'),state.uiLang==='en'?'All modes in one party.':'三種玩法一次玩。')}
      </div></section><div class="footer-note">Built for bilingual local party testing · EN / 繁中</div></main>`;
    bindCommon(); document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;state.screen='setup';render();});
  }
  function modeCard(mode,emoji,title,desc){const featured=mode==='mix'?' featured':'';const badge=mode==='mix'?`<em>${state.uiLang==='zh'?'推薦':'BEST START'}</em>`:'';return `<button class="mode-card ${mode}${featured}" data-mode="${mode}"><div class="mode-top"><div class="emoji">${emoji}</div>${badge}</div><div><strong>${title}</strong><br><span>${desc}</span></div><div class="mode-go">${state.uiLang==='zh'?'開始':'PLAY'} →</div></button>`}

  function renderSetup(){
    app.innerHTML=`<main class="screen">${header()}<section class="card"><div class="round-head"><h2 class="section-title" style="margin:0">${t('setup')} · ${modeLabel(state.mode)}</h2><button class="secondary" data-back>${t('back')}</button></div><div style="height:14px"></div><div class="setup-row"><div><strong>${t('players')}</strong></div><div class="counter"><button data-minus>−</button><strong>${state.playerCount}</strong><button data-plus>＋</button></div></div><div class="setup-divider"></div><div class="setup-row"><div><strong>${t('rounds')}</strong><div class="tiny">${t('roundsHint')}</div></div><div class="round-control"><button data-round-minus>−</button><input data-round-input type="number" min="1" max="100" inputmode="numeric" value="${state.roundSettings[state.mode]}" aria-label="${t('rounds')}"><button data-round-plus>＋</button></div></div></section>
    <section class="card"><h2 class="section-title">${t('language')} / Language</h2><div class="players">${state.players.map((p,i)=>`<div class="player-row"><span class="player-name">${playerLabel(i)}</span><div class="lang-switch"><button class="${p.lang==='en'?'active':''}" data-plang="en" data-p="${i}">EN</button><button class="${p.lang==='zh'?'active':''}" data-plang="zh" data-p="${i}">中文</button></div></div>`).join('')}</div></section><button class="primary full" data-start>${t('start')}</button></main>`;
    bindCommon(); document.querySelector('[data-back]').onclick=()=>{state.screen='home';render()};
    document.querySelector('[data-minus]').onclick=()=>setCount(state.playerCount-1);document.querySelector('[data-plus]').onclick=()=>setCount(state.playerCount+1);
    document.querySelector('[data-round-minus]').onclick=()=>setRounds(state.roundSettings[state.mode]-1);document.querySelector('[data-round-plus]').onclick=()=>setRounds(state.roundSettings[state.mode]+1);
    document.querySelector('[data-round-input]').onchange=e=>setRounds(e.target.value);
    document.querySelectorAll('[data-plang]').forEach(b=>b.onclick=()=>{state.players[+b.dataset.p].lang=b.dataset.plang;render();});
    document.querySelector('[data-start]').onclick=startGame;
  }
  function setCount(n){ n=Math.max(2,Math.min(6,n)); if(n===state.playerCount)return; state.playerCount=n; initPlayers(); render(); }
  function setRounds(n){ n=parseInt(n,10); if(!Number.isFinite(n)) n=1; n=Math.max(1,Math.min(100,n)); state.roundSettings[state.mode]=n; render(); }
  function startGame(){ state._victoryPlayed=false; state.round=0;state.scores=Array(state.playerCount).fill(0);state.used={draw:[],quiz:[],match:[]};state.history=[];state.totalRounds=state.roundSettings[state.mode]||1;nextRound(); }
  function nextRound(){
    if(state.round>=state.totalRounds){state.screen='results';YT.sendScore(Math.max(...state.scores));return render();}
    const m=state.mode==='mix'?state.mixPlan[state.round%state.mixPlan.length]:state.mode; state.phase=m; state.answers={};state.awarded=new Set();state.drawWordHidden=false;
    state.currentPlayer = m==='draw'?state.round%state.playerCount:0; state.currentQuestion=randQuestion(m); state.screen='pass';render();
  }
  function renderPass(){
    const p=state.currentPlayer, lang=state.players[p].lang;
    const title = modeLabel(state.phase,lang);
    app.innerHTML=`<main class="screen">${header()}<div class="round-head"><span class="round-badge">${t('round')} ${state.round+1}/${state.totalRounds}</span><span class="round-badge">${modeLabel(state.phase)}</span></div>${scores()}<section class="card pass-card"><div class="big">${state.phase==='draw'?'🎨':state.phase==='quiz'?'🧠':'🤝'}</div><h2>${lang==='zh'?`把裝置交給 ${playerLabel(p,'zh')}`:`Pass the device to ${playerLabel(p,'en')}`}</h2><p>${title}</p><button class="primary full" data-ready>${lang==='zh'?'我準備好了':"I'm ready"}</button></section></main>`;
    bindCommon();document.querySelector('[data-ready]').onclick=()=>{AUDIO.ready();state.screen=state.phase;render();};
  }

  function renderDraw(){
    const p=state.currentPlayer, lang=state.players[p].lang, q=state.currentQuestion;
    app.innerHTML=`<main class="screen">${header()}<div class="round-head"><span class="round-badge">${t('round')} ${state.round+1}/${state.totalRounds}</span><span class="round-badge">${playerLabel(p)}</span></div>${scores()}<section class="card"><div class="sub">${lang==='zh'?'請畫出':'Draw this'}</div><div class="draw-word-row"><div class="question draw-word-question"><span class="word ${state.drawWordHidden?'hidden-word':''}">${state.drawWordHidden?'xxxxx':esc(q[lang])}</span></div><button class="word-toggle" data-word-toggle aria-pressed="${state.drawWordHidden?'true':'false'}">${state.drawWordHidden?'👁 '+t('showWord'):'🙈 '+t('hideWord')}</button></div><div class="sub">${lang==='zh'?'其他人直接喊答案；畫的人點選猜對的玩家。':'Others call out the answer; the drawer taps who guessed correctly.'}</div></section><section class="canvas-wrap"><canvas id="canvas" class="drawing" width="900" height="675"></canvas><div class="tools"><button class="tool" data-undo>${t('undo')}</button><button class="tool" data-clear>${t('clear')}</button></div></section><section class="card"><h3 class="section-title">${t('award')}</h3><div class="award-grid">${state.players.map((_,i)=>i===p?'':`<button class="award" data-award="${i}">${playerLabel(i)} +100</button>`).join('')}</div><div style="height:10px"></div><button class="secondary full" data-skip>${t('nobody')}</button></section></main>`;
    bindCommon(); setupCanvas(); document.querySelector('[data-word-toggle]').onclick=()=>{state.drawWordHidden=!state.drawWordHidden;render();}; document.querySelectorAll('[data-award]').forEach(b=>b.onclick=()=>{const i=+b.dataset.award;if(!state.awarded.has(i)){state.awarded.add(i);state.scores[i]+=100;state.scores[p]+=50;b.classList.add('done');b.disabled=true;AUDIO.correct();} setTimeout(finishDraw,250);}); document.querySelector('[data-skip]').onclick=finishDraw;
  }
  function finishDraw(){state.screen='drawResult';render();}
  function renderDrawResult(){const q=state.currentQuestion;app.innerHTML=`<main class="screen">${header()}${scores()}<section class="card pass-card"><div class="big">🎉</div><h2>${q.en} / ${q.zh}</h2><p>ID: ${q.id}</p><button class="primary full" data-next>${t('next')}</button></section></main>`;bindCommon();document.querySelector('[data-next]').onclick=()=>{state.round++;nextRound();}}

  function renderQuiz(){
    const p=state.currentPlayer, lang=state.players[p].lang,q=state.currentQuestion;
    app.innerHTML=`<main class="screen">${header()}<div class="round-head"><span class="round-badge">${t('round')} ${state.round+1}/${state.totalRounds}</span><span class="round-badge">${playerLabel(p)}</span></div>${scores()}<section class="card"><div class="sub">${modeLabel('quiz',lang)} · ${q.id}</div><div class="question">${esc(q.q[lang])}</div><div class="options">${q.options.map(o=>`<button class="option" data-opt="${o.id}">${esc(o[lang])}</button>`).join('')}</div></section></main>`;
    bindCommon();document.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{state.answers[p]=b.dataset.opt;if(b.dataset.opt===q.answer){state.scores[p]+=100;AUDIO.correct();}else{AUDIO.wrong();} if(p<state.playerCount-1){state.currentPlayer++;state.screen='pass';render();}else{AUDIO.reveal();state.screen='quizReveal';render();}});
  }
  function renderQuizReveal(){const q=state.currentQuestion;app.innerHTML=`<main class="screen">${header()}${scores()}<section class="card"><div class="sub">${t('correct')}</div><div class="question">${esc(q.options.find(o=>o.id===q.answer)[state.uiLang])}</div><div class="result-list">${state.players.map((p,i)=>{const a=state.answers[i],o=q.options.find(x=>x.id===a);return `<div class="result-row"><span>${a===q.answer?'✅':'❌'}</span><strong>${playerLabel(i)}</strong><span>${o?esc(o[state.uiLang]):'—'}</span></div>`}).join('')}</div></section><button class="primary full" data-next>${t('next')}</button></main>`;bindCommon();document.querySelector('[data-next]').onclick=()=>{state.round++;nextRound();}}

  function renderMatch(){
    const p=state.currentPlayer,lang=state.players[p].lang,q=state.currentQuestion;
    app.innerHTML=`<main class="screen">${header()}<div class="round-head"><span class="round-badge">${t('round')} ${state.round+1}/${state.totalRounds}</span><span class="round-badge">${playerLabel(p)}</span></div>${scores()}<section class="card"><div class="sub">${modeLabel('match',lang)} · ${q.id}</div><div class="question">${esc(q.q[lang])}</div><div class="options">${q.options.map(o=>`<button class="option" data-opt="${o.id}">${esc(o[lang])}</button>`).join('')}</div></section></main>`;
    bindCommon();document.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{state.answers[p]=b.dataset.opt;if(p<state.playerCount-1){state.currentPlayer++;state.screen='pass';render();}else{scoreMatches();AUDIO.reveal();state.screen='matchReveal';render();}})
  }
  function scoreMatches(){const counts={};Object.values(state.answers).forEach(a=>counts[a]=(counts[a]||0)+1);Object.entries(state.answers).forEach(([i,a])=>{if(counts[a]>1)state.scores[+i]+=(counts[a]-1)*75;});}
  function renderMatchReveal(){const q=state.currentQuestion;const groups={};Object.entries(state.answers).forEach(([i,a])=>{(groups[a]??=[]).push(+i)});app.innerHTML=`<main class="screen">${header()}${scores()}<section class="card"><h2 class="section-title">${t('matchResult')}</h2>${Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).map(([a,ids])=>{const o=q.options.find(x=>x.id===a);return `<div class="match-group"><strong>${esc(o[state.uiLang])}</strong><div class="tiny">${ids.map(i=>playerLabel(i)).join(' · ')}</div><div>${ids.length>1?'🤝 '+ids.length+' MATCH':'Solo pick'}</div></div>`}).join('')}</section><button class="primary full" data-next>${t('next')}</button></main>`;bindCommon();document.querySelector('[data-next]').onclick=()=>{state.round++;nextRound();}}

  function renderResults(){if(!state._victoryPlayed){state._victoryPlayed=true;setTimeout(()=>AUDIO.victory(),80);}const ranks=state.players.map((p,i)=>({i,score:state.scores[i]})).sort((a,b)=>b.score-a.score);app.innerHTML=`<main class="screen">${header()}<section class="hero"><h1>${t('results')}</h1><p>${ranks[0]?`${playerLabel(ranks[0].i)} 🏆`:''}</p></section><section class="card"><div class="result-list">${ranks.map((r,idx)=>`<div class="result-row"><span class="rank">${['🥇','🥈','🥉'][idx]||`${idx+1}`}</span><strong>${playerLabel(r.i)}</strong><span class="points">${r.score}</span></div>`).join('')}</div></section><div class="actions"><button class="primary" data-again>${t('playAgain')}</button><button class="secondary" data-home>${t('home')}</button></div></main>`;bindCommon();document.querySelector('[data-again]').onclick=startGame;document.querySelector('[data-home]').onclick=()=>{state.screen='home';render();}}

  function goHome(){
    const inGame = !['home','setup','results'].includes(state.screen);
    if(inGame){
      const msg = state.uiLang==='zh' ? '目前對局尚未結束，確定要離開並回到首頁嗎？' : 'This party is still in progress. Leave it and return home?';
      if(!window.confirm(msg)) return;
    }
    state.screen='home';
    state.mode=null;
    state.round=0;
    state.totalRounds=0;
    state.currentPlayer=0;
    state.currentQuestion=null;
    state.phase=null;
    state.answers={};
    state.awarded=new Set();
    state.drawWordHidden=false;
    state.history=[];
    state.used={draw:[],quiz:[],match:[]};
    state.scores=Array(state.playerCount).fill(0);
    render();
  }

  function bindCommon(){
    const b=document.querySelector('[data-ui-lang]');
    if(b)b.onclick=()=>{state._showLangHint=false;state.uiLang=state.uiLang==='en'?'zh':'en';render();};
    const h=document.querySelector('[data-global-home]');
    if(h)h.onclick=goHome;
    const a=document.querySelector('[data-audio-toggle]');
    if(a)a.onclick=(e)=>{e.stopPropagation();AUDIO.toggle();};
  }

  function setupCanvas(){
    const c=document.getElementById('canvas'),ctx=c.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=7;ctx.strokeStyle='#23263a';
    let drawing=false,last=null,strokes=[];function pos(e){const r=c.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}}
    function start(e){drawing=true;last=pos(e);strokes.push([]);e.preventDefault?.()}
    function move(e){if(!drawing)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();strokes[strokes.length-1].push([last,p]);last=p;e.preventDefault?.()}
    function end(){drawing=false;last=null}
    ['pointerdown'].forEach(ev=>c.addEventListener(ev,start));['pointermove'].forEach(ev=>c.addEventListener(ev,move));['pointerup','pointercancel','pointerleave'].forEach(ev=>c.addEventListener(ev,end));
    function redraw(){ctx.clearRect(0,0,c.width,c.height);for(const s of strokes)for(const seg of s){ctx.beginPath();ctx.moveTo(seg[0].x,seg[0].y);ctx.lineTo(seg[1].x,seg[1].y);ctx.stroke()}}
    document.querySelector('[data-clear]').onclick=()=>{strokes=[];redraw()};document.querySelector('[data-undo]').onclick=()=>{strokes.pop();redraw()};
  }


  document.addEventListener('pointerdown',()=>AUDIO.ensureStarted(),{once:true,capture:true});
  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(b && !b.disabled && !b.matches('[data-audio-toggle]')) AUDIO.click();},true);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) AUDIO.pause(); else AUDIO.resume(); });

  window.addEventListener('resize',()=>{/* DOM/CSS is responsive; state intentionally preserved */});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){/* Do not preventDefault per Playables requirement. */}});
  YT.firstFrameReady(); render(); setTimeout(()=>{ if(state._showLangHint){ state._showLangHint=false; const h=document.querySelector('[data-lang-hint]'); if(h) h.classList.add('hide'); } },5500); YT.pauseHandlers(); requestAnimationFrame(()=>YT.gameReady());
})();
