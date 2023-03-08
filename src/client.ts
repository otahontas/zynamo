import type {
  DynamoDBClient,
  DynamoDBClientResolvedConfig,
  ServiceInputTypes as __ServiceInputTypes,
  ServiceOutputTypes as __ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import { Client as __Client } from "@aws-sdk/smithy-client";
import type { HttpHandlerOptions as __HttpHandlerOptions } from "@aws-sdk/types";
import type {
  marshallOptions,
  unmarshallOptions,
} from "@aws-sdk/util-dynamodb";
import type { z } from "zod";

import type { GetCommandInput, GetCommandOutput } from "./commands/GetCommand";

export type ServiceInputTypes = __ServiceInputTypes | GetCommandInput;

export type ServiceOutputTypes<Schema extends z.AnyZodObject> =
  | __ServiceOutputTypes
  | GetCommandOutput<Schema>;

export type TranslateConfig = {
  marshallOptions?: marshallOptions;
  unmarshallOptions?: unmarshallOptions;
};

export type DynamoDBDocumentClientResolvedConfig =
  DynamoDBClientResolvedConfig & {
    translateConfig?: TranslateConfig;
  };

export class DynamoDBDocumentClient<
  Schema extends z.AnyZodObject
> extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes<Schema>,
  DynamoDBDocumentClientResolvedConfig
> {
  override readonly config: DynamoDBDocumentClientResolvedConfig;

  protected constructor(
    client: DynamoDBClient,
    translateConfig?: TranslateConfig
  ) {
    super(client.config);
    this.config = client.config;
    if (translateConfig) {
      this.config.translateConfig = translateConfig;
    }
    this.middlewareStack = client.middlewareStack;
  }

  static from<Schema extends z.AnyZodObject>(
    client: DynamoDBClient,
    translateConfig?: TranslateConfig
  ) {
    return new DynamoDBDocumentClient<Schema>(client, translateConfig);
  }

  override destroy(): void {
    // A no-op, since client is passed in constructor
  }
}
