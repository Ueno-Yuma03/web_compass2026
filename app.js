//モード選択
const modeSelect = document.getElementById("mode-select");
const compassApp = document.getElementById("compass-app");
const modeButtons =document.querySelectorAll(".mode-btn");
const miniDials = document.querySelectorAll(".mini-dial");
const miniFans = document.querySelectorAll(".mini-fanPath");
//センサー関係
const tiltWarn = document.getElementById("tilt-warning");
const dials = document.querySelectorAll(".dial");
const ang_val = document.getElementById("ang_val");
const rp_btn = document.querySelector(".ripple-btn");
const container = document.querySelectorAll(".deg_labels");
const fanPaths = document.querySelectorAll(".fanPath");
const debug = document.getElementById("debug");
const countdown = document.getElementById("countdown");
//現在選択している角度範囲
let selRange = null;
//センサー関係
let orientationInitialized = false;
let started = false;
let zero_standard = true;
let diff180 = 0;
let diff0 = 0;
let timer = null;       //5秒後に状態反転
let cnt_DOWN = null;    //カウントダウン
let lastDiff = 0;
let baseHeading = 0;
let baseOffset = 0;
let rawHeading = 0;
let displayHeading = (rawHeading - baseOffset + 360) % 360;
let labels = [];
let Beta = null;
let Gamma = null;
/*キャリブレーション用*/
let fig8_PrmptShown = false;  //キャリブレーション(8の字運動)を行ったかどうか
let fig8_CaliDone = false;     //初回のキャリブレーションを終えたかどうか
let fig8_Active = false;
const caliModal = document.getElementById("calibration-modal");
const caliStatus = document.getElementById("calibration-status");
// 動き検出の仮設定
const motionThreshold = 1.2; // m/s²
let motionHitCount = 0;


/*モード選択*/
document.querySelectorAll(".mode-btn").forEach(button => {
    button.addEventListener("click", async () => {
        selRange = Number(button.dataset.range);
        document.getElementById("mode-select").style.display = "none";
        document.getElementById("compass-app").style.display = "block";
        // センサー取得開始
        const ok = await initOrientation();
        if (!ok) {
          return;
        }
        requestAnimationFrame(() => {
            createTicks();
            createDeg_labels();
        });
    });
});
/*ミニコンパス2個制御*/
function rotateMiniCompass(dial, angle) {
    dial.style.transform = `translate(-50%, -50%) rotate(${-angle}deg)`;
}
function updateMiniFan(fanPath, angle) {
    const center = 150;
    const radius = 137;
    const startAngle = -90;
    const endAngle = startAngle + angle;
    const startRad = startAngle * Math.PI / 180;
    const endRad = endAngle * Math.PI / 180;
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const largeArcFlag = Math.abs(angle) > 180 ? 1 : 0;
    fanPath.setAttribute(
        "d",
        `M ${center} ${center}
         L ${x1} ${y1}
         A ${radius} ${radius} 0 ${largeArcFlag} ${angle >= 0 ? 1 : 0} ${x2} ${y2}
         Z`
    );
}
function animateMiniCompass() {
    const dials = document.querySelectorAll(".mini-dial");
    const fans = document.querySelectorAll(".mini-fanPath");
    let angle = 0;
    let direction = 1;
    function animation() {
        angle += 0.5 * direction;
        // 90°まで回ったら反転
        if (angle >= 90) {
            angle = 90;
            direction = -1;
        }
        // -90°まで回ったら反転
        if (angle <= -90) {
            angle = -90;
            direction = 1;
        }
        dials.forEach((dial, index) => {
          const range = index === 0 ? 45 : 90;
          // 90°モード → ±90°
          // 45°モード → ±45°
          const miniAngle = angle * range / 90;
          rotateMiniCompass(dial, miniAngle);
          updateMiniFan(fans[index], miniAngle, range);
        });
          requestAnimationFrame(animation);
    }
    animation();
}
animateMiniCompass();

