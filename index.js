const { Writable } = require('stream');
const portAudio = require('naudiodon');
const usb = require('usb');

const DEVICE_ID = 2;
const AMPLITUDE = 3;
const SAMPLE_RATE = 4000;
const HIGHWATER_MARK = 32; // controls buffer size

const DEBUG = false;

const audioIn = new portAudio.AudioIO({
  inOptions: {
    channelCount: 1,
    sampleFormat: 8,
    sampleRate: SAMPLE_RATE,
    deviceId: DEVICE_ID,
    highwaterMark: HIGHWATER_MARK,
    closeOnError: true,
  }
});

const trvOut = (() => {
  const trv = usb.findByIds(0x0b49, 0x064f);
  if (!trv) {
    console.log("WARNING: NO TRANCEVIBRATOR FOUND");
  } else {
    trv.open();
    console.log("Trancevibrator initialized.");
  }

  const buf = Buffer.alloc(0);
  return new Writable({
    write(data, _encoding, callback) {
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += Math.abs(data.readInt8(i));
      }
      // --- 0 - 255 value
      const value = Math.min(Math.floor(sum / data.length * AMPLITUDE), 255);
      if (trv) {
        trv.controlTransfer(65, 1, value, 0, buf);
      }
      if (DEBUG) {
        // --- 0 - 63 value
        const visualizerValue = Math.floor(value / 4);
        process.stdout.write(`${'#'.repeat(visualizerValue)}${'.'.repeat(63 - visualizerValue)}\n`);
      }
      callback();
    }
  });
})();

console.log('Send SIGINT (Ctrl-C) to quit.');
process.on('SIGINT', () => {
  console.log('Received SIGINT. Stopping.');
  audioIn.quit();
  process.exit(0);
});

audioIn.pipe(trvOut);
audioIn.start();
