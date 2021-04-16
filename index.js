const { Writable } = require('stream');
const portAudio = require('naudiodon');
const usb = require('usb');

const DEVICE_ID = 2;
const AMPLITUDE = 0.25;
const HIGHWATER_MARK = 16; // controls buffer size

const audioIn = new portAudio.AudioIO({
  inOptions: {
    channelCount: 1,
    sampleFormat: 8,
    sampleRate: 22050,
    deviceId: DEVICE_ID,
    highwaterMark: HIGHWATER_MARK,
    closeOnError: true,
  }
});

const trv = usb.findByIds(0x0b49, 0x064f);
if (!trv) {
  throw "No transvibrator found.";
} else {
  trv.open();
  console.log("Transvibrator initialized.");
}

process.on('SIGINT', () => {
  console.log('Received SIGINT. Stopping recording.');
  audioIn.quit();
  process.exit(0);
});

const buf = new Buffer([]);
const consumer = new Writable({
  write(data, _encoding, callback) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data.readInt8(i) ** 2;
    }
    // --- 0 - 255 value
    const value = Math.min(Math.floor(sum / data.length) * AMPLITUDE, 255);
    trv.controlTransfer(65, 1, value, 0, buf);
    // --- 0 - 15 value
    const visualizerValue = Math.floor(value / 16);
    console.log('*'.repeat(visualizerValue) + ".".repeat(15 - visualizerValue));
    callback();
  }
});

audioIn.pipe(consumer);
audioIn.start();
