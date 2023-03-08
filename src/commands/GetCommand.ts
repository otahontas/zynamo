import {
  GetItemCommand as __GetItemCommand,
  GetItemCommandInput as __GetItemCommandInput,
  GetItemCommandOutput as __GetItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import type {
  Handler,
  HttpHandlerOptions as __HttpHandlerOptions,
  MiddlewareStack,
} from "@aws-sdk/types";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

import type { z } from "zod";
import { DynamoDBDocumentClientCommand } from "./BaseCommand";
import type {
  DynamoDBDocumentClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../client";

export type GetCommandInput = Omit<__GetItemCommandInput, "Key"> & {
  Key: Record<string, NativeAttributeValue> | undefined;
};

export type GetCommandOutput<Schema extends z.AnyZodObject> = Omit<
  __GetItemCommandOutput,
  "Item"
> & {
  Item?: Schema;
};

export class GetCommand<
  Schema extends z.AnyZodObject
> extends DynamoDBDocumentClientCommand<
  GetCommandInput,
  GetCommandOutput<Schema>,
  __GetItemCommandInput,
  __GetItemCommandOutput,
  DynamoDBDocumentClientResolvedConfig
> {
  protected readonly inputKeyNodes = [{ key: "Key" }];

  protected readonly outputKeyNodes = [{ key: "Item" }];

  protected readonly clientCommand: __GetItemCommand;

  public readonly middlewareStack: MiddlewareStack<
    GetCommandInput | __GetItemCommandInput,
    GetCommandOutput<Schema> | __GetItemCommandOutput
  >;

  constructor(readonly input: GetCommandInput) {
    super();
    this.clientCommand = new __GetItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }

  /**
   * @internal
   */
  resolveMiddleware(
    clientStack: MiddlewareStack<ServiceInputTypes, ServiceOutputTypes<Schema>>,
    configuration: DynamoDBDocumentClientResolvedConfig,
    options?: __HttpHandlerOptions
  ): Handler<GetCommandInput, GetCommandOutput<Schema>> {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(
      this.middlewareStack as typeof clientStack
    );
    const handler = this.clientCommand.resolveMiddleware(
      stack,
      configuration,
      options
    );

    return async () => handler(this.clientCommand);
  }
}
