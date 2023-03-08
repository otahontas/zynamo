import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
  CreateTableCommand,
  CreateTableCommandInput,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import { z } from "zod";
import type { DynamoDBDocumentClient } from "../src/client";
import { createClient } from "../src";
import { createCommandFactory } from "../src/commands/commandFactory";

const dynamodbPort = 8000;
const tableName = "test-table";
const testSchema = z.object({
  foo: z.string(),
  bar: z.number(),
  cat: z.boolean(),
  dog: z.string().optional(),
  fish: z.string().nullable(),
  fishes: z.array(z.string()),
});

const commandFactory = createCommandFactory(testSchema);

describe("zynamo", () => {
  let container: StartedTestContainer;
  let containerUrl: string;
  let client: DynamoDBDocumentClient<typeof testSchema>;

  beforeAll(async () => {
    console.log("Setting up dynamodb container");
    container = await new GenericContainer("amazon/dynamodb-local")
      .withExposedPorts(dynamodbPort)
      .start();
    const logs = await container.logs();
    logs.on("err", (line) => console.error("[Container error]:", line));
    containerUrl = `http://${container.getHost()}:${container.getMappedPort(
      dynamodbPort
    )}`;
    console.log(
      `Dynamodb container with id ${container.getId()} and name ${container.getName()} running on ${containerUrl}}`
    );

    console.log("Setting up dymamodb client with schema");
    const config: DynamoDBClientConfig = {
      endpoint: containerUrl,
      region: "us-east-1",
      credentials: {
        accessKeyId: "xxxxx",
        secretAccessKey: "xxxxx",
      },
    };
    client = createClient(config, testSchema);
    console.log("Dynamodb client created");

    console.log("Setting up table");
    const params: CreateTableCommandInput = {
      AttributeDefinitions: [
        {
          AttributeName: "Stuff",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "Stuff",
          KeyType: "HASH",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      TableName: tableName,
    };
    const response = await client.send(new CreateTableCommand(params));
    expect(response.$metadata.httpStatusCode).toBe(200);
  });

  afterAll(async () => {
    await container.stop();
  });

  // it("puts data normally", async () => {
  //   const params: PutCommandInput = {
  //     TableName: tableName,
  //     Item: {
  //       Stuff: "ID_1",
  //       foo: "foo",
  //       bar: 1,
  //       cat: true,
  //       fish: null,
  //       fishes: ["a", "b", "c"],
  //     },
  //   };
  //   const data = await client.send(new PutCommand(params));
  //   console.log(data);
  //   expect(data).toBeDefined();
  // });

  it("gets data normally", async () => {
    const data = await client.send(
      commandFactory.createGetCommand({
        TableName: tableName,
        Key: {
          Stuff: "ID_1",
        },
      })
    );
    console.log(data);
    expect(data).toBeDefined();
  });
});
