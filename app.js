const CHUNK_SIZE = 100; // байтов
let fileParts = [], receivedParts = [];
let totalPartsCount = 0;
let currentSendingIndex = 0;
let html5QrCode = null;

// Обработка отправки файла
document.getElementById('sendBtn').onclick = () => {
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = '*/*';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = new Uint8Array(reader.result);
      fileParts = [];
      for (let i=0; i<buffer.length; i+=CHUNK_SIZE) {
        fileParts.push(buffer.slice(i, i+CHUNK_SIZE));
      }
      totalPartsCount = fileParts.length;
      currentSendingIndex = 0;
      document.getElementById('status').innerText = `Передача: 0 / ${totalPartsCount} частей`;
      sendNextPart();
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
};

function sendNextPart() {
  if (currentSendingIndex >= fileParts.length) {
    alert('Передача завершена!');
    document.getElementById('status').innerText = 'Передача завершена!';
    return;
  }
  const part = fileParts[currentSendingIndex];
  const base64Data = btoa(String.fromCharCode.apply(null, part));
  const message = {
    index: currentSendingIndex,
    total: totalPartsCount,
    data: base64Data
  };
  document.getElementById('qrcode').innerHTML = "";
  new QRCode(document.getElementById('qrcode'), {
    text: JSON.stringify(message),
    width: 300,
    height: 300
  });
  document.getElementById('status').innerText = `Передача: ${currentSendingIndex+1}/${totalPartsCount} частей`;
  currentSendingIndex++;
  // Быстрая автоматическая передача (например, 500 мс)
  setTimeout(sendNextPart, 100);
}

// Получение файла
document.getElementById('receiveBtn').onclick = () => {
  document.getElementById('scanner').style.display = 'block';
  startScanning();
};

function startScanning() {
  document.getElementById('reader').innerHTML = '';
  html5QrCode = new Html5Qrcode("reader");
  Html5Qrcode.getCameras().then(cameras => {
    if (cameras && cameras.length) {
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        qrCodeMessage => {
          try {
            const msg = JSON.parse(qrCodeMessage);
            const { index, total, data } = msg;
            const decodedData = atob(data);
            receivedParts[index] = new Uint8Array([...decodedData].map(c => c.charCodeAt(0)));
            document.getElementById('status').innerText = `Получено: ${index+1}/${total}`;
            if (receivedParts.filter(Boolean).length === total) {
              assembleFile();
            }
          } catch(e) {
            console.error('Ошибка обработки QR', e);
          }
        },
        errorMessage => {}
      );
    } else {
      alert('Камеры не найдены');
    }
  }).catch(err => console.error('Ошибка доступа к камере', err));
}

function assembleFile() {
  const totalParts = receivedParts.length;
  const totalSize = receivedParts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (let part of receivedParts) {
    result.set(part, offset);
    offset += part.length;
  }
  const blob = new Blob([result]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'received_file';
  a.click();
  alert('Файл получен!');
  document.getElementById('scanner').style.display = 'none';
  document.getElementById('status').innerText = 'Готово!';
}
