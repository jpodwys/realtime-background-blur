class Metrics {
  constructor (metricsOutputElement) {
    this.metricsOutputElement = metricsOutputElement;
    this.on = false;
    this.interval;
  }

  start () {
    this.on = true;
    this.reset();

    this.printInterval = setInterval(() => {
      const fps = this.getFps();
      console.log(fps);
      this.print(fps);
    }, 100);

    this.resetInterval = setInterval(() => this.reset(), 5000);
  }

  stop () {
    this.on = false;
    const elapsed = (performance.now() - this.startedAt) / 1000;
    clearInterval(this.printInterval);
    clearInterval(this.resetInterval);
    this.print('');
    console.log('Elapsed Time:', elapsed);
    console.log('Total Frames:', this.totalFrames);
    console.log('Average FPS:', this.totalFrames / elapsed);
    console.log('Thread Hits:', this.threadHits);
    console.log('Thread Misses:', this.threadMisses);
    console.log('Average Frame Processing Time:', this.totalFrameProcessingTime / this.totalFrames);
  }

  reset () {
    this.startedAt = performance.now();
    this.totalFrames = 0;
    this.threadHits = 0;
    this.threadMisses = 0;
    this.totalFrameProcessingTime = 0;
  }

  trackFrame (frameTime) {
    if (!this.on) return;
    this.totalFrames++;
    this.totalFrameProcessingTime += frameTime;
  }

  trackHit () {
    if (!this.on) return;
    this.threadHits++;
  }

  trackMiss () {
    if (!this.on) return;
    this.threadMisses++
  }

  getFps () {
    const elapsed = (performance.now() - this.startedAt) / 1000;
    const fps = this.totalFrames / elapsed;
    return Math.trunc(fps * 100) / 100;
  }

  print (fps) {
    this.metricsOutputElement.innerText = `FPS: ${fps}`;
  }
}
