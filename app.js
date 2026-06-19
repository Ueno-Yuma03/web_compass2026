const compass = document.querySelector(".dial");
const ang_val = document.getElementById("ang_val");
const rp_btn = document.querySelector(".ripple-btn");
const container = document.getElementById("deg_labels");

let lastDiff = 0;
let baseHeading = 0;
let baseOffset = 0;
let rawHeading = 0;
let displayHeading = (rawHeading - baseOffset + 360) % 360;

window.addEventListener("load", () => {
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
  const container = document.createElement("div");
  container.id = "deg_labels";
  dial.appendChild(container);

  const r = dial.offsetWidth * 0.67;
  const degree = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 270, 285, 300, 315, 330, 345];
  degree.forEach(deg =>{
    const label = document.createElement("div");
    label.className = "degreeLabel";
    label.textContent = deg + "°";

    const rad = (deg - 90) * Math.PI / 180;
    const x = 50 + (r * Math.cos(rad) / dial.offsetWidth * 100);
    const y = 50 + (r * Math.sin(rad) / dial.offsetWidth * 100);
    label.style.left = x + "%";
    label.style.top = y + "%";

    container.appendChild(label);
  })
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
  compass.style.transform = `translate(-50%, -50%) rotate(${-displayHeading}deg)`;

  if (diff > 0) {
    ang_val.textContent = `右へ ${diff.toFixed(1)}°ずれてます！`;
  } else if (diff < 0) {
    ang_val.textContent = `左へ ${Math.abs(diff).toFixed(1)}°ずれてます！`;
  } else {
    ang_val.textContent = "ぴったりです。";
  }
}

function updateCompass(){
  compass.style.transform =`translate(-50%, -50%) rotate(${-displayHeading}deg)`;
  ang_val.textContent = `
    方角:${rawHeading.toFixed(1)}
    現在の角度:${displayHeading.toFixed(1)}
  `;
}

document.querySelector('.ripple-btn').addEventListener('click', function (e) {
  const button = e.currentTarget;
  baseOffset = rawHeading;
  displayHeading = 0;
  lastDiff = 0;
  updateCompass();
  
  // 既存の波紋を削除
  const oldRipple = button.querySelector('.ripple');
  if (oldRipple) {
    oldRipple.remove();
  }

  //波紋要素を作成
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');

  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 0.5;
  ripple.style.width = ripple.style.height = size + 'px';

  //クリック(タップ)位置
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';

  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);

  //線の描画
  //残っている場合、線を消す
  document.querySelectorAll('.fan').forEach(l => l.remove());
  const cirarea = document.querySelector('.dial');
  const fan = document.createElement('div');
  fan.classList.add('fan');

  // 常に北方向（0°）なので回転なし
  fan.style.transform = `translate(-50%, -50%) rotate(0deg)`;
  cirarea.appendChild(fan);
});
