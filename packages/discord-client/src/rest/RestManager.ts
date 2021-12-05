import fetch from "cross-fetch";
import RestError from "./RestError";
import RateLimitManager from "./RateLimitManager";

export interface RestManagerOpts {
    apiUrl?: string
    token?: string;
    userAgent?: string;
}

export interface RequestOpts {
    endpoint: string;
    method?: string;
    query?: {
        [key: string]: string | number | undefined
    },
    body?: any;
    headers?: {
        [k: string]: string;
    }
}

export default class RestManager {

    private readonly API_URL: string;
    private readonly TOKEN?: string;
    private readonly USER_AGENT?: string;
    private rateLimitManager: RateLimitManager;

    public constructor({apiUrl, token, userAgent}: RestManagerOpts) {
        this.API_URL = apiUrl ?? "https://discord.com/api/v9";
        this.TOKEN = token;
        this.USER_AGENT = userAgent ?? `discord-s3`
        this.rateLimitManager = new RateLimitManager(this);
    }

    public async makeRequest<Response = {}>({
                                                endpoint,
                                                method = "GET",
                                                query,
                                                body,
                                                headers
                                            }: RequestOpts): Promise<Response> {

        let fullEndpoint = endpoint;

        const callback = await this.rateLimitManager.waitForRateLimit(endpoint);

        for (const [key, value] of Object.entries(query || {})) {
            if (value === undefined) continue;
            fullEndpoint += (fullEndpoint.split('?').length === 1 ? '?' : '&') + `${key}=${encodeURIComponent(value)}`
        }

        if (!headers) {
            headers = {};
        }

        if (this.TOKEN) {
            headers['Authorization'] = this.TOKEN;
        }

        if (body && !headers['content-type']) {
            headers['content-type'] = "application/json";
        }

        try {
            const request = await fetch(this.API_URL + fullEndpoint, {
                method,
                body,
                headers,
            })
            callback()
            console.log("FETCHED " + this.API_URL + fullEndpoint + ` (${request.status})`)

            const data = await request.json() as Response & { code?: number, message?: string };

            if (request.status >= 400 && request.status < 500) {
                if (request.status === 429) {
                    this.rateLimitManager.enableRateLimit(endpoint, parseInt(request.headers.get('X-RateLimit-Reset-After') || `${(Date.now() / 1000) + 5}`))
                }
                throw new RestError(request.status, data?.message, data?.code);
            }

            return data;

        } catch (error) {
            throw error;
        }

    }

    public async get<Response = {}>(endpoint: string) {
        return this.rateLimitManager.withRetry<Response>({
            endpoint,
            method: "GET"
        })
    }

    public async post<Response = {}>(opts: Omit<RequestOpts, "method">) {
        return this.rateLimitManager.withRetry<Response>({
            ...opts,
            method: "POST"
        })
    }


}