import { Scraper } from "agent-twitter-client";

import { Character } from "./character.ts";
import * as fs from "fs";
import * as path from "path";
import { getDirName } from "./utils.ts";
import { startCountdown, getEnvVariables } from "./utils.ts";
import { postNewTweet } from "./twitter.ts";


const __dirname = getDirName()

const filePath = path.resolve(__dirname, "../character/character.json");
const rawData = fs.readFileSync(filePath, "utf8");
const character: Character = JSON.parse(rawData);

async function main() {
  const env = getEnvVariables()
  const scraper = new Scraper();
  try {
    await scraper.login(
      env.TWITTER_USERNAME,
      env.TWITTER_PASSWORD
    );

    const tweetEveryXHours: number = Number(env.TWEET_INTERVAL);
    const intervalMs = tweetEveryXHours * 60 * 60 * 1000;

    const me = await scraper.me();
    const latestTweet = await scraper.getLatestTweet(me.username);
    if (latestTweet) {
      const currentTime = Math.floor(Date.now() / 1000);
      const twoHoursInSeconds = intervalMs / 1000;
      if (currentTime - latestTweet.timestamp > twoHoursInSeconds) {
        await postNewTweet(scraper, character);
      }
    }

    setInterval(async () => {
      await postNewTweet(scraper, character);
      startCountdown(intervalMs);
    }, intervalMs);
    startCountdown(intervalMs);
  } catch (error) {
    console.error("Error initializing scraper:", error);
  }
}

main();
