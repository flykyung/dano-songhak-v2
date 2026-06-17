function goToMenu() {
  stopScanner().then(function() {
    state.phase = 'menu'; state.modeKey = null; state.boothKey = null;
    state.txConfig = null; state.qrId = null; state.student = null;
    state.lastScannedId = ''; state.lastScanTime = 0;

    document.getElementById('menuScreen').classList.add('active');
    document.getElementById('sessionScreen').classList.remove('active');

    ['scannerSection','studentCard','txForm','boothPickWrap',
     'checkBalanceCard','checkButtons'].forEach(function(id){ showEl(id, false); });

    document.querySelectorAll('.booth-pill').forEach(function(p){ p.classList.remove('selected'); });
    resetTxForm();
    document.getElementById('headerSubtitle').textContent = '거래 유형을 선택해 주세요';
    setStatus('거래 유형을 선택해 주세요');
  });
}

function enterMode(modeKey) {
  state.modeKey = modeKey;
  state.phase   = (modeKey === 'spend') ? 'boothPick' : 'scan';
  state.qrId    = null; state.student = null;
  state.lastScannedId = ''; state.lastScanTime = 0;

  document.getElementById('menuScreen').classList.remove('active');
  document.getElementById('sessionScreen').classList.add('active');

  var mode = MODES[modeKey];
  document.getElementById('modeBanner').className       = 'mode-banner ' + mode.bannerClass;
  document.getElementById('modeBannerText').textContent = mode.banner;
  document.getElementById('headerSubtitle').textContent = mode.subtitle;

  showEl('studentCard',      false);
  showEl('txForm',           false);
  showEl('checkBalanceCard', false);
  showEl('checkButtons',     false);
  resetTxForm();

  if (modeKey === 'spend') {
    showEl('boothPickWrap',  true);
    showEl('scannerSection', false);
    setStatus('체험을 선택해 주세요');
  } else {
    showEl('boothPickWrap',  false);
    revealScanner();
  }
}

function selectBooth(boothKey) {
  state.boothKey = boothKey;
  state.phase    = 'scan';
  state.qrId     = null; state.student = null;
  state.lastScannedId = ''; state.lastScanTime = 0;
  revealScanner();
}

function revealScanner() {
  showEl('scannerSection',   true);
  showEl('studentCard',      false);
  showEl('txForm',           false);
  showEl('checkBalanceCard', false);
  showEl('checkButtons',     false);
  resetTxForm();
  startScanner();
}

function fetchStudentInfo(qrId) {
  state.isProcessing = true;
  showLoading(true);
  setStatus('학생 정보 조회 중...');

  callGAS({ action: 'getStudentInfo', qrId: qrId })
    .then(function(res) {
      showLoading(false);
      state.isProcessing = false;

      if (!res || !res.success) {
        showModal(false, '조회 실패', (res && res.error) || '학생 정보를 불러올 수 없습니다.');
        setStatus('QR 코드를 다시 스캔해 주세요');
        return;
      }

      state.qrId    = res.qrId;
      state.student = res;
      stopScanner();
      showEl('scannerSection', false);

      if (state.modeKey === 'check') {
        enterCheckPhase(res);
      } else {
        enterPayPhase(res);
      }
    })
    .catch(function(err) {
      showLoading(false);
      state.isProcessing = false;
      showModal(false, '통신 오류', err.message || '서버와 통신할 수 없습니다.');
      setStatus('QR 코드를 다시 스캔해 주세요');
    });
}

function enterCheckPhase(info) {
  state.phase = 'checkResult';
  showEl('studentCard',      true);
  showEl('checkBalanceCard', true);
  showEl('checkButtons',     true);
  showEl('txForm',           false);

  renderStudentInfo(info.name, String(info.grade));
  document.getElementById('studentBalance').textContent = fmt(info.balance);
  document.getElementById('checkAmount').textContent    = fmt(info.balance);
  setStatus(info.name + ' 학생의 잔액을 확인했습니다');
}

