import api from "api";
import { getEnvVariables } from "./utils.ts";

const env = getEnvVariables();
const sdk = api("@scenario-api/v1.0#g3z32ym1hiu2im");

const modelId = env.SCENARIO_MODEL_ID;
const authToken = Buffer.from(
  `${env.SCENARIO_API_KEY}:${env.SCENARIO_API_SECRET}`
).toString("base64");

sdk.auth(`Basic ${authToken}`);

export interface AssetResponse {
  asset: {
    url: string;
  };
}

interface InferenceResponse {
  data: {
    job: {
      jobId: string;
    };
  };
}

interface JobDetailsResponse {
  data: {
    job: {
      metadata: {
        assetIds: string[];
      };
      status: string;
    };
  };
}

export async function getAssetsById(assetId: string): Promise<AssetResponse> {
  try {
    const response = await sdk.getAssetsByAssetId({ assetId: assetId });
    const data: AssetResponse = response.data;
    console.log(data);
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function generateImageFromText(prompt: string): Promise<string[]> {
  const MAX_RETRIES = 5;
  let retryCount = 0;
  try {
    while (true) {
      const response: InferenceResponse = await sdk.postTxt2imgInferences({
        modelId: modelId,
        prompt: prompt,
        numInferenceSteps: 28,
        numSamples: 1,
        guidance: 7.5,
        width: 1024,
        height: 1024,
        negativePrompt: "ugly, bad, low quality, blurry",
      });

      const jobId = response.data.job.jobId;

      // Function to poll the inference status
      const pollJobStatus = async (jobId: string): Promise<string[]> => {
        let status: string = "in-progress";
        let images: string[] = [];

        while (status === "in-progress" || status === "warming-up") {
          try {
            // Fetch the job details
            const jobDetails: JobDetailsResponse = await sdk.getJobId({
              jobId,
            });
            images = jobDetails.data.job.metadata?.assetIds || [];
            status = jobDetails.data.job.status;

            console.log(`Job status: ${status}`);

            if (status === "in-progress") {
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          } catch (err) {
            console.error("Error fetching job details:", err);
            status = "failed"
          }
        }

        if (status === "success") {
          const assetUrls: string[] = [];
          for (const assetId of images) {
            const asset: AssetResponse = await getAssetsById(assetId);
            assetUrls.push(asset.asset.url);
          }
          return assetUrls;
        } else {
          console.error("Inference failed!");
          retryCount++;
          console.error(`Error generating image. Attempt ${retryCount} of ${MAX_RETRIES}`);
          if (retryCount >= MAX_RETRIES) {
            throw new Error("Max retries reached. Failed to generate image.");
          }
        }
      };

      return await pollJobStatus(jobId);
    }
  } catch (err) {
    console.error("Error generating image:", err);
  }
}
