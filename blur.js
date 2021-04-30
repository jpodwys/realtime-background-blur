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
    this.totalFrames = 0;
    this.totalFrameProcessingTime = 0;
    this.threadHits = 0;
    this.threadMisses = 0;
    this.frames = [];
  }

  async init () {
    this.imageCapture = new ImageCapture(this.videoStreamTrack);
    this.outputCanvas.width = this.width;
    this.outputCanvas.height = this.height;
    this.startDraw = performance.now();
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
    this.totalFrames++;
    this.totalFrameProcessingTime += data.frameTime;
  }

  toggle () {
    this.blur = !this.blur;

    // Track FPS--Accurate after toggling off/on once
    if (this.blur) {
      this.startDraw = performance.now();
    } else {
      this.logMetrics();
    }
  }

  async draw () {
    const bitmap = await this.imageCapture.grabFrame();
    if (this.blur) {
      const thread = this.threadPool.getAvailableThread();
      if (thread) {
        this.threadHits++;
        thread.isBusy = true;
        thread.worker.postMessage({ action: 'draw', payload: bitmap }, [ bitmap ]);
      } else {
        this.threadMisses++;
      }
    } else {
      this.outputCtx.drawImage(bitmap, 0, 0, this.width, this.height);
    }
    await this.draw();
  }

  logMetrics () {
    const elapsed = (performance.now() - this.startDraw) / 1000;
    console.log('Elapsed Time:', elapsed);
    console.log('Total Frames:', this.totalFrames);
    console.log('Average FPS:', this.totalFrames / elapsed);
    console.log('Thread Hits:', this.threadHits);
    console.log('Thread Misses:', this.threadMisses);
    console.log('Average Frame Processing Time:', this.totalFrameProcessingTime / this.totalFrames);
    this.totalFrames = 0;
    this.threadHits = 0;
    this.threadMisses = 0;
    this.totalFrameProcessingTime = 0;
  }
}