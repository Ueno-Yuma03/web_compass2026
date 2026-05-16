const compass = document.getElementById("compass");
const startBtn = document.getElementById("start");
const ang_val = document.getElementById("ang_val");

startBtn.addEventListener("click", () => {

  // iOS対応（許可が必要）
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        }
      })
      .catch(console.error);
  } else {
    // Androidなど
    window.addEventListener("deviceorientation", handleOrientation);
  }

});

let currentHeading = 0;

function handleOrientation(event) {
  let heading;

  // iOS
  if (event.webkitCompassHeading) {
    heading = event.webkitCompassHeading;
  } else {
    // Android
    heading = 360 - event.alpha;
  }

  // 差を正しく計算（-180〜180にする）
  let diff = heading - currentHeading;
  diff = ((diff + 540) % 360) - 180;
  
  
  // 異常値カット
  if (Math.abs(diff) > 90) {
    return; // 無視
  }

  // 微小揺れもカット
  if (Math.abs(diff) < 1) {
    return;
  }

  // 差が大きすぎたら無視
  if (Math.abs(diff) < 40) {
    currentHeading += diff * 0.1;
  }
  
  currentHeading += (heading - currentHeading) * 0.1;           //滑らかに
  compass.style.transform = `rotate(${-currentHeading}deg)`;    //回転

  ang_val.textContent = `
    方角: ${heading.toFixed(1)}
    現在の方角: ${currentHeading.toFixed(1)}
    角度差: ${diff.toFixed(1)}
    `;
}