function enterPayPhase(info) {
  state.phase = 'pay';
  showEl('studentCard',      true);
  showEl('txForm',           true);
  showEl('checkBalanceCard', false);
  showEl('checkButtons',     false);

  renderStudentInfo(info.name, String(info.grade));
  document.getElementById('studentBalance').textContent = fmt(info.balance);

  resetTxForm();

  if (state.modeKey === 'earn') {
    var badge = document.getElementById('txTypeBadge');
    badge.textContent = '💰 적립'; badge.className = 'tx-type-badge earn';
    document.getElementById('txBoothLabel').textContent = '퀴즈를 맞추면 적립!';
    showEl('amountWrap', true);
    setStatus(info.name + ' 학생 — 금액과 PIN을 입력하세요');

  } else if (state.boothKey === 'soap') {
    var badge = document.getElementById('txTypeBadge');
    badge.textContent = '🧼 창포비누'; badge.className = 'tx-type-badge spend';
    document.getElementById('txBoothLabel').textContent = '창포비누 (1단오 차감)';
    showEl('fixedAmountWrap', true);

    if (info.soapDone) {
      showEl('duplicateWarning', true);
      showEl('pinWrap',          false);
      document.getElementById('btnExecute').dataset.forceDisabled = 'true';
      document.getElementById('btnExecute').disabled = true;
      setStatus(info.name + ' 학생 — 이미 창포비누에 참여했습니다');
    } else {
      setStatus(info.name + ' 학생 — PIN을 입력하세요');
    }

  } else if (state.boothKey === 'market') {
    var badge = document.getElementById('txTypeBadge');
    badge.textContent = '🛒 작은마켓'; badge.className = 'tx-type-badge spend';
    document.getElementById('txBoothLabel').textContent = '작은마켓 (1단오 차감)';
    showEl('marketAmountWrap', true);
    setStatus(info.name + ' 학생 — PIN을 입력하세요');

  } else if (state.boothKey === 'food') {
    var badge = document.getElementById('txTypeBadge');
    badge.textContent = '🍡 음식 체험'; badge.className = 'tx-type-badge spend';
    document.getElementById('txBoothLabel').textContent = '음식 체험';
    showEl('foodSelectWrap', true);

    var sel = document.getElementById('foodSelect');
    Array.from(sel.options).forEach(function(opt) {
      if (opt.value === 'rice')  opt.disabled = !!info.riceDone;
      if (opt.value === 'punch') opt.disabled = !!info.punchDone;
    });
    setStatus(info.name + ' 학생 — 메뉴를 선택하고 PIN을 입력하세요');
  }

  updateExecuteButton();
}

function executeTransaction() {
  if (!state.qrId) return;

  var pin = document.getElementById('pinInput').value;
  if (!pin) { showModal(false, '입력 오류', '관리자 PIN을 입력해 주세요.'); return; }

  var amount = 0, desc = '', boothKey = '';

  if (state.modeKey === 'earn') {
    amount   = Number(document.getElementById('amountInput').value);
    desc     = '퀴즈 적립';
    boothKey = '';
    if (!amount || amount <= 0) {
      showModal(false, '입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
  } else if (state.boothKey === 'soap') {
    amount   = 1;
    desc     = '창포비누';
    boothKey = 'soap';
  } else if (state.boothKey === 'market') {
    amount   = 1;
    desc     = '작은마켓';
    boothKey = '';
  } else if (state.boothKey === 'food') {
    var sel = document.getElementById('foodSelect');
    var opt = sel.options[sel.selectedIndex];
    if (!sel.value) { showModal(false, '입력 오류', '메뉴를 선택해 주세요.'); return; }
    amount   = Number(opt.dataset.amount);
    boothKey = opt.dataset.key;
    desc     = opt.text.split('(')[0].trim();
  }

  var txType = (state.modeKey === 'earn') ? '적립' : '차감';

  state.isProcessing = true;
  document.getElementById('btnExecute').disabled = true;
  showLoading(true);
  setStatus('거래 처리 중...');

  callGAS({
    action:      'processTransaction',
    qrId:        state.qrId,
    type:        txType,
    amount:      amount,
    description: desc,
    pin:         pin,
    boothKey:    boothKey
  })
    .then(function(res) {
      showLoading(false);
      state.isProcessing = false;

      if (!res || !res.success) {
        showModal(false, '거래 실패', (res && res.error) || '거래를 처리할 수 없습니다.');
        updateExecuteButton();
        return;
      }

      var msg = res.message + '\n현재 잔액: ' + fmt(res.balance) + '단오';
      showModal(true, '거래 완료', msg, function() { goToMenu(); });
    })
    .catch(function(err) {
      showLoading(false);
      state.isProcessing = false;
      showModal(false, '통신 오류', err.message || '서버와 통신할 수 없습니다.');
      updateExecuteButton();
    });
}

function rescanStudent() {
  state.qrId = null; state.student = null;
  state.lastScannedId = ''; state.lastScanTime = 0;
  state.phase = 'scan';
  showEl('studentCard',      false);
  showEl('txForm',           false);
  showEl('checkBalanceCard', false);
  showEl('checkButtons',     false);
  resetTxForm();
  revealScanner();
}

document.addEventListener('DOMContentLoaded', function() {
  resultModal = new bootstrap.Modal(document.getElementById('resultModal'));

  document.querySelectorAll('.btn-mode').forEach(function(btn) {
    btn.addEventListener('click', function() { enterMode(btn.dataset.mode); });
  });

  document.querySelectorAll('.booth-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      document.querySelectorAll('.booth-pill').forEach(function(p) { p.classList.remove('selected'); });
      pill.classList.add('selected');
      selectBooth(pill.dataset.booth);
    });
  });

  document.getElementById('foodSelect').addEventListener('change', updateExecuteButton);
  document.getElementById('amountInput').addEventListener('input', updateExecuteButton);
  document.getElementById('pinInput').addEventListener('input', updateExecuteButton);
  document.getElementById('btnExecute').addEventListener('click', executeTransaction);
  document.getElementById('btnRescan').addEventListener('click', rescanStudent);
  document.getElementById('btnCheckRescan').addEventListener('click', rescanStudent);
  document.getElementById('btnBackMenu').addEventListener('click', goToMenu);
});
