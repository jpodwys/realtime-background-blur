class Blur {
  constructor (videoStreamTrack, canvasOutputElement) {
    this.videoStreamTrack = videoStreamTrack;
    const { width, height } = this.videoStreamTrack.getSettings();
    this.width = width;
    this.height = height;

    this.outputCanvas = canvasOutputElement;
    this.outputCtx = this.outputCanvas.getContext('2d');

    this.tempCanvas = document.createElement('canvas');
    // this.tempCanvas = new OffscreenCanvas(this.width, this.height);
    this.tempCtx = this.tempCanvas.getContext('2d');

    this.blur = true;
    this.workerCount = Math.min(4, navigator.hardwareConcurrency);
    this.threadPool = new ThreadPool();
    this.metrics = new Metrics();
  }

  async init () {
    this.imageCapture = new ImageCapture(this.videoStreamTrack);
    this.tempCanvas.width = this.width;
    this.tempCanvas.height = this.height;
    this.outputCanvas.width = this.width;
    this.outputCanvas.height = this.height;
    this.populateThreadPool();
    this.draw();
  }

  populateThreadPool () {
    for (let i = 0; i < this.workerCount; i++) {
      this.createThread();
    }
  }

  createThread () {
    const worker = new Worker('./blur-worker.js');
    const workerId = Date.now();
    worker.addEventListener('message', this.onFrame.bind(this));
    worker.postMessage({ action: 'init', payload: { workerId, width: this.width, height: this.height } });
    const thread = new Thread(workerId, worker);
    this.threadPool.addThread(thread);
  }

  onFrame (event) {
    const { frame, segmentation, frameTime, workerId } = event.data;
    const thread = this.threadPool.getThreadByWorkerId(workerId);
    thread.isBusy = false;
    if (this.blur) {
      // this.outputCtx.putImageData(frame, 0, 0);

      // https://github.com/tensorflow/tfjs/issues/5019
      // Once I can pass an OffscreenCanvas instance to `drawBokehEffect`,
      // I can move this into the worker and see if that improves performance.
      this.tempCtx.putImageData(frame, 0, 0);
      bodyPix.drawBokehEffect(this.outputCanvas, this.tempCanvas, segmentation, 5, 3);
    }
    this.metrics.trackFrame(frameTime);
  }

  toggle () {
    this.blur = !this.blur;

    if (this.blur) {
      this.metrics.start();
    } else {
      this.metrics.stop();
    }
  }

  async draw () {
    const bitmap = await this.imageCapture.grabFrame();
    if (this.blur) {
      const thread = this.threadPool.getAvailableThread();
      if (thread) {
        thread.isBusy = true;
        thread.worker.postMessage({ action: 'draw', payload: bitmap });
        this.metrics.trackHit(true);
      } else {
        this.metrics.trackMiss(false);
      }
    } else {
      this.outputCtx.drawImage(bitmap, 0, 0, this.width, this.height);
    }
    await this.draw();
  }
}
