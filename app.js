const compass = document.querySelector(".dial");
const ang_val = document.getElementById("ang_val");
const rp_btn = document.querySelector(".ripple-btn");
const container = document.getElementById("deg_labels");
const fanPath = document.getElementById("fanPath");

let started = false;
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
  for (let deg = 0; deg < 360; deg += 30) {
    const label = document.createElement("div");
    label.className = "degreeLabel";
    label.textContent = Math.min(deg, 360 - deg) + "°";

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
  for (let i=0; i<360; i++){
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
  if (Math.abs(diff) >= 1) {
    displayHeading += diff * 0.2;
    displayHeading = (displayHeading + 360) % 360;
  }

  displayHeading += diff * 0.2;
  displayHeading = (displayHeading + 360) % 360;
  updateCompass();    //すぐに描画用
}

function updateCompass(){
  compass.style.transform =`translate(-50%, -50%) rotate(${-displayHeading}deg)`;
  const theDiff = ((rawHeading - baseOffset + 540) % 360) - 180;
  const angle = Math.abs(theDiff);
  let cls;
  if (angle < 15) {
    cls = "angle-in";
  } else {
    cls = "angle-out";
  }
  if (theDiff > 0) {
    ang_val.innerHTML = `右へ <span class="${cls}">${angle.toFixed(1)}°</span> ずれてます！`;
  } else if (theDiff < 0) {
    ang_val.innerHTML = `左へ <span class="${cls}">${angle.toFixed(1)}°</span> ずれてます！`;
  } else {
    ang_val.textContent = "ぴったりです。";
  }
  updateFan(theDiff);
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
    const size = 300; 
    const cx = size/2;
    const cy = size/2;
    const r = size/2 - 3;

    // 時計回りにしたいので符号を反転
    const rad = (angle) * Math.PI / 180;
    const x = cx + r * Math.sin(rad);
    const y = cy - r * Math.cos(rad);
    const largeArc = Math.abs(angle) > 180 ? 1 : 0;
    const sweep = angle >= 0 ? 1 : 0;
    const d = `
        M ${cx} ${cy}
        L ${cx} ${cy-r}
        A ${r} ${r} 0 ${largeArc} ${sweep} ${x} ${y}
        Z
    `;
    fanPath.setAttribute("d", d);
}
