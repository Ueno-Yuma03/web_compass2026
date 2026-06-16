const compass = document.querySelector(".dial");
const ang_val = document.getElementById("ang_val");
const rp_btn = document.querySelector(".ripple-btn");

let lastDiff = 0;
let currentHeading = 0;
let baseHeading = 0;
let baseOffset = 0;
let rawHeading = 0;

window.addEventListener("load", initOrientation);
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

  //補正(キャリブレーション用)
  let corrected = (heading - baseOffset + 360) % 360;

  // 差を正しく計算（-180〜180にする）(javascriptは"%"の仕様で負の値を認識できない)
  let diff = corrected - currentHeading;
  diff = ((diff + 540) % 360) - 180;
  
  // 微小揺れもカット
  if (Math.abs(diff) < 1) {
    return;
  }

  //方向ロック
  if (Math.sign(diff) !== Math.sign(lastDiff) && Math.abs(diff) < 10) {
    diff = lastDiff;
  }
  lastDiff = diff;

  currentHeading += diff * 0.12;
  currentHeading = (currentHeading + 360) % 360;
  compass.style.transform = `translate(-50%, -50%) rotate(${-corrected}deg)`;

  ang_val.textContent = `
    方角: ${heading.toFixed(1)}
    現在の角度: ${currentHeading.toFixed(1)}
    角度差: ${diff.toFixed(1)}
    `;
}

document.querySelector('.ripple-btn').addEventListener('click', function (e) {
  const button = e.currentTarget;
  baseOffset = rawHeading;
  currentHeading = 0;
  lastDiff = 0;
  
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
  document.querySelectorAll('.line').forEach(l => l.remove());
  const cirarea = document.querySelector('.dial');
  const line = document.createElement('div');
  line.classList.add('line');

  // 常に北方向（0°）なので回転なし
  line.style.transform = `translate(-50%, -100%) rotate(0deg)`;
  cirarea.appendChild(line);

  // currentHeadingの方向に回転
  /*line.style.transform = `translate(-50%, -100%) rotate(${diffAngle}deg)`;
  cirarea.appendChild(line);
  line.update();*/
});