async function initOrientation() {
  // すでにセンサーを登録済みなら何もしない
  if (orientationInitialized) {
    return true;
  }
  // センサーの許可が必要な環境では許可を要求
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permissionState = await DeviceOrientationEvent.requestPermission(true);
      if (permissionState !== "granted") {
        ang_val.textContent = "センサーの許可が必要です";
        return false;
      }
    } catch(err){
      console.error(err);
      ang_val.textContent = "センサーの許可を取得できませんでした";
      return false;
    }
  }
  // 絶対方位イベントを登録
  window.addEventListener("deviceorientationabsolute",handleOrientation);
  orientationInitialized = true;
  return true;
}

function handleOrientation(event) {
  let heading;

  // iOS
  if (typeof event.webkitCompassHeading === "number" && Number.isFinite(event.webkitCompassHeading)){
    heading = event.webkitCompassHeading;
  } else if(typeof event.alpha === "number" && Number.isFinite(event.alpha)){
    // Android
    heading = (360 - event.alpha) % 360;
  } else {
    return;
  }
  rawHeading = heading;
  Beta = event.beta;
  Gamma = event.gamma;
/*
  ang_val.textContent =
    `イベント: ${event.type}\n` +
    `方位: ${heading.toFixed(1)}°<br>` +
    `absolute: ${event.absolute}<br>` +
    `alpha: ${event.alpha}<br>` +
    `beta: ${Beta.toFixed(1)}<br>` +
    `gamma: ${Gamma.toFixed(1)}`;
  debug.textContent =
  `イベント: ${event.type}\n` +
  `alpha: ${event.alpha}\n` +
  `計算後: ${heading.toFixed(1)}°`;*/

  // 測定開始前、または初回キャリブレーション前はコンパスの測定処理を実行しない
  if (!started || !fig8_CaliDone) {
    return;
  }
  //目標角度設定
  const targetHeading = (heading - baseOffset + 360) % 360;
  // 差を正しく計算（-180〜180にする）(javascriptは"%"の仕様で負の値を認識できない)
  let diff = targetHeading - displayHeading;
  diff = ((diff + 540) % 360) - 180;
  // スムージング
  displayHeading += diff * 0.2;
  displayHeading = (displayHeading + 360) % 360;
  checkMode();        //基準反転のフラグ管理
  updateCompass();    //すぐに描画用
}

function updateCompass(){
  let heading;
  if (zero_standard) {
    heading = ((displayHeading + 540) % 360) - 180;
  }else{
    heading = ((displayHeading - 180 + 540) % 360) - 180;
  }
  const limitHeading = Math.max(-selRange, Math.min(selRange, heading));
  let visualHeading = limitHeading * 180 / selRange;
  rotateCompass(document.getElementById("compass"), visualHeading);
  updateFan(fanPaths[0], visualHeading);
  
  const theDiff = ((rawHeading - baseOffset + 540) % 360) - 180;
  const angle = Math.abs(theDiff).toFixed(1);
  if (theDiff > 0) {
    ang_val.innerHTML = `右へ <span class="angle">${angle}°</span> ずれてます！`;
  } else if (theDiff < 0) {
    ang_val.innerHTML = `左へ <span class="angle">${angle}°</span> ずれてます！`;
  } else {
    ang_val.textContent = "ぴったりです。";
  }/*
  debug.innerHTML =
        `zero = ${zero_standard}<br>` +
        `display = ${displayHeading.toFixed(1)}<br>`+
        `visual = ${visualHeading.toFixed(1)}<br>`+
        `limit = ${limitHeading.toFixed(1)}<br>`+
        `diff180 = ${diff180.toFixed(1)}<br>`+
        `diff0 = ${diff0.toFixed(1)}<br>`+
        `timer = ${timer === null ? "null" : "running"}`;*/
}

function rotateCompass(wrapper, angle) {
    wrapper.querySelector(".dial").style.transform =`translate(-50%, -50%) rotate(${-angle}deg)`;
    wrapper.querySelectorAll(".degreeLabel").forEach(label => {
        label.style.transform =`translate(-50%, -50%) rotate(${angle}deg)`;
    });
}

