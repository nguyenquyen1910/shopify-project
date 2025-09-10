import shopify from "../shopify.js";

export const createGraphqlClient = ({ shop, accessToken }) =>
  new shopify.api.clients.Graphql({ session: { shop, accessToken } });

export const getProductImages = async (client, { first = 50, after }) => {
  const query = `
    query Images($first:Int!, $after:String) {
      files(first: $first, after: $after) {
        edges {
          cursor
          node {
            __typename
            ... on MediaImage {
              id
              image {
                url
                width
                height
                altText
              }
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;
  const res = await client.query({
    data: { query, variables: { first, after } },
  });
  return res?.body?.data?.files;
};

const parseDataUrl = (dataUrl) => {
  const [meta, base64Data] = dataUrl.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta || "");
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const buffer = Buffer.from(base64Data, "base64");
  return { mimeType, buffer };
};

export const uploadOptimizedImage = async (
  client,
  { name, contentType, dataUrl }
) => {
  // Parse dataUrl -> Buffer
  const { buffer, mimeType } = parseDataUrl(dataUrl);
  const finalMime = contentType || mimeType;

  // Staged upload target(S3 tam)
  const STAGED_UPLOADS_CREATE = `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `;
  const stagedRes = await client.query({
    data: {
      query: STAGED_UPLOADS_CREATE,
      variables: {
        input: [
          {
            resource: "FILE",
            filename: name,
            mimeType: finalMime,
            httpMethod: "POST",
          },
        ],
      },
    },
  });

  const target = stagedRes?.body?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  const errors = stagedRes?.body?.data?.stagedUploadsCreate?.userErrors;
  if (!target || errors?.length) {
    const msg =
      errors.map((e) => e.message).join("; ") || "Failed to stage upload";
    throw new Error(msg);
  }

  // Post file to S3
  const form = new FormData();
  target.parameters.forEach((p) => form.append(p.name, p.value));
  form.append("file", new Blob([buffer], { type: finalMime }), name);

  const uploadResp = await fetch(target.url, {
    method: "POST",
    body: form,
  });

  if (!uploadResp.ok) {
    const text = await uploadResp.text().catch(() => "");
    throw new Error(`Failed to upload file: ${text}`);
  }

  // fileCreate create file in Shopify Files
  const FILE_CREATE = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          __typename
          ... on MediaImage {
            id
            image { url width height }
            alt
          }
          ... on GenericFile {
            id
            url
            alt
          }
        }
        userErrors { field message }
      }
    }
  `;

  const fileRes = await client.query({
    data: {
      query: FILE_CREATE,
      variables: {
        files: [
          {
            originalSource: target.resourceUrl,
            contentType: "IMAGE",
            alt: name,
          },
        ],
      },
    },
  });
  const fErrors = fileRes?.body?.data?.fileCreate?.userErrors || [];
  const f = fileRes?.body?.data?.fileCreate?.files?.[0];
  if (!f || fErrors.length) {
    const msg = fErrors.map((e) => e.message).join("; ") || "fileCreate failed";
    throw new Error(msg);
  }
  const url = f?.image?.url || f?.url;
  if (!url) {
    throw new Error("fileCreate returned no image url");
  }
  return { id: f.id, url };
};

export const setOptimizedMapMetafield = async (
  client,
  { namespace, key, valueJson }
) => {
  // Get shopID
  const SHOP_ID = `
    query {
      shop { id }
    }
  `;
  const sRes = await client.query({ data: { query: SHOP_ID } });
  const shopId = sRes?.body?.data?.shop?.id;
  if (!shopId) throw new Error("Failed to resolve shop id");

  // Upsert metafield
  const META_SET = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace type }
        userErrors { field message }
      }
    }
  `;
  const mRes = await client.query({
    data: {
      query: META_SET,
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace,
            key,
            type: "json",
            value: valueJson,
          },
        ],
      },
    },
  });
  const mErrors = mRes?.body?.data?.metafieldsSet?.userErrors || [];
  if (mErrors.length) {
    const msg = mErrors.map((e) => e.message).join("; ");
    throw new Error(`metafieldsSet error: ${msg}`);
  }

  const mf = mRes?.body?.data?.metafieldsSet?.metafields?.[0];
  return { id: mf?.id };
};
