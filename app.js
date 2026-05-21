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
let lastDiff = 0;
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

  // 差を正しく計算（-180〜180にする）
  let diff = heading - currentHeading;
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
  
  currentHeading += diff * 0.2;
  currentHeading = (currentHeading + 360) % 360;
  compass.style.transform = `translate(-50%, -100%) rotate(${-currentHeading}deg)`;  //回転

  ang_val.textContent = `
    方角: ${heading.toFixed(1)}
    現在の角度: ${currentHeading.toFixed(1)}
    角度差: ${diff.toFixed(1)}
    `;
}