function createDeg_labels(){
  document.querySelectorAll(".compass_wrapper").forEach(wrapper => {
    const dial = wrapper.querySelector(".dial");
    const container = wrapper.querySelector(".deg_labels");
    container.innerHTML = "";
    const r = dial.offsetWidth * 0.72;

    for (let deg = 0; deg < 360; deg += 30) {
      const label = document.createElement("div");
      label.className = "degreeLabel";
      label.dataset.deg = deg;
      // 実際の角度範囲へ変換
      const visualAngle = deg <= 180 ? deg : 360 - deg;
      const actualAngle = visualAngle * selRange / 180;
      label.textContent = actualAngle.toFixed(1) + "°";

      const rad = (deg - 90) * Math.PI / 180;
      const x = 50 + (r * Math.cos(rad) / dial.offsetWidth * 100);
      const y = 50 + (r * Math.sin(rad) / dial.offsetWidth * 100);
      label.style.left = x + "%";
      label.style.top = y + "%";

      container.appendChild(label);
    }
  });
}

//svgを用いた一目盛りのコード
function createTicks(){
  document.querySelectorAll(".ticks").forEach(svg => {
    svg.innerHTML = "";
    for (let i=0; i<360; i+=2){
      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      //長さの設定
      const size = 300;
      const cx = size/2;
      const cy = size/2;
      if(i % 30 === 0){
        r1 = 148;
        r2 = 132;
      }
      else if(i % 10 === 0){
        r1 = 148;
        r2 = 137;
      }
      else{
        r1 = 148;
        r2 = 142;
      }

      line.setAttribute("x1", cx);
      line.setAttribute("y1", cy - r1);
      line.setAttribute("x2", cx);
      line.setAttribute("y2", cy - r2);
      line.setAttribute("stroke", "black");
      line.setAttribute("stroke-width", 1.5);
      line.setAttribute("transform", `rotate(${i} ${cx} ${cy})`);
      svg.appendChild(line);
    }
  });
}

function checkMode(){
  // 180°付近に5秒以上いたら基準の反転
  diff180 = Math.abs(((displayHeading - 180 + 540) % 360) - 180);
  diff0 = Math.abs(((displayHeading + 540) % 360) - 180);
  if (zero_standard) {
    if (diff180 <= 10) {     // 170~190°を180°付近とする
      if(timer === null){
        setCountdown("反転しています", false);
      }
    } else if(diff180 > 15){
      clearTimeout(timer);
      timer = null;
      clearInterval(cnt_DOWN);
      cnt_DOWN = null;
      countdown.innerHTML = "";
    }
  } else{ 
    if(diff0 <= 10 ){      // 350~10°を0°付近とする
      if(timer === null){
        setCountdown("元に戻します", true);
      }
    } else if(diff0 > 15){
      clearTimeout(timer);
      timer = null;
      clearInterval(cnt_DOWN);
      cnt_DOWN = null;
      countdown.innerHTML = "";
    }
  }
}

function setCountdown(message, nextState){
  //checkMode()の実行部分
  const startTime = Date.now();
  // 5秒後に状態切替
  timer = setTimeout(() => {
    zero_standard = nextState;
    clearInterval(cnt_DOWN);
    cnt_DOWN = null;
    timer = null;
    countdown.innerHTML = "";}, 5000);
  //表示更新
  cnt_DOWN = setInterval(() => {
    const elapsed = Date.now() - startTime;
    //2秒経過後から表示
    if (elapsed >= 2000) {
      const remain = Math.ceil((5000 - elapsed) / 1000);
      const dots = ".".repeat(Math.floor(elapsed / 250) % 4);
      countdown.innerHTML =`${message}${dots}<br>${remain}`;}}, 250);
}

document.querySelector('.ripple-btn').addEventListener('click', async function (e) {
  const button = e.currentTarget;

  // 初回クリック：8の字キャリブレーションを案内
  if (!fig8_CaliDone && !fig8_PrmptShown) {
    fig8_PrmptShown = true;
    startFig8_Det();
    return;
  }

  if (!orientationInitialized) {
    const ok = await initOrientation();
    if (!ok) { return; }
  }
  const tiltLimit = 5;
  if (Math.abs(Beta) > tiltLimit || Math.abs(Gamma) > tiltLimit) {
    tiltWarn.textContent = "スマートフォンを水平にしてください! ";
    return;
  }
  tiltWarn.textContent = "";
  baseOffset = rawHeading;
  displayHeading = 0;
  lastDiff = 0;
  fig8_CaliDone = true;
  started = true;

  updateCompass();
  button.textContent = "再キャリブレーション";
  document.querySelector(".range-switch").style.display = "flex";

  // 既存の波紋を削除
  const oldRipple = button.querySelector('.ripple');
  if (oldRipple) {
    oldRipple.remove();
  }
  //波紋要素を作成
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  //クリック(タップ)位置
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';

  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
});

