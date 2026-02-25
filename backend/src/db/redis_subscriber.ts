import { createClient, type RedisClientType } from "redis";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

let subscriberInstance: RedisClientType | null = null;
let initializationAttempted = false;

async function initializeRedisSubscriber(): Promise<RedisClientType | null> {
    if (initializationAttempted) return subscriberInstance;
    initializationAttempted = true;

    try {
        const redisSubscriber = createClient({
            url: `rediss://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        });

        redisSubscriber.on("error", (error: Error) => {
            console.warn("Redis Subscriber error:", error.message);
        });

        redisSubscriber.on("connect", () => {
            console.log("Connected to Redis Subscriber (Upstash)");
        });

        await redisSubscriber.connect();
        console.log("Redis subscriber initialized successfully");
        return redisSubscriber as RedisClientType;
    } catch (error) {
        console.warn("Redis subscriber failed to initialize (app continues without it):", (error as Error).message);
        return null;
    }
}

export const getRedisSubscriber = async (): Promise<RedisClientType | null> => {
    if (!subscriberInstance && !initializationAttempted) {
        subscriberInstance = await initializeRedisSubscriber();
    }
    return subscriberInstance;
};

// Initialize in background
initializeRedisSubscriber().then((subscriber) => {
    subscriberInstance = subscriber;
}).catch(() => { });