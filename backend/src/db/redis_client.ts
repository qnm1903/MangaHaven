import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

class RedisClient {
    private static instance: RedisClient | null = null;
    public client: RedisClientType;
    private isConnected: boolean = false;

    constructor() {
        this.client = createClient({
            url: `rediss://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        });

        this.client.on("error", (err: Error) => {
            if (this.isConnected) {
                console.error("Redis error:", err.message);
            }
            // Don't crash the app on Redis errors
        });

        this.client.on("connect", () => {
            this.isConnected = true;
            console.log("Connected to Redis (Upstash)");
        });

        this.client.on("end", () => {
            this.isConnected = false;
        });

        // Connect asynchronously - don't block app startup
        this.connect();
    }

    private async connect() {
        try {
            await this.client.connect();
            // Configure notify-keyspace-events
            await this.client.configSet("notify-keyspace-events", "KEA");
            console.log("Redis keyspace events enabled: KEA");
        } catch (err) {
            console.warn("Redis connection failed (app will continue without Redis caching):", (err as Error).message);
            this.isConnected = false;
        }
    }

    static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    getClient(): RedisClientType {
        return this.client;
    }

    isReady(): boolean {
        return this.isConnected;
    }
}

const redisClient = RedisClient.getInstance();
export default redisClient;