/*モードの途中変更*/
document.querySelectorAll(".range-btn").forEach(button => {
  button.addEventListener("click", () => {
    selRange = Number(button.dataset.range);
    createDeg_labels();
    updateCompass();
    document.querySelectorAll(".range-btn").forEach(btn => {
      btn.classList.toggle("active", btn === button);
    });
  });
});

//扇形の範囲を描画する関数
function updateFan(fanPath, angle){
  //classList.toggle() ← cssの２つのクラスを反転させる
  fanPath.classList.toggle("fan-normal", zero_standard);
  fanPath.classList.toggle("fan-reverse", !zero_standard);
  angle = ((angle + 540) % 360) - 180;
  const size = 300; 
  const cx = size/2;
  const cy = size/2;
  const r = size/2 - 4;

  // 時計回りにしたいので符号を反転
  const rad = angle * Math.PI / 180;
  const x = cx + r * Math.sin(rad);
  const y = cy - r * Math.cos(rad);
  const largeArc =  0;
  const sweep = angle >= 0 ? 1 : 0;
  const d = `
      M ${cx} ${cy}
      L ${cx} ${cy-r}
      A ${r} ${r} 0 ${largeArc} ${sweep} ${x} ${y}
      Z
  `;
  fanPath.setAttribute("d", d);
}

const normalOutput = document.getElementById("normal-test");
const absoluteOutput = document.getElementById("absolute-test");
function formatOrientation(event, name) {
  return (
    `${name}\n` +
    `absolute: ${event.absolute}\n` +
    `alpha: ${event.alpha?.toFixed(1)}\n` +
    `beta: ${event.beta?.toFixed(1)}\n` +
    `gamma: ${event.gamma?.toFixed(1)}\n`
  );
}
window.addEventListener("deviceorientation", event => {
  normalOutput.textContent = formatOrientation(event, "通常イベント");
});
window.addEventListener("deviceorientationabsolute", event => {
  absoluteOutput.textContent = formatOrientation(event, "絶対方位イベント");
});


// 8の字運動検出用のデータ記録
const motionSamples = [];
function handleMotion(event) {
  if (!fig8_Active) return;
  const acc = event.acceleration;
  // 加速度のXYZ成分が取得できない場合
  if (acc?.x == null || acc?.y == null || acc?.z == null) {
    caliStatus.textContent = "加速度を取得できません。端末のセンサーを確認してください。";
    return;
  }
  const now = performance.now();
  // 加速度データを記録
  motionSamples.push({
    time: now,
    x: acc.x,
    y: acc.y,
    z: acc.z
  });
  // 直近4秒分のデータだけを残す
  const windowMs = 4000;
  while (motionSamples.length > 0 && now - motionSamples[0].time > windowMs){
    motionSamples.shift();
  }
  // 判定に必要な時間がたまるまでは待つ
  if (motionSamples.length < 30) {
    caliStatus.textContent = "スマートフォンを空中で8の字に動かしてください。";
  }
  const result = detectFigureEight(motionSamples);
  if (result) {
    caliStatus.textContent = "8の字らしい動きを検出しました。キャリブレーション完了!";
    finishFig8_Det();
  } else{
    caliStatus.textContent = "8の字を描くように、左右を大きくゆっくり動かしてください。";
  }
}

//方位センサーによるキャリブレーション
const headingSamples = [];
function handleOrientation_Calibrate(event) {
  if (!fig8_Active) return;
  let heading;
  if (Number.isFinite(event.webkitCompassHeading)) {
    heading = event.webkitCompassHeading;
  } else if (event.absolute === true  &&  Number.isFinite(event.alpha)){
    heading = (360 - event.alpha + 360) % 360;
  } else {
    return;
  }
  const now = performance.now();
  headingSamples.push({ time: now, heading });
  // 直近4秒分を保持
  while (headingSamples.length > 0  &&  now - headingSamples[0].time > 4000){
    headingSamples.shift();
  }
}

