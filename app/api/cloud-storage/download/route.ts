import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface GCSConfig {
  projectId: string;
  keyFile?: string;
}

export async function POST(req: Request) {
  try {
    const { provider, config, bucket, key } = await req.json() as {
      provider: "s3" | "gcs";
      config: S3Config | GCSConfig;
      bucket: string;
      key: string;
    };

    if (!bucket || !key) {
      return Response.json(
        { error: "Bucket and key are required" },
        { status: 400 }
      );
    }

    // Only allow downloading Parquet files
    if (!key.toLowerCase().endsWith(".parquet")) {
      return Response.json(
        { error: "Only Parquet files are supported" },
        { status: 400 }
      );
    }

    let fileBuffer: Buffer;
    let fileName: string;

    if (provider === "s3") {
      const s3Config = config as S3Config;

      const client = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      });

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);

      if (!response.Body) {
        throw new Error("Empty response body");
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      fileBuffer = Buffer.concat(chunks);
      fileName = key.split("/").pop() || key;
    } else if (provider === "gcs") {
      const gcsConfig = config as GCSConfig;

      let storage: Storage;

      if (gcsConfig.keyFile) {
        const keyFileContent = Buffer.from(gcsConfig.keyFile, "base64").toString("utf-8");
        const credentials = JSON.parse(keyFileContent);
        storage = new Storage({
          projectId: gcsConfig.projectId,
          credentials,
        });
      } else {
        storage = new Storage({
          projectId: gcsConfig.projectId,
        });
      }

      const [contents] = await storage.bucket(bucket).file(key).download();
      fileBuffer = contents;
      fileName = key.split("/").pop() || key;
    } else {
      return Response.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Return the file as base64 with metadata
    return Response.json({
      success: true,
      fileName,
      fileSize: fileBuffer.length,
      data: fileBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("Cloud storage download error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to download file" },
      { status: 500 }
    );
  }
}
