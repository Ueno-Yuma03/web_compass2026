const compass = document.getElementById("compass");
const startBtn = document.getElementById("start");

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
  
  // 差が大きすぎたら無視
  if (Math.abs(diff) < 40) {
    currentHeading += diff * 0.1;
  }
  currentHeading += (heading - currentHeading) * 0.1;           //滑らかに
  compass.style.transform = `rotate(${-currentHeading}deg)`;    //回転
}