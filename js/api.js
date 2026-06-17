function callGAS(payload) {
  return new Promise(function(resolve, reject) {
    var cbName = 'gasCallback_' + Date.now();
    var params = new URLSearchParams({ action: payload.action });
    Object.keys(payload).forEach(function(k) {
      if (k !== 'action') params.append(k, payload[k]);
    });
    params.append('callback', cbName);

    window[cbName] = function(data) {
      delete window[cbName];
      var el = document.getElementById(cbName);
      if (el) el.remove();
      resolve(data);
    };

    var script = document.createElement('script');
    script.id  = cbName;
    script.src = GAS_URL + '?' + params.toString();
    script.onerror = function() {
      delete window[cbName];
      script.remove();
      reject(new Error('GAS 서버와 통신할 수 없습니다.'));
    };
    document.head.appendChild(script);
  });
}
