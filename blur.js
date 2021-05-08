class Blur {
  constructor (videoStreamTrack, canvasOutputElement, metricsOutputElement) {
    this.videoStreamTrack = videoStreamTrack;
    this.outputCanvas = canvasOutputElement;
    this.outputCtx = this.outputCanvas.getContext('2d');
    const { width, height } = this.videoStreamTrack.getSettings();
    this.width = width;
    this.height = height;
    this.blur = true;
    this.workerCount = Math.min(3, navigator.hardwareConcurrency);
    this.backgroundBlurAmount = 8;
    this.edgeBlurAmount = 15;
    this.threadPool = new ThreadPool();
    this.metrics = new Metrics(metricsOutputElement);
    this.firstFrameReached = false;
  }

  async init () {
    this.imageCapture = new ImageCapture(this.videoStreamTrack);
    this.outputCanvas.width = this.width;
    this.outputCanvas.height = this.height;
    this.populateThreadPool();
    this.draw();
    setTimeout(() => this.metrics.start(), 5000);
  }

  populateThreadPool () {
    for (let i = 0; i < this.workerCount; i++) {
      this.createThread();
    }
  }

  createThread () {
    const worker = new Worker('./blur-worker.js');
    const thread = new Thread(worker);
    thread.postMessage({
      action: 'init',
      payload: { width: this.width, height: this.height }
    });
    this.threadPool.addThread(thread);
  }

  onFrame (event) {
    const { frame, frameTime } = event.data;
    if (this.blur) {
      this.outputCtx.putImageData(frame, 0, 0);
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
        thread.postMessage({
          action: 'draw',
          payload: {
            bitmap,
            backgroundBlurAmount: this.backgroundBlurAmount,
            edgeBlurAmount: this.edgeBlurAmount
          }
        })
        .then((event) => this.onFrame(event));
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
