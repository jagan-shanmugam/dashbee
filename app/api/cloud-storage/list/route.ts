import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
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

interface CloudFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
}

export async function POST(req: Request) {
  try {
    const { provider, config, bucket, prefix = "" } = await req.json() as {
      provider: "s3" | "gcs";
      config: S3Config | GCSConfig;
      bucket: string;
      prefix?: string;
    };

    if (!bucket) {
      return Response.json(
        { error: "Bucket is required" },
        { status: 400 }
      );
    }

    const files: CloudFile[] = [];

    if (provider === "s3") {
      const s3Config = config as S3Config;

      const client = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      });

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: "/", // Use delimiter to get "folder" structure
      });

      const response = await client.send(command);

      // Add "folders" (common prefixes)
      if (response.CommonPrefixes) {
        for (const cp of response.CommonPrefixes) {
          if (cp.Prefix) {
            const folderName = cp.Prefix.slice(prefix.length).replace(/\/$/, "");
            files.push({
              key: cp.Prefix,
              name: folderName,
              size: 0,
              lastModified: new Date().toISOString(),
              isFolder: true,
            });
          }
        }
      }

      // Add files
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Key !== prefix) {
            const fileName = obj.Key.slice(prefix.length);
            // Skip if this is the "folder" marker itself
            if (fileName && !fileName.endsWith("/")) {
              files.push({
                key: obj.Key,
                name: fileName,
                size: obj.Size || 0,
                lastModified: obj.LastModified?.toISOString() || new Date().toISOString(),
                isFolder: false,
              });
            }
          }
        }
      }

      return Response.json({ files });
    }

    if (provider === "gcs") {
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

      const [gcsFiles, , apiResponse] = await storage.bucket(bucket).getFiles({
        prefix,
        delimiter: "/",
        autoPaginate: false,
      });

      // Add "folders" from prefixes
      const prefixes = (apiResponse as { prefixes?: string[] })?.prefixes || [];
      for (const p of prefixes) {
        const folderName = p.slice(prefix.length).replace(/\/$/, "");
        files.push({
          key: p,
          name: folderName,
          size: 0,
          lastModified: new Date().toISOString(),
          isFolder: true,
        });
      }

      // Add files
      for (const file of gcsFiles) {
        const fileName = file.name.slice(prefix.length);
        if (fileName && !fileName.endsWith("/")) {
          files.push({
            key: file.name,
            name: fileName,
            size: parseInt(file.metadata.size as string) || 0,
            lastModified: file.metadata.updated || new Date().toISOString(),
            isFolder: false,
          });
        }
      }

      return Response.json({ files });
    }

    return Response.json(
      { error: "Invalid provider" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Cloud storage list error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    );
  }
}
