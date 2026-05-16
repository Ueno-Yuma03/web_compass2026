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

  let diff = heading - currentHeading;
  
  // 差が大きすぎたら無視
  if (Math.abs(diff) < 50) {
    currentHeading += diff * 0.1;
  }
  // 回転
  currentHeading += (heading - currentHeading) * 0.1;
  compass.style.transform = `rotate(${-currentHeading}deg)`;

}