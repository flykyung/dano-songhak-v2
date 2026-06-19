var resultModal = null;

function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }
function setStatus(msg) { document.getElementById('statusBar').textContent = msg; }
function showLoading(v) { document.getElementById('loadingOverlay').classList.toggle('show', v); }
function showEl(id, v)  { document.getElementById(id).style.display = v ? '' : 'none'; }

function renderStudentInfo(name, grade) {
  var el = document.getElementById('studentInfoLine');
  el.innerHTML = '<strong>' + name + '</strong>'
    + ' <span class="student-info-grade-text">/ ' + grade + '학년</span>';
}

function showModal(isOk, title, msg, onClose) {
  document.getElementById('modalIcon').className = 'modal-icon ' + (isOk ? 'success' : 'error');
  document.getElementById('modalIcon').innerHTML = isOk
    ? '<i class="bi bi-check-circle-fill"></i>'
    : '<i class="bi bi-x-circle-fill"></i>';
  document.getElementById('modalTitle').textContent   = title;
  document.getElementById('modalMessage').textContent = msg;
  var el = document.getElementById('resultModal');
  if (onClose) {
    el.addEventListener('hidden.bs.modal', function h() {
      el.removeEventListener('hidden.bs.modal', h);
      onClose();
    });
  }
  resultModal.show();
}

function updateExecuteButton() {
  var pinOk    = document.getElementById('pinInput').value.length > 0;
  var disabled = document.getElementById('btnExecute').dataset.forceDisabled === 'true';
  if (disabled) { document.getElementById('btnExecute').disabled = true; return; }

  var modeReady = false;
  if (state.modeKey === 'earn') {
    modeReady = Number(document.getElementById('amountInput').value) > 0;
  } else if (state.boothKey === 'soap') {
    modeReady = true;
  } else if (state.boothKey === 'market') {
  modeReady = Number(document.getElementById('marketAmountInput').value) > 0;
  } else if (state.boothKey === 'food') {
    modeReady = document.getElementById('foodSelect').value !== '';
  }

  document.getElementById('btnExecute').disabled = !(pinOk && modeReady && state.qrId);
}

function resetTxForm() {
  document.getElementById('amountInput').value = '';
  document.getElementById('marketAmountInput').value = '';
  document.getElementById('pinInput').value    = '';
  document.getElementById('foodSelect').value  = '';
  showEl('duplicateWarning', false);
  showEl('fixedAmountWrap',  false);
  showEl('marketAmountWrap', false);
  showEl('foodSelectWrap',   false);
  showEl('amountWrap',       false);
  showEl('pinWrap',          true);
  document.getElementById('btnExecute').dataset.forceDisabled = 'false';
  updateExecuteButton();
}
