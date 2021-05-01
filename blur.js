class Blur {
  constructor (videoStreamTrack, canvasOutputElement) {
    this.videoStreamTrack = videoStreamTrack;
    this.outputCanvas = canvasOutputElement;
    this.outputCtx = this.outputCanvas.getContext('2d');
    const { width, height } = this.videoStreamTrack.getSettings();
    this.width = width;
    this.height = height;
    this.blur = true;
    this.workerCount = Math.min(12, navigator.hardwareConcurrency);
    this.threadPool = new ThreadPool();
    this.metrics = new Metrics();
  }

  async init () {
    this.imageCapture = new ImageCapture(this.videoStreamTrack);
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

  onFrame ({ data }) {
    if (this.blur) {
      this.outputCtx.putImageData(data.frame, 0, 0);
    }
    const thread = this.threadPool.getThreadByWorkerId(data.workerId);
    thread.isBusy = false;
    this.metrics.trackFrame(data.frameTime);
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
        this.metrics.trackHit(true);
        thread.isBusy = true;
        thread.worker.postMessage({ action: 'draw', payload: bitmap }, [ bitmap ]);
      } else {
        this.metrics.trackMiss(false);
      }
    } else {
      this.outputCtx.drawImage(bitmap, 0, 0, this.width, this.height);
    }
    await this.draw();
  }
}
