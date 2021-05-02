class BlurWorker {
  constructor (workerId, width, height) {
    this.workerId = workerId;
    this.width = width;
    this.height = height;
    this.processCanvas = new OffscreenCanvas(this.width, this.height);
    this.processCtx = this.processCanvas.getContext('2d');

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

  async draw (bitmap) {
    if (!this.model) this.model = await bodyPix.load(this.bodyPixConfig);
    const start = performance.now();
    this.processCtx.drawImage(bitmap, 0, 0, this.width, this.height);
    const frame = this.processCtx.getImageData(0, 0, this.width, this.height);
    const segmentation = await this.model.segmentPerson(frame);

    return {
      frame,
      segmentation,
      frameTime: performance.now() - start
    }
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
  const { frame, segmentation, frameTime } = await worker.draw(videoInput);
  self.postMessage({ workerId: worker.workerId, frame, segmentation, frameTime });
}

self.onmessage = ({ data }) => {
  switch (data.action) {
    case 'init': init(data.payload); break;
    case 'draw': draw(data.payload); break;
  }
}
