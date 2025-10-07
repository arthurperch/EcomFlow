export class TaskQueue {
    constructor(worker, concurrency = 1) {
        this.running = 0;
        this.q = [];
        this.worker = worker;
        this.concurrency = Math.max(1, concurrency);
    }
    setConcurrency(n) { this.concurrency = Math.max(1, n); this.pump(); }
    push(item) {
        return new Promise((resolve, reject) => {
            this.q.push({ item, resolve, reject });
            this.pump();
        });
    }
    pump() {
        while (this.running < this.concurrency && this.q.length) {
            const job = this.q.shift();
            this.running++;
            this.worker(job.item)
                .then(r => job.resolve(r))
                .catch(e => job.reject(e))
                .finally(() => { this.running--; this.pump(); });
        }
    }
}
