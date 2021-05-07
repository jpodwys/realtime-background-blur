class Metrics {
  constructor () {
    this.init();
  }

  init () {
    this.startedAt;
    this.totalFrames = 0;
    this.totalFrameProcessingTime = 0;
    this.threadHits = 0;
    this.threadMisses = 0;
  }

  start () {
    this.startedAt = performance.now();
  }

  stop () {
    const elapsed = (performance.now() - this.startedAt) / 1000;
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

  trackFrame (frameTime) {
    this.totalFrames++;
    this.totalFrameProcessingTime += frameTime;
  }

  trackHit () {
    this.threadHits++;
  }

  trackMiss () {
    this.threadMisses++
  }
}
