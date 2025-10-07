export class TaskQueue<T, R> {
  private concurrency: number;
  private running = 0;
  private q: Array<{item: T; resolve: (r: R) => void; reject: (e: any) => void}> = [];
  private worker: (item: T) => Promise<R>;

  constructor(worker: (item: T) => Promise<R>, concurrency = 1){
    this.worker = worker;
    this.concurrency = Math.max(1, concurrency);
  }
  setConcurrency(n: number){ this.concurrency = Math.max(1, n); this.pump(); }

  push(item: T){
    return new Promise<R>((resolve, reject) => {
      this.q.push({ item, resolve, reject });
      this.pump();
    });
  }

  private pump(){
    while(this.running < this.concurrency && this.q.length){
      const job = this.q.shift()!;
      this.running++;
      this.worker(job.item)
        .then(r => job.resolve(r))
        .catch(e => job.reject(e))
        .finally(()=>{ this.running--; this.pump(); });
    }
  }
}