// 加速度の変化から8の字らしい動きを推定する
function detectFigureEight(samples) {
  // 加速度のサンプルが十分に集まっているか
  if (samples.length < 30) return false;
  const duration = samples[samples.length -1].time - samples[0].time;
  if (duration < 2500) return false;
  // X・Y方向の加速度の変化範囲
  const xs = samples.map(s => s.x);
  const ys = samples.map(s => s.y);
  const rangeX = Math.max(...xs) - Math.min(...xs);
  const rangeY = Math.max(...ys) - Math.min(...ys);
  // 方位の変化を分析
  const headingResult = analyzeHeading(headingSamples);
  if (!headingResult) return false;
  // 初期調整用の仮のしきい値
  const enuf_Rotate =  headingResult.totalRotation >= 100;
  const enuf_Rev = headingResult.reversals >= 2;
  const enuf_Move =  rangeX >= 1.0 && rangeY >= 1.0;

  //デバック表示
  debug.innerHTML =
    `rangeX: ${rangeX.toFixed(2)}<br>` +
    `rangeY: ${rangeY.toFixed(2)}<br>` +
    `changesX: ${changesX}<br>` +
    `changesY: ${changesY}<br>` +
    `totalRotation: ${totalRotation.toFixed(1)}°<br>` +
    `directionChanges: ${direct_Changes}<br>` +
    `samples: ${samples.length}`;

   return enuf_Rotate && enuf_Rev && enuf_Move;
}

function angleDifference(current, previous){
  return ((current - previous + 540) % 360) - 180;
}
function analyzeHeading(samples){
  if (samples.length < 10) return null;
  let totalRotation = 0;
  let reversals = 0;
  // 方位の連続的な変化を追跡する
  let direction = 0;
  let extreme = samples[0].heading;
  // 逆方向へ何度戻ったら切り替わりと認めるか
  const reversalThreshold = 20;
  // 小さな方位の揺れを無視する
  const deadZone = 1.5;
  let unwrappedHeading = samples[0].heading;
  for (let i=1; i<samples.length; i++) {
    const diff = angleDifference(samples[i].heading, samples[i - 1].heading);
    totalRotation += Math.abs(diff);
    unwrappedHeading += diff;
    if(Math.abs(diff) < deadZone)continue;
    const newDirection = diff > 0 ? 1 : -1;
    if(direction === 0){
      direction = newDirection;
      extreme = unwrappedHeading;
      continue;
    }
    if(direction === 1){
      // 右方向への回転中は最大値を記録
      extreme = Math.max(extreme, unwrappedHeading);
      // 最大値から十分に戻ったら反転と判定
      if(extreme-unwrappedHeading >= reversalThreshold){
        reversals++;
        direction = -1;
        extreme = unwrappedHeading;
      }
    } else{
      // 左方向への回転中は最小値を記録
      extreme = Math.min(extreme, unwrappedHeading);
      // 最小値から十分に戻ったら反転と判定
      if(unwrappedHeading-extreme >= reversalThreshold){
        reversals++;
        direction = 1;
        extreme = unwrappedHeading;
      }
    }
  }
  return {totalRotation, reversals};
}

// 加速度センサーのイベントを登録
window.addEventListener("devicemotion", handleMotion);
// 記録をリセット
function clearMotionSamples(){
  motionSamples.length = 0;
}
//8の字運動(キャリブレーション)の開始
function startFig8_Det(){
  if (fig8_Active || fig8_CaliDone) return;
  fig8_Active = true;
  // 過去のデータをリセット
  clearMotionSamples();
  headingSamples.length = 0;
  motionHitCount = 0;
  caliModal.hidden = false;
  caliStatus.textContent = "スマートフォンを空中で8の字に動かしてください。";
  //方位角の測定開始
  window.addEventListener("deviceorientationabsolute", handleOrientation_Calibrate);
}
//8の字運動(キャリブレーション)の終了
function finishFig8_Det(){
  if (!fig8_Active) return;
  fig8_Active = false;
  fig8_CaliDone = true;
  window.removeEventListener("deviceorientationabsolute", handleOrientation_Calibrate);
  caliModal.hidden = true;
}