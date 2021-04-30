class Thread {
  constructor (workerId, worker) {
    this.workerId = workerId;
    this.worker = worker;
    this.isBusy = false;
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

  getThreadByWorkerId (workerId) {
    return this.threads.find((thread) => thread.workerId === workerId);
  }
}
