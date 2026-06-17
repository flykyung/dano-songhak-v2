var html5QrCode = null;

function startScanner() {
  if (state.scannerRunning) return;
  if (!html5QrCode) html5QrCode = new Html5Qrcode('qr-reader');

  html5QrCode.start(
    { facingMode: 'environment' },
    {
      fps: 25,
      qrbox: function(w,h){ var s=Math.min(w,h)*0.55; return {width:s,height:s}; },
      aspectRatio: 1.0
    },
    onScanSuccess,
    function() {}
  ).then(function() {
    state.scannerRunning = true;
    setStatus('QR 코드를 스캔해 주세요');
  }).catch(function(err) {
    setStatus('카메라를 사용할 수 없습니다. 권한을 확인해 주세요.');
    console.error('Scanner error:', err);
  });
}

function stopScanner() {
  if (!html5QrCode || !state.scannerRunning) return Promise.resolve();
  return html5QrCode.stop()
    .then(function() { state.scannerRunning = false; })
    .catch(function() { state.scannerRunning = false; });
}

function onScanSuccess(decodedText) {
  var qrId = decodedText.trim();
  if (!qrId || state.isProcessing || state.phase !== 'scan') return;
  var now = Date.now();
  if (qrId === state.lastScannedId && now - state.lastScanTime < 1500) return;
  state.lastScannedId = qrId;
  state.lastScanTime  = now;
  fetchStudentInfo(qrId);
}
