class Thread {
  constructor (workerId, worker) {
    this.workerId = workerId;
    this.worker = worker;
    this.isBusy = false;
  }
}

class ThreadPool {
  constructor (threads) {
    this.threads = threads;
  }

  getAvailableThread () {
    // const output = {};
    // this.threads.forEach((thread, i) => output[i] = thread.isBusy);
    // console.log(output);
    return this.threads.find((thread) => thread.isBusy === false);
  }

  getThreadByWorkerId (workerId) {
    return this.threads.find((thread) => thread.workerId === workerId);
  }
}

class Blur {
  constructor (videoStreamTrack, canvasOutputElement) {
    this.videoStreamTrack = videoStreamTrack;
    this.outputCanvas = canvasOutputElement;
    this.outputCtx = this.outputCanvas.getContext('2d');
    const { width, height } = this.videoStreamTrack.getSettings();
    this.width = width;
    this.height = height;
    this.blur = true;
    this.workers = [];
    this.workerCount = 10;
    this.workerIndex = 0;
    this.interval;
    this.frameTimes = [];
    this.totalFrames = 0;
  }

  async init () {
    this.imageCapture = new ImageCapture(this.videoStreamTrack);
    this.outputCanvas.width = this.width;
    this.outputCanvas.height = this.height;
    this.outputCanvas.width = this.width;
    this.outputCanvas.height = this.height;
    this.createWorkers();
    this.startDraw = performance.now();
    this.draw();
  }

  createWorkers () {
    const threads = [];
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker('./blur-worker.js');
      const workerId = Date.now();
      worker.addEventListener('message', this.onFrame.bind(this));
      worker.postMessage({ action: 'init', payload: { workerId, ...this.videoStreamTrack.getSettings() } });
      const thread = new Thread(workerId, worker);
      threads.push(thread);
    }
    this.threadPool = new ThreadPool(threads);
  }

  onFrame (event) {
    if (this.blur) {
      this.outputCtx.putImageData(event.data.frame, 0, 0);
    }
    const thread = this.threadPool.getThreadByWorkerId(event.data.workerId);
    thread.isBusy = false;
    this.totalFrames++;
  }

  toggle () {
    this.blur = !this.blur;

    if (this.blur) {
      this.startDraw = performance.now();
    } else {
      const elapsed = (performance.now() - this.startDraw) / 1000;
      console.log('Average FPS:', this.totalFrames / elapsed);
      this.totalFrames = 0;
    }
  }

  async draw () {
    const bitmap = await this.imageCapture.grabFrame();
    if (this.blur) {
      const thread = this.threadPool.getAvailableThread();
      if (thread) {
        thread.isBusy = true;
        thread.worker.postMessage({ action: 'draw', payload: bitmap }, [ bitmap ]);
      }
    } else {
      this.outputCtx.drawImage(bitmap, 0, 0, this.width, this.height);
    }
    await this.draw();
  }
}