import {
  CreateTableCommand,
  CreateTableCommandOutput,
  DeleteTableCommand,
  DeleteTableCommandOutput,
  DynamoDBClient,
  DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
  PutCommandOutput,
  type TranslateConfig,
} from "@aws-sdk/lib-dynamodb";
import type { HttpHandlerOptions } from "@aws-sdk/types";
import type { z } from "zod";
import type { Spread } from "type-fest";

// TS doesn't allow classes to override static methods of base classes: hence
// omitting "from" method her
// https://github.com/microsoft/TypeScript/issues/4628#issuecomment-1147905253
type DynamoDBDocumentClientConstructorParameters = [
  client: DynamoDBClient,
  translateConfig?: TranslateConfig
];
// @ts-expect-error DynamoDBDocumentClient constructor is protected, but needs to used
// here to omit "from"
const DynamoDBDocumentClientWithoutFrom: (new (
  ...arguments_: DynamoDBDocumentClientConstructorParameters
) => DynamoDBDocumentClient) &
  Omit<typeof DynamoDBDocumentClient, "from"> = DynamoDBDocumentClient;

// TODO: Figure out a way to overload only the modified stuff, no other fields

type ZynamoCommand =
  | GetCommand
  | PutCommand
  | CreateTableCommand
  | DeleteTableCommand;
type ZynamoOutputs =
  | GetCommandOutput
  | PutCommandOutput
  | CreateTableCommandOutput
  | DeleteTableCommandOutput;

// TODO: what
// type ValidPutCommandInput<Schema extends z.AnyZodObject> = Spread<
//   Omit<PutCommandInput, "Item">,
//   { Item: z.input<Schema> }
// >;

// const ValidPutCommand: (new (
//   ...args: ConstructorParameters<typeof PutCommand>
// ) => PutCommand) &
//   Omit<typeof PutCommand, "input"> & { input: ValidPutCommandInput } =
//   PutCommand;

export class ZynamoClient<
  Schema extends z.AnyZodObject
> extends DynamoDBDocumentClientWithoutFrom {
  schema: Schema;

  protected constructor(
    schema: Schema,
    ...superParameters: DynamoDBDocumentClientConstructorParameters
  ) {
    super(...superParameters);
    this.schema = schema;
  }

  // === Implementations for overridden functionalities
  async handleGetCommand(command: GetCommand) {
    const result = await super.send(command);
    if (result.Item) {
      return {
        ...result,
        // This gets inferred correctly
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        Item: this.schema.parse(result.Item),
      };
    }
    return result;
  }

  async handlePutCOmmand(command: PutCommand) {
    this.schema.parse(command.input.Item);
    return super.send(command);
  }

  // === Overloads for overridden functionalities
  override send(
    command: GetCommand
  ): Promise<
    Spread<Omit<GetCommandOutput, "Item">, { Item?: z.output<Schema> }>
  >;

  override send(command: PutCommand): Promise<PutCommandOutput>;

  // === Not overridden but I want to keep these usable
  override send(command: CreateTableCommand): Promise<CreateTableCommandOutput>;

  override send(command: DeleteTableCommand): Promise<DeleteTableCommandOutput>;

  override send(
    command: ZynamoCommand,
    options?: HttpHandlerOptions
  ): Promise<ZynamoOutputs> {
    if (command instanceof GetCommand) {
      return this.handleGetCommand(command);
    }
    if (command instanceof PutCommand) {
      return this.handlePutCOmmand(command);
    }
    // TODO: FIX
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
    return super.send(command as any, options) as any;
  }

  // Create dynamoDBClient and pass it to ZynamoClient like with documentClient
  static from<Schema extends z.AnyZodObject>(
    schema: Schema,
    config: DynamoDBClientConfig,
    translateConfig?: TranslateConfig
  ) {
    const dynamoDBClient = new DynamoDBClient(config);
    return new ZynamoClient<Schema>(schema, dynamoDBClient, translateConfig);
  }
}
