import { Scraper } from "agent-twitter-client";
import axios from "axios";
import * as path from "path";
import * as fs from "fs";

import { generatePrompt, generateTweetFromPrompt } from "./ai.ts";
import { generateImageFromText } from "./scenario.ts";
import { Character } from "./character.ts";
import { getDirName } from "./utils.ts";



export async function sendTweet(scraper, tweet, imageUrls) {
  try {
    const downloadImage = async (url: string): Promise<string> => {
      const response = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
      });
      const __dirname = getDirName()
      const tempFilePath = path.join(__dirname, "temp-image.jpg");
      fs.writeFileSync(tempFilePath, response.data);
      return tempFilePath;
    };

    const tempFilePath = await downloadImage(imageUrls[0]);

    const mediaData = [
      {
        data: fs.readFileSync(tempFilePath),
        mediaType: "image/jpeg",
      },
    ];

    await scraper.sendTweet(tweet, undefined, mediaData);

    fs.unlinkSync(tempFilePath);
  } catch (error) {
    console.error("Error sending tweet:", error);
  }
}

export async function postNewTweet(scraper: Scraper, character: Character) {
  try {
    const prompt = await generatePrompt(
      character.systemPrompt,
      character.userPrompt
    );
    console.log("Generated prompt:", prompt);

    const assetUrls: String[] = await generateImageFromText(prompt);
    console.log("Generated asset URLs:", assetUrls);

    let tweet = await generateTweetFromPrompt(prompt, character.name);

    tweet = tweet + "\n $" + character.ticker;

    if (assetUrls && assetUrls.length > 0) {
      await sendTweet(scraper, tweet, assetUrls);
    } else {
      console.log("No images to tweet.");
    }
  } catch (error) {
    console.error("Error during tweet generation:", error);
  }
}
