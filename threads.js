class Thread {
  constructor (worker) {
    this.worker = worker;
    this.isBusy = false;
  }

  postMessage (payload) {
    this.isBusy = true;
    return new Promise((resolve) => {
      this.worker.onmessage = (event) => {
        this.isBusy = false;
        resolve(event);
      }
      this.worker.postMessage(payload);
    });
  }
}

class ThreadPool {
  constructor () {
    this.threads = [];
    this.threadIndex = 0;
  }

  addThread (thread) {
    this.threads.push(thread);
  }

  getAvailableThread () {
    return this.threads.find((thread) => thread.isBusy === false);
  }
}
