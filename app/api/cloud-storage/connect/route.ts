import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface GCSConfig {
  projectId: string;
  keyFile?: string; // JSON key file content (base64 encoded)
}

export async function POST(req: Request) {
  try {
    const { provider, config } = await req.json() as {
      provider: "s3" | "gcs";
      config: S3Config | GCSConfig;
    };

    if (provider === "s3") {
      const s3Config = config as S3Config;

      const client = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      });

      const command = new ListBucketsCommand({});
      const response = await client.send(command);

      return Response.json({
        success: true,
        buckets: response.Buckets?.map(b => ({
          name: b.Name,
          creationDate: b.CreationDate?.toISOString(),
        })) || [],
      });
    }

    if (provider === "gcs") {
      const gcsConfig = config as GCSConfig;

      let storage: Storage;

      if (gcsConfig.keyFile) {
        // Parse base64-encoded JSON key file
        const keyFileContent = Buffer.from(gcsConfig.keyFile, "base64").toString("utf-8");
        const credentials = JSON.parse(keyFileContent);
        storage = new Storage({
          projectId: gcsConfig.projectId,
          credentials,
        });
      } else {
        // Use default credentials (e.g., from environment)
        storage = new Storage({
          projectId: gcsConfig.projectId,
        });
      }

      const [buckets] = await storage.getBuckets();

      return Response.json({
        success: true,
        buckets: buckets.map(b => ({
          name: b.name,
          creationDate: b.metadata.timeCreated,
        })),
      });
    }

    return Response.json(
      { error: "Invalid provider" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Cloud storage connection error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 }
    );
  }
}
