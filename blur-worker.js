class BlurWorker {
  constructor (workerId, width, height) {
    this.workerId = workerId;
    this.width = width;
    this.height = height;
    this.processCanvas = new OffscreenCanvas(this.width, this.height);
    this.processCtx = this.processCanvas.getContext('2d');
    this.blurCanvas = new OffscreenCanvas(this.width, this.height);
    this.blurCtx = this.blurCanvas.getContext('2d');
    this.blurCtx.filter = 'blur(15px)';
    this.outputCanvas = new OffscreenCanvas(this.width, this.height);
    this.outputCtx = this.outputCanvas.getContext('2d');

    this.bodyPixConfig = {
      architechture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 1,
      quantBytes: 4
    };

    this.segmentationConfig = {
      internalResolution: 1,
      segmentationThreshold: 0.8,
      scoreThreshold: 1
    };
  }

  async draw (videoInput) {
    if (!this.model) this.model = await bodyPix.load(this.bodyPixConfig);
    this.processCtx.drawImage(videoInput, 0, 0, this.width, this.height);
    const rawFrame = this.processCtx.getImageData(0, 0, this.width, this.height);
    const { data } = await this.model.segmentPerson(rawFrame);
    this.blurCtx.drawImage(this.processCanvas, 0, 0);
    const blurFrame = this.blurCtx.getImageData(0, 0, this.width, this.height);
    const outputFrame = this.outputCtx.getImageData(0, 0, this.width, this.height);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const n = x + (y * this.width);
        const frame = data[n] === 0 ? blurFrame : rawFrame;
        outputFrame.data[n * 4] = frame.data[n * 4]; //R
        outputFrame.data[n * 4 + 1] = frame.data[n * 4 + 1]; //G
        outputFrame.data[n * 4 + 2] = frame.data[n * 4 + 2]; //B
        outputFrame.data[n * 4 + 3] = frame.data[n * 4 + 3]; //A
      }
    }
    return outputFrame;
  }
}

self.importScripts(
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0'
);

let worker;

const init = async ({ workerId, width, height }) => {
  worker = new BlurWorker(workerId, width, height);
}

const draw = async (videoInput) => {
  worker.draw(videoInput).then((frame) => self.postMessage({ workerId: worker.workerId, frame }));
}

self.onmessage = (event) => {
  switch (event.data.action) {
    case 'init': init(event.data.payload); break;
    case 'draw': draw(event.data.payload); break;
  }
}
