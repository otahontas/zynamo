import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
  CreateTableCommand,
  DeleteTableCommand,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import { z } from "zod";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { generateMock } from "@anatine/zod-mock";
import { ZynamoClient } from "../src";

const dynamodbPort = 8000;

// TODO: logger

// TODO: handle that tests don't rely on each other

describe("zynamo", () => {
  let container: StartedTestContainer;
  let containerUrl: string;
  let config: DynamoDBClientConfig;

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

    config = {
      endpoint: containerUrl,
      region: "us-east-1",
      credentials: {
        accessKeyId: "xxxxx",
        secretAccessKey: "xxxxx",
      },
    };

    console.log(
      `Dynamodb container with id ${container.getId()} and name ${container.getName()} running on ${containerUrl}}`
    );
  });

  afterAll(async () => {
    await container.stop();
  });

  describe("with schema", () => {
    // TODO: better tests with some property based hassle
    const schema = z.object({
      foo: z.string(),
      bar: z.number(),
      foobar: z.boolean(),
      foobarbaz: z.string().optional(),
      foobarbazqux: z.string().nullable(),
      foobaaars: z.array(z.string()),
      fooBarMap: z.map(
        z.string(),
        z.object({ jou: z.number(), jii: z.string() })
      ),
    });
    let client: ZynamoClient<typeof schema>;

    it("client can be created", () => {
      client = ZynamoClient.from(schema, config);
      expect(client).toBeDefined();
      // TODO: test that client doesn't accept unsuitable schema
    });

    it("client can create a table", async () => {
      // TODO: test that client accepts only table names defined in schema (later when
      // schemas handle multiple tables & sort keys etc)
      const response = await client.send(
        new CreateTableCommand({
          AttributeDefinitions: [
            {
              AttributeName: "Swag",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "Swag",
              KeyType: "HASH",
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
          TableName: "LitSwagTable",
        })
      );
      expect(response.$metadata.httpStatusCode).toBe(200);
      await client.send(new DeleteTableCommand({ TableName: "LitSwagTable" }));
    });

    describe("putting data to table", async () => {
      const tableForPut = "FooTableToPut";
      beforeAll(async () => {
        await client.send(
          new CreateTableCommand({
            AttributeDefinitions: [
              {
                AttributeName: "foo",
                AttributeType: "S",
              },
            ],
            KeySchema: [
              {
                AttributeName: "foo",
                KeyType: "HASH",
              },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
            TableName: tableForPut,
          })
        );
      });
      it("succeeds with valid input", async () => {
        const input = generateMock(schema);
        const response = await client.send(
          new PutCommand({
            TableName: tableForPut,
            Item: input,
          })
        );
        expect(response.$metadata.httpStatusCode).toBe(200);
      });
      it("fails with not valid input", async () => {
        expect(
          client.send(
            new PutCommand({
              TableName: tableForPut,
              Item: {
                swag: "littinen",
              },
            })
          )
        ).rejects.toThrowErrorMatchingSnapshot();
      });
    });

    describe("getting data from table", async () => {
      const tableForGet = "FooTableForGet";
      const fooValue = "1";
      let input: z.infer<typeof schema>;
      beforeAll(async () => {
        await client.send(
          new CreateTableCommand({
            AttributeDefinitions: [
              {
                AttributeName: "foo",
                AttributeType: "S",
              },
            ],
            KeySchema: [
              {
                AttributeName: "foo",
                KeyType: "HASH",
              },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
            TableName: tableForGet,
          })
        );
        // add input
        input = generateMock(schema);
        input.foo = fooValue;
        await client.send(
          new PutCommand({
            TableName: tableForGet,
            Item: input,
          })
        );
      });
      it("returns valid stuff", async () => {
        // TODO: fix map - object conversion
        const response = await client.send(
          new GetCommand({
            TableName: tableForGet,
            // TODO: validate key
            Key: {
              foo: fooValue,
            },
          })
        );
        expect(response.$metadata.httpStatusCode).toBe(200);
        expect(response.Item).toMatchObject(input);
      });
      it("doesn't fail when item not in table", async () => {
        const response = await client.send(
          new GetCommand({
            TableName: tableForGet,
            // TODO: validate key
            Key: {
              foo: "nonValidValue",
            },
          })
        );
        expect(response.$metadata.httpStatusCode).toBe(200);
        expect(response.Item).toBeUndefined();
      });
      // TODO: test that we error for data integrity when data doesn't match schema
      // content
    });
  });
});
