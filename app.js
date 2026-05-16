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

function handleOrientation(event) {
  let heading;

  // iOS
  if (event.webkitCompassHeading) {
    heading = event.webkitCompassHeading;
  } else {
    // Android
    heading = 360 - event.alpha;
  }

  // 回転
  compass.style.transform = `rotate(${-heading}deg)`;
}