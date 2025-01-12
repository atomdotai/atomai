import { getEnvVariables } from "./utils.ts";
import OpenAI from "openai";

const env = getEnvVariables()
const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});


export async function generatePrompt(systemPrompt, userPrompt) {
  const chatCompletion = await client.chat.completions.create({
    messages: [
        {
            role: "system", 
            content: systemPrompt
        },
        { 
            role: "user", 
            content: userPrompt
        }
    ],
    model: env.OPENAI_MODEL,
  });
  return chatCompletion.choices[0].message.content;
}


export async function generateTweetFromPrompt(prompt: string, name: string) {
    const chatCompletion = await client.chat.completions.create({
      messages: [
          {
              role: "system", 
              content: `You will be given a text to image prompt, your job is to use the information prompt to come up with with a very short engaging tweet, keep it a maximum of 100 characters, don't use emojis or hashtags, you're the subject of the image so always tweet from first person perspective and your name is ${name}`
          },
          { 
              role: "user", 
              content: prompt
          }
      ],
      model: env.OPENAI_MODEL,
    });
    return chatCompletion.choices[0].message.content;
  }
