class BlurWorker {
  constructor (width, height) {
    this.width = width;
    this.height = height;
    this.processCanvas = new OffscreenCanvas(this.width, this.height);
    this.processCtx = this.processCanvas.getContext('2d');
    this.tempCanvas = new OffscreenCanvas(this.width, this.height);
    this.tempCtx = this.tempCanvas.getContext('2d');

    this.bodyPixConfig = {
      architechture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.5,
      quantBytes: 2
    };

    this.segmentationConfig = {
      internalResolution: 'medium',
      segmentationThreshold: 0.7,
      scoreThreshold: 1
    };
  }

  async draw ({ bitmap, backgroundBlurAmount, edgeBlurAmount }) {
    if (!this.model) this.model = await bodyPix.load(this.bodyPixConfig);
    const start = performance.now();
    this.processCtx.drawImage(bitmap, 0, 0, this.width, this.height);
    const frame = this.processCtx.getImageData(0, 0, this.width, this.height);
    const segmentation = await this.model.segmentPerson(frame);
    bodyPix.drawBokehEffect(this.tempCanvas, this.processCanvas, segmentation, backgroundBlurAmount, edgeBlurAmount, true);

    return {
      frame: this.tempCtx.getImageData(0, 0, this.width, this.height),
      frameTime: performance.now() - start
    }
  }
}

self.importScripts(
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.6.0',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0'
);

let worker;

const init = async ({ width, height }) => {
  worker = new BlurWorker(width, height);
  self.postMessage({});
}

const draw = async (payload) => {
  const { frame, frameTime } = await worker.draw(payload);
  self.postMessage({ frame, frameTime });
}

self.onmessage = ({ data }) => {
  switch (data.action) {
    case 'init': init(data.payload); break;
    case 'draw': draw(data.payload); break;
  }
}
