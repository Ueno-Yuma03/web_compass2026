const compass = document.querySelector(".arrow");
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
  if (event.webkitCompassHeading != null) {
    heading = event.webkitCompassHeading;
  } else if(event.alpha != null){
    // Android
    heading = 360 - event.alpha;
  } else {
    return;
  }

  // 差を正しく計算（-180〜180にする）
  let diff = heading - currentHeading;
  diff = ((diff + 180) % 360) - 180;
  
  // 微小揺れもカット
  if (Math.abs(diff) < 0.5) {
    return;
  }

  //一回に移動する角度制限
  const maxStep = 3;
  if (diff > maxStep) diff = maxStep;
  if (diff < -maxStep) diff = -maxStep;
  
  currentHeading += diff;
  compass.style.transform = `translate(-50%, -100%) rotate(${-currentHeading}deg)`;  //回転

  ang_val.textContent = `
    方角: ${heading.toFixed(1)}
    現在の方角: ${currentHeading.toFixed(1)}
    角度差: ${diff.toFixed(1)}
    `;
}