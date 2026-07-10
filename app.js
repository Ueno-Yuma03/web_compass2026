const compass = document.querySelector(".dial");
const ang_val = document.getElementById("ang_val");
const rp_btn = document.querySelector(".ripple-btn");
const container = document.getElementById("deg_labels");
const fanPath = document.getElementById("fanPath");
const debug = document.getElementById("debug");
const countdown = document.getElementById("countdown");

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

window.addEventListener("load", () => {
    createTicks();
    createDeg_labels();
    initOrientation();
});

function initOrientation() {

  //iOS判定（許可が必要な場合）
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    //iOS → 許可を要求
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {

        if (permissionState === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else {
          ang_val.textContent = "センサーの許可が必要です";
        }
      })
      .catch(console.error);

  } else {
    // Android → そのまま開始
    window.addEventListener("deviceorientation", handleOrientation);
  }
}

function createDeg_labels(){
  const dial = document.querySelector(".dial");
  const container = document.getElementById("deg_labels");
  container.innerHTML = "";
  dial.appendChild(container);
  const r = dial.offsetWidth * 0.72;
  for (let deg = 0; deg < 360; deg += 60) {
    const label = document.createElement("div");
    label.className = "degreeLabel";
    label.textContent = Math.min(deg/4, 90 - deg/4) + "°";

    const rad = (deg - 90) * Math.PI / 180;
    const x = 50 + (r * Math.cos(rad) / dial.offsetWidth * 100);
    const y = 50 + (r * Math.sin(rad) / dial.offsetWidth * 100);
    label.style.left = x + "%";
    label.style.top = y + "%";

    container.appendChild(label);
  }
}

//svgを用いた一目盛りのコード
function createTicks(){
  const svg = document.querySelector(".ticks");
  for (let i=0; i<360; i+=4){
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    //長さの設定
    const size = 300;
    const cx = size/2;
    const cy = size/2;
    if(i % 15 === 0){
      r1 = 148;
      r2 = 132;
    }
    else if(i % 5 === 0){
      r1 = 148;
      r2 = 135;
    }
    else{
      r1 = 148;
      r2 = 140;
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
}

function handleOrientation(event) {
  let heading;

  // iOS
  if (event.webkitCompassHeading != null) {
    heading = event.webkitCompassHeading;
  } else if(event.absolute === true && event.alpha != null){
    // Android
    heading = (360 - event.alpha) % 360;
  } else if(event.alpha != null){
    heading = (360 - event.alpha) % 360;
  } else {
    return;
  }

  rawHeading = heading;
  //ボタンを押すまで待機
  if(!started){
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
  const range = 45;       //円一周分にしたい角度
  let heading;
  if (zero_standard) {
    heading = ((displayHeading + 540) % 360) - 180;
  }else{
    heading = ((displayHeading - 180 + 540) % 360) - 180;
  }
  const limitHeading = Math.max(-range, Math.min(range, heading));
  let visualHeading = limitHeading * 180 / range;
  compass.style.transform = `translate(-50%, -50%) rotate(${-visualHeading}deg)`;

  const theDiff = ((rawHeading - baseOffset + 540) % 360) - 180;
  const angle = Math.abs(theDiff).toFixed(1);
  if (theDiff > 0) {
    ang_val.innerHTML = `右へ <span class="angle">${angle}°</span> ずれてます！`;
  } else if (theDiff < 0) {
    ang_val.innerHTML = `左へ <span class="angle">${angle}°</span> ずれてます！`;
  } else {
    ang_val.textContent = "ぴったりです。";
  }
  debug.innerHTML =
        `zero = ${zero_standard}<br>` +
        `display = ${displayHeading.toFixed(1)}<br>`+
        `visual = ${visualHeading.toFixed(1)}<br>`+
        `limit = ${limitHeading.toFixed(1)}<br>`+
        `diff180 = ${diff180.toFixed(1)}<br>`+
        `diff0 = ${diff0.toFixed(1)}<br>`+
        `timer = ${timer === null ? "null" : "running"}`;
  updateFan(visualHeading);
}

function checkMode(){
  // 180°付近に5秒以上いたら基準の反転
  /*const*/ diff180 = Math.abs(((displayHeading - 180 + 540) % 360) - 180);
  /*const*/ diff0 = Math.abs(((displayHeading + 540) % 360) - 180);
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

document.querySelector('.ripple-btn').addEventListener('click', function (e) {
  const button = e.currentTarget;
  started = true;

  baseOffset = rawHeading;
  displayHeading = 0;
  lastDiff = 0;
  updateCompass();
  button.textContent = "再キャリブレーション";
  
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

//扇形の範囲を描画する関数
function updateFan(angle){
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
