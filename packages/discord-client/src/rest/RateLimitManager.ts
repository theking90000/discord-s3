import RestManager, {RequestOpts} from "./RestManager";
import RestError from "./RestError";


interface RequestCache {
    [endpoint: string]: {
        rateLimitActive?: boolean;
        pendingStack: (() => any)[];
        waitList: (() => any)[];
        running: number;
    }
}

const MAX_SIMULTANEOUS_REQUESTS = 3


export default class RateLimitManager {

    private restManager: RestManager;
    private cache: RequestCache = {};

    constructor(restManager: RestManager) {
        this.restManager = restManager;
    }

    public withRetry<Response = {}>(opts: RequestOpts, maxRetries = 3): Promise<Response> {
        return new Promise(async (resolve, reject) => {
            let retry = 0, error;
            while (retry < maxRetries) {
                try {
                    const data = await this.restManager.makeRequest<Response>(opts)
                    return resolve(data);
                } catch (e) {
                    console.error(e)
                    if (e instanceof RestError) {
                        if (e.status !== 429) {
                            throw e;
                        }
                    }
                    error = e;
                }
                retry++;
            }
            reject(error)
        })
    }

    private execWaitList(endpoint: string) {
        if (this.cache[endpoint].running < MAX_SIMULTANEOUS_REQUESTS) {
            this.cache[endpoint].waitList.shift()?.call(null).then(() => {
                this.cache[endpoint].running--;
                this.execWaitList(endpoint)
            })
            this.cache[endpoint].running++;
        }
    }

    public waitForRateLimit(endpoint: string): Promise<() => void> {
        return new Promise(async (resolve) => {
            if (!this.cache[endpoint]) {
                this.cache[endpoint] = {
                    pendingStack: [],
                    waitList: [],
                    running: 0
                }
            }
            if (this.cache[endpoint].rateLimitActive) {
                this.cache[endpoint].pendingStack.push(() => {
                    this.cache[endpoint].waitList.push(() => new Promise(r => resolve(() => r(null))))
                    this.execWaitList(endpoint)
                })
            } else {
                this.cache[endpoint].waitList.push(() => new Promise(r => resolve(() => r(null))))
                this.execWaitList(endpoint)
            }
        })
    }

    public enableRateLimit(endpoint: string, retryNextIn: number) {
        if (this.cache[endpoint].rateLimitActive) return;
        this.cache[endpoint].rateLimitActive = true;
        setTimeout(() => {
            this.cache[endpoint].pendingStack.forEach((e) => e.call(null))
            this.cache[endpoint].pendingStack = [];
        }, (retryNextIn + 2) * 1000);
    }


}