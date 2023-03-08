import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import type { z } from "zod";
import { DynamoDBDocumentClient } from "./client";

export const createClient = <Schema extends z.AnyZodObject>(
  config: DynamoDBClientConfig,
  _schema: Schema
) => {
  const ddbClient = new DynamoDBClient(config);

  const marshallOptions = {
    convertEmptyValues: false, // false, by default.
    removeUndefinedValues: false, // false, by default.
    convertClassInstanceToMap: false, // false, by default.
  };

  const unmarshallOptions = {
    wrapNumbers: false, // false, by default.
  };

  const translateConfig = { marshallOptions, unmarshallOptions };

  return DynamoDBDocumentClient.from<Schema>(ddbClient, translateConfig);
};
