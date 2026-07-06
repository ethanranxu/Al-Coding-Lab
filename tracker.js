(function() {
  // 获取当前页面名称/路径
  const pagePath = window.location.pathname.split('/').pop() || 'index.html';
  const startTime = Date.now();
  let clientIP = '127.0.0.1'; // 默认值

  // 获取访问时间格式化
  function getFormattedTime() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  // 异步获取 IP
  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => {
      if (data && data.ip) {
        clientIP = data.ip;
      }
    })
    .catch(() => {
      // 备选 API
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.ip) clientIP = data.ip;
        })
        .catch(() => {
          clientIP = '127.0.0.1';
        });
    });

  // 保存日志的逻辑
  function saveLog() {
    // 避免重复记录（利用 sessionStorage 做锁，防止 visibilitychange 和 beforeunload 在单次访问中重复触发）
    const logSavedKey = `log_saved_${pagePath}_${startTime}`;
    if (sessionStorage.getItem(logSavedKey)) return;
    sessionStorage.setItem(logSavedKey, 'true');

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);
    
    // 仅记录停留时间大于等于 1 秒的访问，过滤掉极速离开的偶发重定向/预加载
    if (durationSeconds < 1) return;

    const logEntry = {
      ip: clientIP,
      page: pagePath,
      time: getFormattedTime(),
      duration: durationSeconds
    };

    try {
      let logs = JSON.parse(localStorage.getItem('visit_logs') || '[]');
      // 限制日志最大数量为 1000 条，防止本地存储超限
      if (logs.length >= 1000) {
        logs.shift();
      }
      logs.push(logEntry);
      localStorage.setItem('visit_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save visit log', e);
    }
  }

  // 监听页面关闭/不可见事件以保存日志
  window.addEventListener('beforeunload', saveLog);
  window.addEventListener('pagehide', saveLog);
})();
