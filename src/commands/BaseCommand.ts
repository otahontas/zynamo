/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Copypasted & modified from: https://github.com/aws/aws-sdk-js-v3/blob/main/lib/lib-dynamodb/src/baseCommand/DynamoDBDocumentClientCommand.ts
import { Command as $Command } from "@aws-sdk/smithy-client";
import type {
  DeserializeHandler,
  DeserializeHandlerArguments,
  DeserializeHandlerOutput,
  HandlerExecutionContext,
  InitializeHandler,
  InitializeHandlerArguments,
  InitializeHandlerOutput,
  MiddlewareStack,
} from "@aws-sdk/types";

import { KeyNode, marshallInput, unmarshallOutput } from "./utils";
import type { DynamoDBDocumentClientResolvedConfig } from "../client";

/**
 * Base class for Commands in lib-dynamodb used to pass middleware to
 * the underlying DynamoDBClient Commands.
 */
export abstract class DynamoDBDocumentClientCommand<
  Input extends object,
  Output extends object,
  BaseInput extends object,
  BaseOutput extends object,
  ResolvedClientConfiguration
> extends $Command<
  Input | BaseInput,
  Output | BaseOutput,
  ResolvedClientConfiguration
> {
  protected abstract readonly inputKeyNodes: KeyNode[];

  protected abstract readonly outputKeyNodes: KeyNode[];

  protected abstract clientCommand: $Command<
    Input | BaseInput,
    Output | BaseOutput,
    ResolvedClientConfiguration
  >;

  public abstract override middlewareStack: MiddlewareStack<
    Input | BaseInput,
    Output | BaseOutput
  >;

  private static defaultLogFilterOverrides = {
    overrideInputFilterSensitiveLog(..._args: any[]) {},
    overrideOutputFilterSensitiveLog(..._args: any[]) {},
  };

  protected addMarshallingMiddleware(
    configuration: DynamoDBDocumentClientResolvedConfig
  ): void {
    const { marshallOptions, unmarshallOptions } =
      configuration.translateConfig || {};

    this.clientCommand.middlewareStack.addRelativeTo(
      (
          next: InitializeHandler<Input | BaseInput, Output | BaseOutput>,
          context: HandlerExecutionContext
        ) =>
        async (
          args: InitializeHandlerArguments<Input | BaseInput>
        ): Promise<InitializeHandlerOutput<Output | BaseOutput>> => {
          // eslint-disable-next-line no-param-reassign
          args.input = marshallInput(
            this.input,
            this.inputKeyNodes,
            marshallOptions
          );
          context.dynamoDbDocumentClientOptions =
            context.dynamoDbDocumentClientOptions ||
            DynamoDBDocumentClientCommand.defaultLogFilterOverrides;

          const { input } = args;
          context.dynamoDbDocumentClientOptions.overrideInputFilterSensitiveLog =
            () => {
              // eslint-disable-next-line dot-notation
              return context["inputFilterSensitiveLog"]?.(input);
            };
          return next(args);
        },
      {
        name: "DocumentMarshall",
        relation: "before",
        toMiddleware: "serializerMiddleware",
        override: true,
      }
    );
    this.clientCommand.middlewareStack.addRelativeTo(
      (
          next: DeserializeHandler<Input | BaseInput, Output | BaseOutput>,
          context: HandlerExecutionContext
        ) =>
        async (
          args: DeserializeHandlerArguments<Input | BaseInput>
        ): Promise<DeserializeHandlerOutput<Output | BaseOutput>> => {
          const deserialized = await next(args);

          /**
           * The original filter function is based on the shape of the
           * base DynamoDB type, whereas the returned output will be
           * unmarshalled. Therefore the filter log needs to be modified
           * to act on the original output structure.
           */
          const { output } = deserialized;
          context.dynamoDbDocumentClientOptions =
            context.dynamoDbDocumentClientOptions ||
            DynamoDBDocumentClientCommand.defaultLogFilterOverrides;

          context.dynamoDbDocumentClientOptions.overrideOutputFilterSensitiveLog =
            () => {
              // eslint-disable-next-line dot-notation
              return context["outputFilterSensitiveLog"]?.(output);
            };

          deserialized.output = unmarshallOutput(
            deserialized.output,
            this.outputKeyNodes,
            unmarshallOptions
          );
          return deserialized;
        },
      {
        name: "DocumentUnmarshall",
        relation: "before",
        toMiddleware: "deserializerMiddleware",
        override: true,
      }
    );
  }
}
